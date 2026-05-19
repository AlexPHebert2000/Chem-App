import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, typeScale } from '../theme';
import Card from './base/Card';
import ProgressBar from './base/ProgressBar';

function StatCell({ value, label, color = colors.neutral800 }) {
  return (
    <View style={styles.cell}>
      <Text style={[styles.cellValue, { color }]}>{value ?? '—'}</Text>
      <Text style={styles.cellLabel}>{label}</Text>
    </View>
  );
}

export default function WeeklyStatsCard({ stats }) {
  const {
    minutesActive = 0,
    weeklyMinuteGoal = 60,
    xpEarned = 0,
    questionsAttempted = 0,
    percentCorrect = 0,
    perfectQuizzes = 0,
    firstTryCorrect = 0,
  } = stats ?? {};

  const goalProgress = weeklyMinuteGoal > 0 ? Math.min(minutesActive / weeklyMinuteGoal, 1) : 0;
  const goalMet = minutesActive >= weeklyMinuteGoal;

  return (
    <Card style={styles.card}>
      <Text style={styles.heading}>This week</Text>

      {/* Goal donut replaced by horizontal bar — simpler on mobile */}
      <View style={styles.goalRow}>
        <View style={styles.goalInfo}>
          <Text style={styles.goalMinutes}>{minutesActive}</Text>
          <Text style={styles.goalUnit}> / {weeklyMinuteGoal} min</Text>
        </View>
        <Text style={[styles.goalStatus, goalMet && styles.goalMet]}>
          {goalMet ? '✓ Goal met!' : 'Active time'}
        </Text>
      </View>
      <ProgressBar
        progress={goalProgress}
        color={goalMet ? colors.teal400 : colors.purple400}
        height={8}
        style={styles.bar}
      />

      {/* Stats grid */}
      <View style={styles.grid}>
        <StatCell value={`${percentCorrect}%`} label="Accuracy" color={colors.purple600} />
        <StatCell value={xpEarned} label="XP earned" color={colors.gold600} />
        <StatCell value={questionsAttempted} label="Questions" color={colors.neutral800} />
        <StatCell value={perfectQuizzes} label="Perfect quizzes" color={colors.teal600} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  heading: {
    ...typeScale.h3,
    color: colors.neutral800,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  goalMinutes: {
    fontFamily: 'Nunito_900Black',
    fontSize: 28,
    color: colors.neutral900,
    lineHeight: 32,
  },
  goalUnit: {
    ...typeScale.small,
    color: colors.neutral600,
  },
  goalStatus: {
    ...typeScale.caption,
    color: colors.neutral600,
  },
  goalMet: {
    color: colors.teal600,
    fontFamily: 'Nunito_700Bold',
  },
  bar: {
    marginTop: -4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  cell: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: colors.neutral50,
    borderRadius: radius.md,
    padding: 10,
    alignItems: 'center',
  },
  cellValue: {
    fontFamily: 'Nunito_900Black',
    fontSize: 20,
    lineHeight: 24,
  },
  cellLabel: {
    ...typeScale.caption,
    color: colors.neutral600,
    marginTop: 2,
    textAlign: 'center',
  },
});
