import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typeScale } from '../../theme';

export default function SectionDivider({ label, action, onAction, style }) {
  return (
    <View style={[styles.row, style]}>
      {label ? (
        <Text style={styles.label}>{label}</Text>
      ) : (
        <View style={styles.line} />
      )}
      {action && (
        <Text style={styles.action} onPress={onAction}>{action}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    ...typeScale.label,
    color: colors.neutral600,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.neutral200,
  },
  action: {
    ...typeScale.caption,
    color: colors.purple600,
    fontFamily: 'Nunito_700Bold',
  },
});
