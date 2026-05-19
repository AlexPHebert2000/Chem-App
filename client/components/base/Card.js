import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius } from '../../theme';

export default function Card({ children, style, elevated = false }) {
  return (
    <View style={[styles.card, elevated && styles.elevated, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    padding: 14,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  elevated: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
});
