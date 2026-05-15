import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import ScreenHeader from '../../components/ScreenHeader';
import TagChip from '../../components/TagChip';
import QuestionTypeSelector from '../../components/QuestionTypeSelector';
import DynamicSyntaxGuide from '../../components/DynamicSyntaxGuide';
import ChoiceEditor from '../../components/ChoiceEditor';
import ShadowButton from '../../components/ShadowButton';
import { colors, typeScale, spacing, radius, screenPadding } from '../../theme';

const DIFFICULTIES = [1, 2, 3, 4, 5];

function newChoice() {
  return { content: '', isCorrect: false, blankIndex: 0 };
}

export default function CreateQuestionScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const { question: existing } = useRoute().params ?? {};
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
  const [selectedTags, setSelectedTags] = useState(existing?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    api.get('/tags', token).then(setAllTags).catch(() => {});
  }, [token]);

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

  const tagSuggestions = tagInput.trim()
    ? allTags
        .filter(t =>
          t.name.toLowerCase().includes(tagInput.trim().toLowerCase()) &&
          !selectedTags.some(s => s.id === t.id)
        )
        .slice(0, 5)
    : [];

  const showCreateOption = tagInput.trim() &&
    !allTags.some(t => t.name.toLowerCase() === tagInput.trim().toLowerCase());

  async function handleAddTag(tag) {
    setSelectedTags(prev => [...prev, tag]);
    setTagInput('');
  }

  async function handleCreateTag() {
    const name = tagInput.trim();
    if (!name) return;
    try {
      const tag = await api.post('/tags', { name }, token);
      setAllTags(prev => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedTags(prev => [...prev, tag]);
      setTagInput('');
    } catch {
      // silently ignore — tag will still save with existing selections
    }
  }

  function isValid() {
    if (!content.trim() || !correctExplanation.trim() || !incorrectExplanation.trim()) return false;
    if (type === 'DYNAMIC') return !!answerExpression.trim();
    const filled = choices.filter(c => c.content.trim());
    if (filled.length < 2) return false;
    return filled.some(c => c.isCorrect);
  }

  async function handleSave() {
    if (!isValid() || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const base = {
        type,
        content: content.trim(),
        correctExplanation: correctExplanation.trim(),
        incorrectExplanation: incorrectExplanation.trim(),
        difficulty,
        tagIds: selectedTags.map(t => t.id),
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
        const updated = await api.patch(`/questions/${existing.id}`, payload, token);
        navigation.navigate('QuestionDetail', { question: updated });
      } else {
        await api.post('/questions', payload, token);
        navigation.goBack();
      }
    } catch (e) {
      setSaveError(e.message || 'Could not save question.');
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
          <Text style={styles.label}>Type</Text>
          <QuestionTypeSelector type={type} onTypeChange={setType} />

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

          {isDynamic && (
            <>
              <DynamicSyntaxGuide />

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

          {!isDynamic && (
            <>
              <Text style={styles.label}>Answer Choices <Text style={styles.hint}>(tap circle to mark correct)</Text></Text>
              <ChoiceEditor
                choices={choices}
                onChoiceChange={setChoiceContent}
                onSetCorrect={setCorrect}
                onAddChoice={addChoice}
                onRemoveChoice={removeChoice}
              />
            </>
          )}

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

          <Text style={styles.label}>Tags <Text style={styles.hint}>(optional)</Text></Text>
          {selectedTags.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tagRow}
              contentContainerStyle={styles.tagRowContent}
            >
              {selectedTags.map(tag => (
                <TagChip
                  key={tag.id}
                  label={tag.name}
                  color={tag.color}
                  onRemove={() => setSelectedTags(prev => prev.filter(t => t.id !== tag.id))}
                />
              ))}
            </ScrollView>
          )}
          <TextInput
            style={styles.input}
            placeholder="Search or create a tag…"
            placeholderTextColor={colors.neutral400}
            value={tagInput}
            onChangeText={setTagInput}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {tagSuggestions.map(tag => (
            <TouchableOpacity
              key={tag.id}
              style={styles.suggestion}
              onPress={() => handleAddTag(tag)}
              activeOpacity={0.7}
            >
              <TagChip label={tag.name} color={tag.color} />
            </TouchableOpacity>
          ))}
          {showCreateOption && (
            <TouchableOpacity style={styles.suggestion} onPress={handleCreateTag} activeOpacity={0.7}>
              <Text style={styles.createTagText}>+ Create tag "{tagInput.trim()}"</Text>
            </TouchableOpacity>
          )}

          {saveError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{saveError}</Text>
            </View>
          )}

          <ShadowButton
            label={saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Save Question'}
            onPress={handleSave}
            disabled={!isValid()}
            loading={saving}
            paddingVertical={16}
            style={styles.saveBtn}
          />
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

  input: {
    ...typeScale.body, color: colors.purple900,
    borderWidth: 1.5, borderColor: colors.purple200, borderRadius: radius.md,
    paddingHorizontal: spacing[4], paddingVertical: 12,
  },
  inputMulti: { height: 88, textAlignVertical: 'top', marginBottom: 0 },
  inputShort: { width: 100 },
  inputCorrect: { borderColor: colors.teal400 },
  inputIncorrect: { borderColor: colors.coral400 },

  diffRow: { flexDirection: 'row', gap: spacing[2] },
  diffBtn: {
    width: 44, height: 44, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.purple200, alignItems: 'center', justifyContent: 'center',
  },
  diffBtnActive: { backgroundColor: colors.gold200, borderColor: colors.gold400 },
  diffText: { ...typeScale.label, color: colors.neutral600 },
  diffTextActive: { color: colors.gold800 },

  tagRow: { marginBottom: spacing[2] },
  tagRowContent: { gap: spacing[2], paddingVertical: 2 },
  suggestion: {
    paddingVertical: spacing[2], paddingHorizontal: spacing[3],
    borderBottomWidth: 1, borderBottomColor: colors.purple50,
  },
  createTagText: { ...typeScale.label, color: colors.purple400 },

  errorBox: {
    backgroundColor: colors.coral50,
    borderWidth: 1.5, borderColor: colors.coral400,
    borderRadius: radius.md,
    padding: spacing[3], marginTop: spacing[4],
  },
  errorText: { ...typeScale.body, color: colors.coral600 },

  saveBtn: { marginTop: spacing[5] },
});
