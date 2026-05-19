import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../../theme';

export default function XpBadge({ xp, style }) {
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.text}>+{xp} XP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.gold400,
    borderRadius: radius.full,
    paddingVertical: 3,
    paddingHorizontal: 10,
    shadowColor: colors.gold600,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  text: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
    color: colors.neutral900,
  },
});
