import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, typeScale } from '../theme';

export default function QuestionCard({ questionText, footer, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.prompt}>{questionText}</Text>
      {footer && <View style={styles.footer}>{footer}</View>}
      {children && <View style={styles.answers}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.purple100,
    padding: 16,
    paddingBottom: 14,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  prompt: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 17,
    color: colors.neutral900,
    lineHeight: 24,
  },
  footer: {
    marginTop: 14,
  },
  answers: {
    marginTop: 14,
    gap: 10,
  },
});
