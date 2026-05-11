import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, typeScale, spacing, radius, screenPadding } from '../../theme';

const DIFFICULTY_LABEL = ['', '★', '★★', '★★★', '★★★★', '★★★★★'];
const TYPE_LABEL = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  FILL_IN_BLANK:   'Fill in Blank',
  DYNAMIC:         'Dynamic',
};

export default function QuestionDetailScreen() {
  const navigation = useNavigation();
  const { question, sectionId } = useRoute().params;
  const isFIB     = question.type === 'FILL_IN_BLANK';
  const isDynamic = question.type === 'DYNAMIC';

  const choicesByBlank = isFIB
    ? question.choices.reduce((acc, c) => {
        (acc[c.blankIndex] ??= []).push(c);
        return acc;
      }, {})
    : null;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Question" subtitle={TYPE_LABEL[question.type]} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Action buttons */}
        <View style={styles.actionRow}>
          <View style={styles.previewShadow}>
            <TouchableOpacity
              style={styles.previewBtn}
              onPress={() => navigation.navigate('QuestionPreview', { question })}
              activeOpacity={0.85}
            >
              <Text style={styles.previewText}>▶  Preview</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.editShadow}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('CreateQuestion', { sectionId, question })}
              activeOpacity={0.85}
            >
              <Text style={styles.editText}>✎  Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={[styles.typePill, isDynamic && styles.typePillDynamic]}>
            <Text style={[styles.typeText, isDynamic && styles.typeTextDynamic]}>
              {TYPE_LABEL[question.type]}
            </Text>
          </View>
          <Text style={styles.difficulty}>{DIFFICULTY_LABEL[question.difficulty]}</Text>
        </View>

        {/* Question text */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Question Template</Text>
          <Text style={styles.questionText}>{question.content}</Text>
        </View>

        {/* DYNAMIC — answer expression + distractor count */}
        {isDynamic && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Answer Expression</Text>
            <View style={styles.expressionBox}>
              <Text style={styles.expressionText}>{question.answerExpression}</Text>
            </View>
            <Text style={[styles.sectionLabel, { marginTop: spacing[3] }]}>
              Distractors per question
            </Text>
            <Text style={styles.distractorValue}>
              {question.distractorCount ?? 3} wrong choices generated per student
            </Text>
          </View>
        )}

        {/* DYNAMIC — generated choices note */}
        {isDynamic && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Answer Choices</Text>
            <View style={styles.dynamicChoicesNote}>
              <Text style={styles.dynamicChoicesIcon}>⚡</Text>
              <Text style={styles.dynamicChoicesText}>
                Choices are generated automatically for each student when they load the section.
                The correct answer and {question.distractorCount ?? 3} distractors are derived from the resolved template values.
              </Text>
            </View>
          </View>
        )}

        {/* MC / FIB choices */}
        {!isDynamic && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {isFIB ? 'Blanks' : 'Answer Choices'}
            </Text>

            {isFIB ? (
              Object.entries(choicesByBlank)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([blankIndex, choices]) => (
                  <View key={blankIndex} style={styles.blankGroup}>
                    <Text style={styles.blankLabel}>Blank {Number(blankIndex) + 1}</Text>
                    {choices.map((c, i) => (
                      <ChoiceRow key={c.id} choice={c} letter={String.fromCharCode(65 + i)} />
                    ))}
                  </View>
                ))
            ) : (
              question.choices.map((c, i) => (
                <ChoiceRow key={c.id} choice={c} letter={String.fromCharCode(65 + i)} />
              ))
            )}
          </View>
        )}

        {/* Explanations */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Correct Answer Explanation</Text>
          <View style={styles.explanationBoxCorrect}>
            <Text style={styles.explanationTextCorrect}>{question.correctExplanation ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Incorrect Answer Explanation</Text>
          <View style={styles.explanationBoxIncorrect}>
            <Text style={styles.explanationTextIncorrect}>{question.incorrectExplanation ?? '—'}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ChoiceRow({ choice, letter }) {
  const correct = choice.isCorrect;
  return (
    <View style={[styles.choiceRow, correct && styles.choiceRowCorrect]}>
      <View style={[styles.letterBadge, correct && styles.letterBadgeCorrect]}>
        <Text style={[styles.letterText, correct && styles.letterTextCorrect]}>{letter}</Text>
      </View>
      <Text style={[styles.choiceText, correct && styles.choiceTextCorrect]}>
        {choice.content}
      </Text>
      {correct && <Text style={styles.checkmark}>✓</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  scroll: { paddingHorizontal: screenPadding.horizontal, paddingBottom: 48 },

  actionRow: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[5] },

  previewShadow: {
    flex: 1,
    backgroundColor: colors.purple800, borderRadius: radius.full, transform: [{ translateY: 4 }],
  },
  previewBtn: {
    backgroundColor: colors.purple400, borderRadius: radius.full,
    paddingVertical: 14, alignItems: 'center', transform: [{ translateY: -4 }],
  },
  previewText: { ...typeScale.button, color: colors.neutral900 },

  editShadow: {
    flex: 1,
    backgroundColor: colors.gold600, borderRadius: radius.full, transform: [{ translateY: 4 }],
  },
  editBtn: {
    backgroundColor: colors.gold300, borderRadius: radius.full,
    paddingVertical: 14, alignItems: 'center', transform: [{ translateY: -4 }],
  },
  editText: { ...typeScale.button, color: colors.neutral900 },

  metaRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing[4],
  },
  typePill: {
    backgroundColor: colors.purple100, borderRadius: radius.sm,
    paddingHorizontal: spacing[3], paddingVertical: spacing[1],
  },
  typePillDynamic: { backgroundColor: colors.teal50, borderWidth: 1, borderColor: colors.teal300 },
  typeText: { ...typeScale.label, color: colors.purple800 },
  typeTextDynamic: { color: colors.teal700 },
  difficulty: { ...typeScale.h3, color: colors.gold600 },

  section: { marginBottom: spacing[5] },
  sectionLabel: { ...typeScale.label, color: colors.neutral600, marginBottom: spacing[2] },

  questionText: {
    ...typeScale.h3, color: colors.purple900,
    backgroundColor: colors.purple50,
    borderRadius: radius.lg, padding: spacing[4],
    borderWidth: 1, borderColor: colors.purple100,
    lineHeight: 26,
  },

  expressionBox: {
    backgroundColor: colors.teal50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.teal300,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  expressionText: {
    ...typeScale.body,
    color: colors.teal700,
    fontFamily: 'monospace',
  },
  distractorValue: { ...typeScale.body, color: colors.neutral600 },

  dynamicChoicesNote: {
    flexDirection: 'row',
    gap: spacing[3],
    backgroundColor: colors.purple50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.purple200,
    padding: spacing[4],
    alignItems: 'flex-start',
  },
  dynamicChoicesIcon: { fontSize: 20 },
  dynamicChoicesText: { ...typeScale.body, color: colors.purple700, flex: 1, lineHeight: 22 },

  choiceRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    backgroundColor: '#fff', borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.purple100,
    padding: spacing[3], marginBottom: spacing[2],
  },
  choiceRowCorrect: {
    backgroundColor: colors.teal50, borderColor: colors.teal400,
  },
  letterBadge: {
    width: 28, height: 28, borderRadius: radius.full,
    backgroundColor: colors.purple100,
    alignItems: 'center', justifyContent: 'center',
  },
  letterBadgeCorrect: { backgroundColor: colors.teal400 },
  letterText: { ...typeScale.label, color: colors.purple800 },
  letterTextCorrect: { color: '#fff' },
  choiceText: { ...typeScale.body, color: colors.purple900, flex: 1 },
  choiceTextCorrect: { color: colors.teal600 },
  checkmark: { ...typeScale.h3, color: colors.teal400 },

  blankGroup: { marginBottom: spacing[4] },
  blankLabel: { ...typeScale.label, color: colors.purple400, marginBottom: spacing[2] },

  explanationBoxCorrect: {
    backgroundColor: colors.teal50, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.teal400,
    padding: spacing[4],
  },
  explanationTextCorrect: { ...typeScale.body, color: colors.teal600, lineHeight: 22 },

  explanationBoxIncorrect: {
    backgroundColor: colors.coral50, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.coral400,
    padding: spacing[4],
  },
  explanationTextIncorrect: { ...typeScale.body, color: colors.coral600, lineHeight: 22 },
});
