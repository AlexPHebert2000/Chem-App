import { View, Text, StyleSheet } from 'react-native';
import { colors, typeScale, spacing, radius } from '../theme';

export default function ChoiceRow({ choice, letter }) {
  const correct = choice.isCorrect;
  return (
    <View style={[styles.row, correct && styles.rowCorrect]}>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: '#fff',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.purple100,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  rowCorrect: { backgroundColor: colors.teal50, borderColor: colors.teal400 },
  letterBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.purple100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterBadgeCorrect: { backgroundColor: colors.teal400 },
  letterText: { ...typeScale.label, color: colors.purple800 },
  letterTextCorrect: { color: '#fff' },
  choiceText: { ...typeScale.body, color: colors.purple900, flex: 1 },
  choiceTextCorrect: { color: colors.teal600 },
  checkmark: { ...typeScale.h3, color: colors.teal400 },
});
