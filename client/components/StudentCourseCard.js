import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typeScale, spacing, radius } from '../theme';

export default function StudentCourseCard({ course, onPress }) {
  return (
    <View style={styles.cardShadow}>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
        <View style={styles.cardTop}>
          <View style={styles.cardMeta}>
            <Text style={styles.courseName}>{course.name}</Text>
            <View style={styles.codePill}>
              <Text style={styles.codeText}>{course.code}</Text>
            </View>
          </View>
          <Text style={styles.arrow}>›</Text>
        </View>
        <View style={styles.cardStats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{course.currentPoints}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>🔥 {course.streak}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          {course.currentSection && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statSection}>
                <Text style={styles.statLabel}>Current</Text>
                <Text style={styles.currentSection} numberOfLines={1}>{course.currentSection.name}</Text>
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    backgroundColor: colors.purple800,
    borderRadius: radius.xl,
    marginBottom: spacing[4],
    transform: [{ translateY: 4 }],
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing[4],
    transform: [{ translateY: -4 }],
    borderWidth: 1.5,
    borderColor: colors.purple100,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  cardMeta: { flex: 1, gap: spacing[2] },
  courseName: { ...typeScale.h3, color: colors.purple900 },
  codePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.purple50,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.purple200,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  codeText: { ...typeScale.caption, color: colors.purple600 },
  arrow: { ...typeScale.h2, color: colors.purple300, marginLeft: spacing[3] },
  cardStats: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  stat: { alignItems: 'center' },
  statValue: { ...typeScale.h3, color: colors.purple800 },
  statLabel: { ...typeScale.caption, color: colors.neutral500, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.purple100 },
  statSection: { flex: 1 },
  currentSection: { ...typeScale.label, color: colors.purple600, marginTop: 2 },
});
