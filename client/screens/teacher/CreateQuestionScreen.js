import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, typeScale, spacing, radius, screenPadding } from '../../theme';

const DIFFICULTIES = [1, 2, 3, 4, 5];

function newChoice() {
  return { content: '', isCorrect: false, blankIndex: 0 };
}

export default function CreateQuestionScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const { sectionId, question: existing } = useRoute().params;
  const isEditing = !!existing;

  const [type, setType] = useState(existing?.type ?? 'DYNAMIC');
  const [content, setContent] = useState(existing?.content ?? '');
  const [correctExplanation, setCorrectExplanation] = useState(existing?.correctExplanation ?? '');
  const [incorrectExplanation, setIncorrectExplanation] = useState(existing?.incorrectExplanation ?? '');
  const [difficulty, setDifficulty] = useState(existing?.difficulty ?? 1);
  const [choices, setChoices] = useState(
    existing?.choices?.map(c => ({ content: c.content, isCorrect: c.isCorrect, blankIndex: c.blankIndex }))
    ?? [newChoice(), newChoice(), newChoice(), newChoice()]
  );
  const [answerExpression, setAnswerExpression] = useState(existing?.answerExpression ?? '');
  const [distractorCount, setDistractorCount] = useState(
    existing?.distractorCount != null ? String(existing.distractorCount) : ''
  );
  const [saving, setSaving] = useState(false);

  function setChoiceContent(index, text) {
    setChoices(prev => prev.map((c, i) => i === index ? { ...c, content: text } : c));
  }

  function setCorrect(index) {
    setChoices(prev => prev.map((c, i) => ({ ...c, isCorrect: i === index })));
  }

  function addChoice() {
    if (choices.length >= 6) return;
    setChoices(prev => [...prev, newChoice()]);
  }

  function removeChoice(index) {
    if (choices.length <= 2) return;
    setChoices(prev => prev.filter((_, i) => i !== index));
  }

  function isValid() {
    if (!content.trim() || !correctExplanation.trim() || !incorrectExplanation.trim()) return false;
    if (type === 'DYNAMIC') {
      return !!answerExpression.trim();
    }
    const filled = choices.filter(c => c.content.trim());
    if (filled.length < 2) return false;
    return filled.some(c => c.isCorrect);
  }

  async function handleSave() {
    if (!isValid() || saving) return;
    setSaving(true);
    try {
      const base = {
        type,
        content: content.trim(),
        correctExplanation: correctExplanation.trim(),
        incorrectExplanation: incorrectExplanation.trim(),
        difficulty,
      };

      let payload;
      if (type === 'DYNAMIC') {
        const count = distractorCount.trim() ? parseInt(distractorCount.trim(), 10) : undefined;
        payload = { ...base, answerExpression: answerExpression.trim(), ...(count !== undefined && { distractorCount: count }) };
      } else {
        payload = {
          ...base,
          choices: choices
            .filter(c => c.content.trim())
            .map(c => ({ content: c.content.trim(), isCorrect: c.isCorrect, blankIndex: c.blankIndex })),
        };
      }

      if (isEditing) {
        const updated = await api.patch(`/sections/${sectionId}/questions/${existing.id}`, payload, token);
        navigation.navigate('QuestionDetail', { question: updated, sectionId });
      } else {
        await api.post(`/sections/${sectionId}/questions`, payload, token);
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not save question.');
    } finally {
      setSaving(false);
    }
  }

  const isDynamic = type === 'DYNAMIC';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <ScreenHeader title={isEditing ? 'Edit Question' : 'New Question'} />

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Type toggle */}
          <Text style={styles.label}>Type</Text>
          <View style={styles.typeRow}>
            {[
              { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
              { value: 'FILL_IN_BLANK',   label: 'Fill in Blank' },
              { value: 'DYNAMIC',         label: 'Dynamic' },
            ].map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                style={[styles.typeBtn, type === value && styles.typeBtnActive]}
                onPress={() => setType(value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeBtnText, type === value && styles.typeBtnTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          <Text style={styles.label}>Question</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder={
              isDynamic
                ? 'e.g. How many protons are in [el(1,18).name]?'
                : type === 'FILL_IN_BLANK'
                  ? 'e.g. The atomic number of Carbon is ___.'
                  : 'Enter question text'
            }
            placeholderTextColor={colors.neutral400}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={3}
          />

          {/* DYNAMIC fields */}
          {isDynamic && (
            <>
              {/* Syntax guide */}
              <View style={styles.syntaxCard}>
                <Text style={styles.syntaxTitle}>Template Syntax</Text>
                <Text style={styles.syntaxLine}><Text style={styles.syntaxCode}>[el(1,18).name]</Text>  element name (Z 1–18)</Text>
                <Text style={styles.syntaxLine}><Text style={styles.syntaxCode}>[el(1,118).symbol]</Text>  element symbol</Text>
                <Text style={styles.syntaxLine}><Text style={styles.syntaxCode}>[el(1,118).number]</Text>  atomic number</Text>
                <Text style={styles.syntaxLine}><Text style={styles.syntaxCode}>[el(1,118).mass]</Text>  atomic mass</Text>
                <Text style={styles.syntaxLine}><Text style={styles.syntaxCode}>[num(1,100)]</Text>  random integer</Text>
                <Text style={styles.syntaxLine}><Text style={styles.syntaxCode}>[compound(acids).formula]</Text>  compound</Text>
                <Text style={[styles.syntaxLine, { marginTop: spacing[2] }]}>
                  <Text style={styles.syntaxCode}>Categories:</Text>  acids · bases · salts · oxides
                </Text>
                <Text style={[styles.syntaxLine, { marginTop: spacing[2] }]}>
                  <Text style={styles.syntaxCode}>Cross-ref:</Text>  <Text style={styles.syntaxCode}>[1.symbol]</Text>  shows slot 1's symbol
                </Text>
                <Text style={styles.syntaxLine}><Text style={styles.syntaxCode}>[1.number + num(-2,2)]</Text>  computed display</Text>
                <Text style={[styles.syntaxLine, { marginTop: spacing[2] }]}>
                  <Text style={styles.syntaxCode}>Answer ref:</Text>  <Text style={styles.syntaxCode}>1.number</Text>, <Text style={styles.syntaxCode}>1.mass</Text>, <Text style={styles.syntaxCode}>1+2</Text>, <Text style={styles.syntaxCode}>2*1.number</Text>
                </Text>
              </View>

              <Text style={styles.label}>Answer Expression</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g.  1.number  or  1.mass  or  1 + 2"
                placeholderTextColor={colors.neutral400}
                value={answerExpression}
                onChangeText={setAnswerExpression}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.label}>
                Distractor Count <Text style={styles.hint}>(optional, default 3)</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.inputShort]}
                placeholder="3"
                placeholderTextColor={colors.neutral400}
                value={distractorCount}
                onChangeText={setDistractorCount}
                keyboardType="number-pad"
                maxLength={2}
              />
            </>
          )}

          {/* Choices (MC / FIB only) */}
          {!isDynamic && (
            <>
              <Text style={styles.label}>Answer Choices <Text style={styles.hint}>(tap circle to mark correct)</Text></Text>
              {choices.map((choice, i) => (
                <View key={i} style={styles.choiceRow}>
                  <TouchableOpacity style={[styles.radio, choice.isCorrect && styles.radioActive]} onPress={() => setCorrect(i)} activeOpacity={0.8}>
                    {choice.isCorrect && <View style={styles.radioDot} />}
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.input, styles.choiceInput]}
                    placeholder={`Choice ${i + 1}`}
                    placeholderTextColor={colors.neutral400}
                    value={choice.content}
                    onChangeText={text => setChoiceContent(i, text)}
                  />
                  {choices.length > 2 && (
                    <TouchableOpacity onPress={() => removeChoice(i)} style={styles.removeBtn} activeOpacity={0.7}>
                      <Text style={styles.removeText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {choices.length < 6 && (
                <TouchableOpacity onPress={addChoice} style={styles.addChoice} activeOpacity={0.7}>
                  <Text style={styles.addChoiceText}>+ Add choice</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Correct Explanation */}
          <Text style={styles.label}>Correct Answer Explanation</Text>
          <TextInput
            style={[styles.input, styles.inputMulti, styles.inputCorrect]}
            placeholder="Explain why the correct answer is right"
            placeholderTextColor={colors.neutral400}
            value={correctExplanation}
            onChangeText={setCorrectExplanation}
            multiline
            numberOfLines={3}
          />

          {/* Incorrect Explanation */}
          <Text style={styles.label}>Incorrect Answer Explanation</Text>
          <TextInput
            style={[styles.input, styles.inputMulti, styles.inputIncorrect]}
            placeholder="Explain what to review if the answer is wrong"
            placeholderTextColor={colors.neutral400}
            value={incorrectExplanation}
            onChangeText={setIncorrectExplanation}
            multiline
            numberOfLines={3}
          />

          {/* Difficulty */}
          <Text style={styles.label}>Difficulty</Text>
          <View style={styles.diffRow}>
            {DIFFICULTIES.map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.diffBtn, difficulty === d && styles.diffBtnActive]}
                onPress={() => setDifficulty(d)}
                activeOpacity={0.8}
              >
                <Text style={[styles.diffText, difficulty === d && styles.diffTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Save */}
          <View style={[styles.saveShadow, (!isValid() || saving) && styles.saveShadowDisabled]}>
            <TouchableOpacity
              style={[styles.saveBtn, (!isValid() || saving) && styles.saveBtnDisabled]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={!isValid() || saving}
            >
              <Text style={styles.saveText}>{saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Save Question'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  scroll: { paddingHorizontal: screenPadding.horizontal, paddingBottom: 48 },

  label: { ...typeScale.label, color: colors.purple800, marginBottom: spacing[2], marginTop: spacing[4] },
  hint: { ...typeScale.caption, color: colors.neutral600 },

  typeRow: { flexDirection: 'row', gap: spacing[2] },
  typeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.purple200, alignItems: 'center',
  },
  typeBtnActive: { backgroundColor: colors.purple400, borderColor: colors.purple400 },
  typeBtnText: { ...typeScale.label, color: colors.purple600, textAlign: 'center' },
  typeBtnTextActive: { color: colors.neutral900 },

  input: {
    ...typeScale.body, color: colors.purple900,
    borderWidth: 1.5, borderColor: colors.purple200, borderRadius: radius.md,
    paddingHorizontal: spacing[4], paddingVertical: 12,
  },
  inputMulti: { height: 88, textAlignVertical: 'top', marginBottom: 0 },
  inputShort: { width: 100 },
  inputCorrect: { borderColor: colors.teal400 },
  inputIncorrect: { borderColor: colors.coral400 },

  syntaxCard: {
    backgroundColor: colors.purple50,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.purple200,
    padding: spacing[4],
    marginTop: spacing[3],
    gap: spacing[1],
  },
  syntaxTitle: { ...typeScale.label, color: colors.purple800, marginBottom: spacing[2] },
  syntaxLine: { ...typeScale.caption, color: colors.neutral700, lineHeight: 18 },
  syntaxCode: { ...typeScale.caption, color: colors.purple600, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },

  choiceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] },
  radio: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: colors.purple300 ?? colors.purple200,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: colors.purple400 },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.purple400 },
  choiceInput: { flex: 1 },
  removeBtn: { padding: 6 },
  removeText: { ...typeScale.label, color: colors.coral400 },

  addChoice: { paddingVertical: spacing[2] },
  addChoiceText: { ...typeScale.label, color: colors.purple400 },

  diffRow: { flexDirection: 'row', gap: spacing[2] },
  diffBtn: {
    width: 44, height: 44, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.purple200, alignItems: 'center', justifyContent: 'center',
  },
  diffBtnActive: { backgroundColor: colors.gold200, borderColor: colors.gold400 },
  diffText: { ...typeScale.label, color: colors.neutral600 },
  diffTextActive: { color: colors.gold800 },

  saveShadow: {
    marginTop: spacing[5],
    backgroundColor: colors.purple800, borderRadius: radius.full, transform: [{ translateY: 4 }],
  },
  saveShadowDisabled: { backgroundColor: colors.purple200 },
  saveBtn: {
    backgroundColor: colors.purple400, borderRadius: radius.full,
    paddingVertical: 16, alignItems: 'center', transform: [{ translateY: -4 }],
  },
  saveBtnDisabled: { backgroundColor: colors.purple100 },
  saveText: { ...typeScale.button, color: colors.neutral900 },
});
