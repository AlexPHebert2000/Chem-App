import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typeScale, spacing, radius } from '../theme';

const TYPES = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'FILL_IN_BLANK',   label: 'Fill in Blank' },
  { value: 'DYNAMIC',         label: 'Dynamic' },
];

export default function QuestionTypeSelector({ type, onTypeChange }) {
  return (
    <View style={styles.row}>
      {TYPES.map(({ value, label }) => (
        <TouchableOpacity
          key={value}
          style={[styles.btn, type === value && styles.btnActive]}
          onPress={() => onTypeChange(value)}
          activeOpacity={0.8}
        >
          <Text style={[styles.btnText, type === value && styles.btnTextActive]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing[2] },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.purple200,
    alignItems: 'center',
  },
  btnActive: { backgroundColor: colors.purple400, borderColor: colors.purple400 },
  btnText: { ...typeScale.label, color: colors.purple600, textAlign: 'center' },
  btnTextActive: { color: colors.neutral900 },
});
