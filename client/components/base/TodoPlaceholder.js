import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, typeScale } from '../../theme';

export default function TodoPlaceholder({ label = 'Coming soon', style }) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>[TODO] {label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral100,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.neutral200,
    borderStyle: 'dashed',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    ...typeScale.small,
    color: colors.neutral600,
    opacity: 0.6,
    fontStyle: 'italic',
  },
});
