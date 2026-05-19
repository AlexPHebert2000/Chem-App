import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { colors, radius, typeScale } from '../theme';

function BadgeTile({ badge }) {
  const tierColors = {
    1: { bg: colors.neutral100, border: colors.neutral200, text: colors.neutral600 },
    2: { bg: colors.gold50,     border: colors.gold200,    text: colors.gold800 },
    3: { bg: colors.purple50,   border: colors.purple200,  text: colors.purple600 },
  };
  const streak = badge.badgeType === 'STREAK';
  const style = streak
    ? { bg: colors.coral50, border: colors.coral400, text: colors.coral600 }
    : (tierColors[badge.tier ?? 1] ?? tierColors[1]);

  return (
    <View style={[styles.tile, { backgroundColor: style.bg, borderColor: style.border }]}>
      <Text style={styles.icon}>{badge.icon ?? '🏅'}</Text>
      <Text style={[styles.name, { color: style.text }]} numberOfLines={2}>{badge.name}</Text>
      {badge.tier != null && !streak && (
        <Text style={styles.stars}>{'★'.repeat(badge.tier)}{'☆'.repeat(3 - badge.tier)}</Text>
      )}
    </View>
  );
}

export default function BadgeRow({ badges = [], style }) {
  if (!badges.length) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.row, style]}>
      {badges.map(sb => (
        <BadgeTile key={sb.id ?? sb.badgeId} badge={sb.badge ?? sb} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 10,
    paddingHorizontal: 2,
  },
  tile: {
    width: 88,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: 10,
    alignItems: 'center',
    gap: 4,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  icon: {
    fontSize: 28,
    lineHeight: 34,
  },
  name: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  stars: {
    fontSize: 11,
    color: colors.gold400,
    letterSpacing: 1,
  },
});
