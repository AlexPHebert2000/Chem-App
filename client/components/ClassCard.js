import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, typeScale } from '../theme';
import Card from './base/Card';

export default function ClassCard({ courseClass, courseName, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <Card style={styles.card}>
        {/* Course name */}
        <Text style={styles.courseName}>{courseName}</Text>

        {/* Section number */}
        <Text style={styles.sectionNumber}>Section {courseClass.sectionNumber}</Text>

        {/* Footer row */}
        <View style={styles.footer}>
          <View style={styles.metaPill}>
            <Ionicons name="time-outline" size={12} color={colors.neutral600} />
            <Text style={styles.metaText}>{courseClass.meetingTimes ?? 'TBD'}</Text>
          </View>

          <View style={styles.metaPill}>
            <Ionicons name="people-outline" size={12} color={colors.neutral600} />
            <Text style={styles.metaText}>{courseClass.enrollmentCount ?? 0} students</Text>
          </View>

          {courseClass.activeToday != null && (
            <View style={[styles.metaPill, styles.activePill]}>
              <Ionicons name="flash" size={12} color={colors.teal600} />
              <Text style={[styles.metaText, { color: colors.teal600 }]}>
                {courseClass.activeToday} active today
              </Text>
            </View>
          )}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
  card: {
    gap: 6,
  },
  courseName: {
    ...typeScale.caption,
    color: colors.purple600,
    fontFamily: 'Nunito_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionNumber: {
    ...typeScale.h3,
    color: colors.neutral900,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.neutral100,
    borderRadius: radius.full,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  activePill: {
    backgroundColor: colors.teal50,
  },
  metaText: {
    ...typeScale.caption,
    color: colors.neutral600,
  },
});
