import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, typeScale, spacing, radius, screenPadding } from '../../theme';

const DIFFICULTY_LABEL = ['', '★', '★★', '★★★', '★★★★', '★★★★★'];
const TYPE_LABEL = { MULTIPLE_CHOICE: 'Multiple Choice', FILL_IN_BLANK: 'Fill in Blank' };

export default function QuestionDetailScreen() {
  const navigation = useNavigation();
  const { question, index } = useRoute().params;
  const isFIB = question.type === 'FILL_IN_BLANK';

  const choicesByBlank = isFIB
    ? question.choices.reduce((acc, c) => {
        (acc[c.blankIndex] ??= []).push(c);
        return acc;
      }, {})
    : null;

  return (
    <View style={styles.container}>
      <ScreenHeader title={`Question ${index + 1}`} subtitle={TYPE_LABEL[question.type]} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Preview button */}
        <View style={styles.previewShadow}>
          <TouchableOpacity
            style={styles.previewBtn}
            onPress={() => navigation.navigate('QuestionPreview', { question, index })}
            activeOpacity={0.85}
          >
            <Text style={styles.previewText}>▶  Preview as Student</Text>
          </TouchableOpacity>
        </View>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.typePill}>
            <Text style={styles.typeText}>{TYPE_LABEL[question.type]}</Text>
          </View>
          <Text style={styles.difficulty}>{DIFFICULTY_LABEL[question.difficulty]}</Text>
        </View>

        {/* Question text */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Question</Text>
          <Text style={styles.questionText}>{question.content}</Text>
        </View>

        {/* Choices */}
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

        {/* Explanation */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Solution Explanation</Text>
          <View style={styles.explanationBox}>
            <Text style={styles.explanationText}>{question.solutionExplanation}</Text>
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

  previewShadow: {
    backgroundColor: colors.purple800, borderRadius: radius.full,
    transform: [{ translateY: 4 }], marginBottom: spacing[5],
  },
  previewBtn: {
    backgroundColor: colors.purple400, borderRadius: radius.full,
    paddingVertical: 14, alignItems: 'center', transform: [{ translateY: -4 }],
  },
  previewText: { ...typeScale.button, color: colors.neutral900 },

  metaRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing[4],
  },
  typePill: {
    backgroundColor: colors.purple100, borderRadius: radius.sm,
    paddingHorizontal: spacing[3], paddingVertical: spacing[1],
  },
  typeText: { ...typeScale.label, color: colors.purple800 },
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

  explanationBox: {
    backgroundColor: colors.gold50, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.gold200,
    padding: spacing[4],
  },
  explanationText: { ...typeScale.body, color: colors.gold800, lineHeight: 22 },
});
