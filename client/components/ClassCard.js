import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, typeScale } from '../theme';

const ACCENT = [
  { stripe: colors.purple600, tint: colors.purple50, text: colors.purple600 },
  { stripe: colors.teal600,   tint: colors.teal50,   text: colors.teal600 },
  { stripe: colors.gold600,   tint: colors.gold50,   text: colors.gold800 },
  { stripe: colors.coral600,  tint: colors.coral50,  text: colors.coral600 },
];

function MicroStat({ icon, iconColor, value, label, onPress }) {
  const El = onPress ? Pressable : View;
  return (
    <El
      onPress={onPress}
      style={({ pressed } = {}) => [styles.stat, onPress && pressed && styles.statPressed]}
    >
      <View style={styles.statTop}>
        <Ionicons name={icon} size={11} color={iconColor} />
        <Text style={styles.statValue}>{value}</Text>
        {!!onPress && <Ionicons name="chevron-forward" size={9} color={iconColor} style={{ marginLeft: 1 }} />}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </El>
  );
}

export default function ClassCard({ courseClass, courseName, accentIndex = 0, onPress, onStatPress }) {
  const a = ACCENT[accentIndex % ACCENT.length];
  const [copied, setCopied] = useState(false);

  const copyCode = (e) => {
    if (e?.stopPropagation) e.stopPropagation();
    if (courseClass.code) {
      Clipboard.setString(courseClass.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {/* Left accent stripe */}
      <View style={[styles.stripe, { backgroundColor: a.stripe }]} />

      <View style={styles.body}>
        {/* Course name label */}
        {!!courseName && (
          <Text style={[styles.courseLabel, { color: a.text }]} numberOfLines={1}>
            {courseName.toUpperCase()}
          </Text>
        )}

        {/* Section number */}
        <Text style={styles.sectionTitle}>Section {courseClass.sectionNumber}</Text>
        {!!courseClass.meetingTimes && (
          <Text style={styles.meetingTimes} numberOfLines={1}>{courseClass.meetingTimes}</Text>
        )}

        {/* Code chip */}
        {!!courseClass.code && (
          <Pressable onPress={copyCode} style={styles.codeRow} hitSlop={8}>
            <Text style={styles.codeLabel}>CLASS CODE</Text>
            <View style={styles.codeChip}>
              <Text style={styles.codeText}>{courseClass.code}</Text>
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={10}
                color={copied ? colors.green600 : colors.gold800}
              />
            </View>
            {copied && <Text style={styles.copiedText}>Copied</Text>}
          </Pressable>
        )}

        {/* Stats */}
        <View style={styles.stats}>
          <MicroStat
            icon="people-outline"
            iconColor={a.text}
            value={courseClass.enrollmentCount ?? 0}
            label="students"
            onPress={onStatPress ? (e) => { e?.stopPropagation?.(); onStatPress('roster'); } : undefined}
          />
          <MicroStat
            icon="flash"
            iconColor={colors.green600}
            value={courseClass.activeToday ?? 0}
            label="active today"
            onPress={onStatPress ? (e) => { e?.stopPropagation?.(); onStatPress('active-today'); } : undefined}
          />
          <MicroStat
            icon="checkmark-circle-outline"
            iconColor={colors.purple600}
            value={courseClass.sectionsCompleted ?? 0}
            label="sections done"
          />
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.neutral200} style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    overflow: 'hidden',
    shadowColor: colors.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  pressed: {
    opacity: 0.85,
  },
  stripe: {
    width: 5,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  courseLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  sectionTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: colors.purple800,
    lineHeight: 20,
  },
  meetingTimes: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.neutral600,
    marginTop: -2,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  codeLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    color: colors.neutral600,
    letterSpacing: 0.6,
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.gold100,
    borderWidth: 1.5,
    borderColor: colors.gold400,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    shadowColor: colors.gold600,
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 1,
  },
  codeText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: colors.gold800,
    letterSpacing: 0.5,
  },
  copiedText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 10.5,
    color: colors.green600,
  },
  stats: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.neutral50,
    borderRadius: radius.sm,
    padding: 7,
    gap: 2,
  },
  statPressed: {
    backgroundColor: colors.neutral100,
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: 'Nunito_900Black',
    fontSize: 13,
    color: colors.neutral900,
    lineHeight: 16,
  },
  statLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 9.5,
    color: colors.neutral600,
  },
  chevron: {
    alignSelf: 'center',
    marginRight: 12,
  },
});
