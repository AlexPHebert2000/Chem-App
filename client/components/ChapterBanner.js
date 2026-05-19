import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, typeScale } from '../theme';
import ProgressBar from './base/ProgressBar';

const themeMap = {
  purple: { fill: colors.purple400, deep: colors.purple800, text: colors.purple800, light: colors.purple50 },
  teal:   { fill: colors.teal400,   deep: colors.teal600,   text: colors.teal600,   light: colors.teal50 },
  coral:  { fill: colors.coral400,  deep: colors.coral600,  text: colors.coral600,  light: colors.coral50 },
  gold:   { fill: colors.gold400,   deep: colors.gold600,   text: colors.gold800,   light: colors.gold50 },
};

export default function ChapterBanner({ chapter, completedCount = 0, totalCount = 0, theme = 'purple', locked = false }) {
  const t = themeMap[theme] ?? themeMap.purple;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  return (
    <View style={[
      styles.banner,
      locked ? styles.locked : { backgroundColor: t.fill, borderColor: t.deep },
    ]}>
      <View style={[styles.iconBox, locked ? styles.iconBoxLocked : { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)' }]}>
        <Ionicons
          name={locked ? 'lock-closed' : 'flask'}
          size={24}
          color={locked ? colors.neutral600 : '#FFFFFF'}
        />
      </View>
      <View style={styles.info}>
        <Text style={[styles.label, locked && styles.labelLocked]}>
          {chapter.orderIndex !== undefined ? `Chapter ${chapter.orderIndex + 1}` : 'Chapter'}
        </Text>
        <Text style={[styles.title, locked && styles.titleLocked]}>{chapter.name}</Text>
        {!locked && (
          <View style={styles.progressRow}>
            <ProgressBar progress={progress} color="#FFFFFF" height={4} style={styles.bar} />
            <Text style={styles.count}>{completedCount}/{totalCount}</Text>
          </View>
        )}
        {locked && <Text style={styles.lockedTag}>LOCKED</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 14,
    marginVertical: 4,
    borderRadius: radius.xl,
    padding: 14,
    borderWidth: 0,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  locked: {
    backgroundColor: colors.neutral100,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    shadowOpacity: 0,
    elevation: 0,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxLocked: {
    backgroundColor: colors.neutral200,
    borderColor: 'transparent',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 2,
  },
  labelLocked: {
    color: colors.neutral600,
  },
  title: {
    fontFamily: 'Nunito_900Black',
    fontSize: 18,
    lineHeight: 22,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  titleLocked: {
    color: colors.neutral600,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bar: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  count: {
    fontFamily: 'Nunito_900Black',
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
  },
  lockedTag: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.neutral600,
    marginTop: 2,
  },
});
