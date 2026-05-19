import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typeScale, spacing, radius } from '../theme';

export default function SectionRow({ section, onPress }) {
  const completed = section.completed;
  const score = section.score;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.statusDot, completed ? styles.statusDotDone : styles.statusDotPending]} />
      <View style={styles.sectionInfo}>
        <Text style={styles.sectionName}>{section.name}</Text>
        <Text style={styles.sectionMeta}>
          {section.questionCount} question{section.questionCount !== 1 ? 's' : ''}
          {completed && score != null ? `  ·  ${score}%` : ''}
        </Text>
      </View>
      {completed ? (
        <Text style={styles.checkmark}>✓</Text>
      ) : (
        <Text style={styles.chevron}>›</Text>
      )}
    </TouchableOpacity>
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
    padding: spacing[4],
    marginBottom: spacing[2],
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusDotDone: { backgroundColor: colors.teal400 },
  statusDotPending: { backgroundColor: colors.purple200 },
  sectionInfo: { flex: 1 },
  sectionName: { ...typeScale.label, color: colors.purple900 },
  sectionMeta: { ...typeScale.caption, color: colors.neutral500, marginTop: 2 },
  checkmark: { ...typeScale.body, color: colors.teal400, fontWeight: 'bold' },
  chevron: { ...typeScale.h3, color: colors.purple300 },
});
