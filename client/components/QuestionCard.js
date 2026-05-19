import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, typeScale } from '../theme';

export default function QuestionCard({ questionNumber, totalQuestions, questionText, children, xp }) {
  return (
    <View style={styles.card}>
      {/* Meta row */}
      <View style={styles.meta}>
        <Text style={styles.metaLabel}>
          QUESTION {questionNumber} OF {totalQuestions}
        </Text>
        {xp != null && (
          <View style={styles.xpPill}>
            <Text style={styles.xpText}>+{xp} XP</Text>
          </View>
        )}
      </View>

      {/* Question prompt */}
      <Text style={styles.prompt}>{questionText}</Text>

      {/* Answer area */}
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
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaLabel: {
    ...typeScale.label,
    color: colors.purple600,
  },
  xpPill: {
    backgroundColor: colors.gold50,
    borderWidth: 1.5,
    borderColor: colors.gold200,
    borderRadius: radius.full,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  xpText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: colors.gold800,
  },
  prompt: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 17,
    color: colors.neutral900,
    lineHeight: 24,
    marginBottom: 4,
  },
  answers: {
    marginTop: 14,
    gap: 10,
  },
});
