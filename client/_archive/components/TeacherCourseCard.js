import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typeScale, spacing, radius } from '../theme';

export default function TeacherCourseCard({ course, onPress, onCopyCode }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.courseName}>{course.name}</Text>
      <TouchableOpacity style={styles.codeRow} onPress={onCopyCode} activeOpacity={0.7}>
        <Text style={styles.codeLabel}>Class code</Text>
        <View style={styles.codePill}>
          <Text style={styles.codeText}>{course.code}</Text>
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.purple50,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.purple100,
  },
  courseName: { ...typeScale.h3, color: colors.purple800, marginBottom: spacing[2] },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  codeLabel: { ...typeScale.label, color: colors.neutral600 },
  codePill: {
    backgroundColor: colors.gold100,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  codeText: { ...typeScale.label, color: colors.gold800, letterSpacing: 2 },
});
