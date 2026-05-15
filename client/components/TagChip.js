import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { typeScale, spacing, radius } from '../theme';

export default function TagChip({ label, color, onRemove }) {
  return (
    <View style={[styles.chip, { backgroundColor: color + '33', borderColor: color + '99' }]}>
      <Text style={[styles.label, { color }]} numberOfLines={1}>{label}</Text>
      {onRemove && (
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} activeOpacity={0.6}>
          <Text style={[styles.remove, { color }]}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: radius.sm,
    paddingHorizontal: spacing[2], paddingVertical: 3,
    gap: spacing[1],
  },
  label: { ...typeScale.caption },
  remove: { ...typeScale.caption, fontWeight: '700', lineHeight: 16 },
});
