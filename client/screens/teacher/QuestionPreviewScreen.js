import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, typeScale, spacing, radius, screenPadding } from '../../theme';

const DIFFICULTY_LABEL = ['', '★', '★★', '★★★', '★★★★', '★★★★★'];

export default function QuestionPreviewScreen() {
  const { question, index } = useRoute().params;
  const isFIB = question.type === 'FILL_IN_BLANK';

  // MC: selectedId (string) | FIB: { [blankIndex]: choiceId }
  const [selected, setSelected] = useState(isFIB ? {} : null);
  const [submitted, setSubmitted] = useState(false);

  const choicesByBlank = isFIB
    ? question.choices.reduce((acc, c) => {
        (acc[c.blankIndex] ??= []).push(c);
        return acc;
      }, {})
    : null;

  function canSubmit() {
    if (submitted) return false;
    if (isFIB) {
      const blankCount = Object.keys(choicesByBlank).length;
      return Object.keys(selected).length === blankCount;
    }
    return selected !== null;
  }

  function isCorrect() {
    if (isFIB) {
      return Object.entries(selected).every(([blankIndex, choiceId]) => {
        const choice = question.choices.find(c => c.id === choiceId);
        return choice?.isCorrect;
      });
    }
    const choice = question.choices.find(c => c.id === selected);
    return choice?.isCorrect ?? false;
  }

  function reset() {
    setSelected(isFIB ? {} : null);
    setSubmitted(false);
  }

  function choiceState(choice) {
    if (!submitted) {
      const isSelected = isFIB
        ? selected[choice.blankIndex] === choice.id
        : selected === choice.id;
      return isSelected ? 'selected' : 'idle';
    }
    const isSelected = isFIB
      ? selected[choice.blankIndex] === choice.id
      : selected === choice.id;
    if (isSelected && choice.isCorrect) return 'correct';
    if (isSelected && !choice.isCorrect) return 'wrong';
    if (!isSelected && choice.isCorrect) return 'reveal';
    return 'idle';
  }

  function handleSelect(choice) {
    if (submitted) return;
    if (isFIB) {
      setSelected(prev => ({ ...prev, [choice.blankIndex]: choice.id }));
    } else {
      setSelected(choice.id);
    }
  }

  const answered = submitted;
  const correct = answered && isCorrect();

  return (
    <View style={styles.container}>
      <ScreenHeader title={`Question ${index + 1}`} subtitle="Student Preview" />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Difficulty */}
        <View style={styles.metaRow}>
          <Text style={styles.previewBadge}>PREVIEW MODE</Text>
          <Text style={styles.difficulty}>{DIFFICULTY_LABEL[question.difficulty]}</Text>
        </View>

        {/* Question */}
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{question.content}</Text>
        </View>

        {/* Choices */}
        {isFIB ? (
          Object.entries(choicesByBlank)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([blankIndex, choices]) => (
              <View key={blankIndex} style={styles.blankGroup}>
                <Text style={styles.blankLabel}>Blank {Number(blankIndex) + 1}</Text>
                {choices.map(c => (
                  <ChoiceButton
                    key={c.id}
                    choice={c}
                    state={choiceState(c)}
                    onPress={() => handleSelect(c)}
                  />
                ))}
              </View>
            ))
        ) : (
          <View style={styles.choiceList}>
            {question.choices.map(c => (
              <ChoiceButton
                key={c.id}
                choice={c}
                state={choiceState(c)}
                onPress={() => handleSelect(c)}
              />
            ))}
          </View>
        )}

        {/* Submit / result */}
        {!submitted ? (
          <View style={[styles.submitShadow, !canSubmit() && styles.submitShadowDisabled]}>
            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit() && styles.submitBtnDisabled]}
              onPress={() => setSubmitted(true)}
              disabled={!canSubmit()}
              activeOpacity={0.85}
            >
              <Text style={styles.submitText}>Check Answer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.resultBanner, correct ? styles.resultCorrect : styles.resultWrong]}>
            <Text style={styles.resultEmoji}>{correct ? '🎉' : '✗'}</Text>
            <Text style={styles.resultText}>{correct ? 'Correct!' : 'Not quite.'}</Text>
          </View>
        )}

        {/* Explanation — revealed after submit */}
        {submitted && (
          <View style={styles.explanationBox}>
            <Text style={styles.explanationLabel}>Explanation</Text>
            <Text style={styles.explanationText}>{question.solutionExplanation}</Text>
          </View>
        )}

        {/* Try again */}
        {submitted && (
          <TouchableOpacity onPress={reset} style={styles.retryBtn} activeOpacity={0.7}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function ChoiceButton({ choice, state, onPress }) {
  const bg = {
    idle:    '#fff',
    selected: colors.purple50,
    correct:  colors.teal50,
    wrong:    colors.coral50,
    reveal:   colors.teal50,
  }[state];

  const border = {
    idle:    colors.purple100,
    selected: colors.purple400,
    correct:  colors.teal400,
    wrong:    colors.coral400,
    reveal:   colors.teal200,
  }[state];

  const textColor = {
    idle:    colors.purple900,
    selected: colors.purple900,
    correct:  colors.teal600,
    wrong:    colors.coral600,
    reveal:   colors.teal600,
  }[state];

  const indicator = { correct: '✓', wrong: '✗', reveal: '✓' }[state];

  return (
    <View style={[styles.choiceShadow, { borderColor: border }]}>
      <TouchableOpacity
        style={[styles.choiceBtn, { backgroundColor: bg, borderColor: border }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={[styles.choiceText, { color: textColor }]}>{choice.content}</Text>
        {indicator && (
          <Text style={[styles.indicator, state === 'wrong' && { color: colors.coral400 }, (state === 'correct' || state === 'reveal') && { color: colors.teal400 }]}>
            {indicator}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  scroll: { paddingHorizontal: screenPadding.horizontal, paddingBottom: 48 },

  metaRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing[4],
  },
  previewBadge: {
    ...typeScale.label, color: colors.purple400,
    backgroundColor: colors.purple50, paddingHorizontal: spacing[3],
    paddingVertical: spacing[1], borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.purple200,
  },
  difficulty: { ...typeScale.h3, color: colors.gold600 },

  questionCard: {
    backgroundColor: colors.purple800, borderRadius: radius.xl,
    padding: spacing[5], marginBottom: spacing[5],
  },
  questionText: {
    fontFamily: 'Nunito_700Bold', fontSize: 18,
    lineHeight: 26, color: '#fff',
  },

  choiceList: { gap: spacing[3] },
  blankGroup: { marginBottom: spacing[4] },
  blankLabel: { ...typeScale.label, color: colors.purple400, marginBottom: spacing[2] },

  choiceShadow: {
    borderRadius: radius.lg,
    backgroundColor: colors.purple200,
    transform: [{ translateY: 4 }],
    marginBottom: spacing[3],
  },
  choiceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: radius.lg, borderWidth: 1.5,
    paddingVertical: 14, paddingHorizontal: spacing[4],
    transform: [{ translateY: -4 }],
  },
  choiceText: { ...typeScale.body, flex: 1 },
  indicator: { fontSize: 18, fontFamily: 'Nunito_800ExtraBold', marginLeft: spacing[2] },

  submitShadow: {
    marginTop: spacing[2],
    backgroundColor: colors.purple800, borderRadius: radius.full, transform: [{ translateY: 4 }],
  },
  submitShadowDisabled: { backgroundColor: colors.purple200 },
  submitBtn: {
    backgroundColor: colors.purple400, borderRadius: radius.full,
    paddingVertical: 16, alignItems: 'center', transform: [{ translateY: -4 }],
  },
  submitBtnDisabled: { backgroundColor: colors.purple100 },
  submitText: { ...typeScale.button, color: colors.neutral900 },

  resultBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    borderRadius: radius.lg, padding: spacing[4], marginTop: spacing[4],
  },
  resultCorrect: { backgroundColor: colors.teal50, borderWidth: 1, borderColor: colors.teal400 },
  resultWrong: { backgroundColor: colors.coral50, borderWidth: 1, borderColor: colors.coral400 },
  resultEmoji: { fontSize: 24 },
  resultText: { ...typeScale.h2, color: colors.purple800 },

  explanationBox: {
    backgroundColor: colors.gold50, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.gold200,
    padding: spacing[4], marginTop: spacing[4],
  },
  explanationLabel: { ...typeScale.label, color: colors.gold800, marginBottom: spacing[2] },
  explanationText: { ...typeScale.body, color: colors.gold800, lineHeight: 22 },

  retryBtn: { alignSelf: 'center', marginTop: spacing[4], padding: spacing[3] },
  retryText: { ...typeScale.label, color: colors.purple400 },
});
