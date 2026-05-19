import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, typeScale } from '../theme';
import AvatarCircle from './base/AvatarCircle';
import StreakBadge from './base/StreakBadge';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function StudentRow({ rank, student, currentPoints, lifetimePoints, streak, isMe = false }) {
  return (
    <View style={[styles.row, isMe && styles.rowMe]}>
      {/* Rank */}
      <View style={styles.rankBox}>
        {MEDAL[rank] ? (
          <Text style={styles.medal}>{MEDAL[rank]}</Text>
        ) : (
          <Text style={styles.rankNum}>{rank}</Text>
        )}
      </View>

      {/* Avatar */}
      <AvatarCircle name={student?.name} size={36} />

      {/* Name + subtitle */}
      <View style={styles.info}>
        <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>
          {student?.name ?? '—'}
          {isMe && <Text style={styles.youTag}> (you)</Text>}
        </Text>
        <Text style={styles.pts}>{currentPoints?.toLocaleString() ?? 0} pts</Text>
      </View>

      {/* Streak */}
      {streak > 0 && <StreakBadge streak={streak} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral100,
  },
  rowMe: {
    backgroundColor: colors.purple50,
    borderRadius: radius.md,
    paddingHorizontal: 8,
    borderBottomWidth: 0,
    marginHorizontal: -4,
  },
  rankBox: {
    width: 28,
    alignItems: 'center',
  },
  medal: {
    fontSize: 20,
  },
  rankNum: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    color: colors.neutral600,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typeScale.small,
    fontFamily: 'Nunito_700Bold',
    color: colors.neutral900,
  },
  nameMe: {
    color: colors.purple600,
  },
  youTag: {
    ...typeScale.caption,
    color: colors.purple400,
  },
  pts: {
    ...typeScale.caption,
    color: colors.neutral600,
  },
});
