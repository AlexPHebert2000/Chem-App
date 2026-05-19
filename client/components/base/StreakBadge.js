import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../../theme';

export default function StreakBadge({ streak, style }) {
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.flame}>🔥</Text>
      <Text style={styles.count}>{streak}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gold50,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.gold200,
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 3,
  },
  flame: {
    fontSize: 14,
  },
  count: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    color: colors.gold600,
  },
});
