import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, Pressable, Alert
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { ScreenSurface, ShadowButton, Chip } from '../../components/base';
import { colors, typeScale, screenPadding, radius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

const TYPES = ['MULTIPLE_CHOICE', 'FILL_IN_BLANK', 'DYNAMIC'];
const TYPE_LABELS = { MULTIPLE_CHOICE: 'Multiple choice', FILL_IN_BLANK: 'Fill-in-blank', DYNAMIC: 'Dynamic' };
const DIFFICULTIES = [1, 2, 3, 4, 5];

function McChoiceRow({ choice, index, onChange, onRemove, canRemove }) {
  return (
    <View style={styles.choiceRow}>
      <Pressable
        onPress={() => onChange({ ...choice, isCorrect: !choice.isCorrect })}
        style={[styles.correctDot, choice.isCorrect && styles.correctDotActive]}
      >
        {choice.isCorrect && <Ionicons name="checkmark" size={12} color="#FFF" />}
      </Pressable>
      <TextInput
        style={styles.choiceInput}
        value={choice.text}
        onChangeText={t => onChange({ ...choice, text: t })}
        placeholder={`Choice ${String.fromCharCode(65 + index)}`}
        placeholderTextColor={colors.neutral400}
      />
      {canRemove && (
        <Pressable onPress={onRemove} style={styles.removeBtn}>
          <Ionicons name="close" size={16} color={colors.coral600} />
        </Pressable>
      )}
    </View>
  );
}

export default function QuestionEditorScreen({ navigation, route }) {
  const { token } = useAuth();
  const { questionId, courseId } = route.params ?? {};
  const isEdit = !!questionId;

  const [type, setType] = useState('MULTIPLE_CHOICE');
  const [difficulty, setDifficulty] = useState(2);
  const [text, setText] = useState('');
  const [choices, setChoices] = useState([
    { text: '', isCorrect: false, blankIndex: 0 },
    { text: '', isCorrect: false, blankIndex: 0 },
    { text: '', isCorrect: false, blankIndex: 0 },
    { text: '', isCorrect: false, blankIndex: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!questionId) return;
    api.get(`/questions/${questionId}`, token)
      .then(q => {
        if (!q) return;
        setType(q.type ?? 'MULTIPLE_CHOICE');
        setDifficulty(q.difficulty ?? 2);
        setText(q.text ?? '');
        if (q.choices?.length) setChoices(q.choices);
      })
      .catch(() => {});
  }, [questionId, token]);

  const updateChoice = (i, val) => setChoices(prev => prev.map((c, idx) => idx === i ? val : c));
  const addChoice = () => setChoices(prev => [...prev, { text: '', isCorrect: false, blankIndex: 0 }]);
  const removeChoice = (i) => setChoices(prev => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!text.trim()) { Alert.alert('Missing', 'Question text is required.'); return; }
    if (type === 'MULTIPLE_CHOICE' && !choices.some(c => c.isCorrect)) {
      Alert.alert('Missing', 'Mark at least one correct answer.'); return;
    }
    setSaving(true);
    try {
      const body = { type, difficulty, text: text.trim(), choices };
      if (isEdit) {
        await api.patch(`/questions/${questionId}`, body, token);
      } else {
        await api.post(`/courses/${courseId}/questions`, body, token);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message ?? 'Could not save question.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenSurface>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.neutral900} />
        </Pressable>
        <Text style={styles.title}>{isEdit ? 'Edit question' : 'New question'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {/* Type selector */}
        <Text style={styles.fieldLabel}>Type</Text>
        <View style={styles.chipRow}>
          {TYPES.map(t => (
            <Chip
              key={t}
              label={TYPE_LABELS[t]}
              color={type === t ? 'purple' : 'neutral'}
              variant={type === t ? 'filled' : 'outline'}
              onPress={() => setType(t)}
            />
          ))}
        </View>

        {/* Difficulty */}
        <Text style={styles.fieldLabel}>Difficulty</Text>
        <View style={styles.chipRow}>
          {DIFFICULTIES.map(d => (
            <Chip
              key={d}
              label={String(d)}
              color={difficulty === d ? 'gold' : 'neutral'}
              variant={difficulty === d ? 'filled' : 'outline'}
              onPress={() => setDifficulty(d)}
            />
          ))}
        </View>

        {/* Question text */}
        <Text style={styles.fieldLabel}>Question</Text>
        <TextInput
          style={styles.textArea}
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={4}
          placeholder="Enter your question…"
          placeholderTextColor={colors.neutral400}
          textAlignVertical="top"
        />

        {/* MC Choices */}
        {type === 'MULTIPLE_CHOICE' && (
          <>
            <Text style={styles.fieldLabel}>Choices (tap circle to mark correct)</Text>
            {choices.map((c, i) => (
              <McChoiceRow
                key={i}
                choice={c}
                index={i}
                onChange={val => updateChoice(i, val)}
                onRemove={() => removeChoice(i)}
                canRemove={choices.length > 2}
              />
            ))}
            {choices.length < 6 && (
              <Pressable onPress={addChoice} style={styles.addChoiceBtn}>
                <Ionicons name="add-circle-outline" size={16} color={colors.purple600} />
                <Text style={styles.addChoiceText}>Add choice</Text>
              </Pressable>
            )}
          </>
        )}

        {type === 'FILL_IN_BLANK' && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Fill-in-blank answers are configured by blank index. Add choices and set the blankIndex for each.
            </Text>
          </View>
        )}

        {type === 'DYNAMIC' && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Dynamic questions are evaluated server-side. No choices needed — scoring uses a tolerance check.
            </Text>
          </View>
        )}

        <ShadowButton
          label={saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create question'}
          variant="primary"
          onPress={save}
          disabled={saving}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral200,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typeScale.h2,
    color: colors.neutral900,
  },
  form: {
    padding: screenPadding.horizontal,
    paddingBottom: 40,
    gap: 8,
  },
  fieldLabel: {
    ...typeScale.label,
    color: colors.neutral600,
    marginTop: 12,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    borderRadius: radius.md,
    padding: 12,
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: colors.neutral900,
    minHeight: 96,
    backgroundColor: '#FFF',
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  correctDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.neutral300,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  correctDotActive: {
    backgroundColor: colors.teal400,
    borderColor: colors.teal600,
  },
  choiceInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: colors.neutral900,
    backgroundColor: '#FFF',
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.coral50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  addChoiceText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: colors.purple600,
  },
  infoBox: {
    backgroundColor: colors.blue50,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.blue400,
  },
  infoText: {
    ...typeScale.small,
    color: colors.blue600,
  },
});
