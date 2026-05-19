import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  ScreenSurface, SectionDivider, StreakBadge, XpBadge, AvatarCircle,
} from '../../components/base';
import WeeklyStatsCard from '../../components/WeeklyStatsCard';
import BadgeRow from '../../components/BadgeRow';
import { colors, typeScale, spacing, screenPadding } from '../../theme';

function ReviewCard({ section, onPress }) {
  const scoreColor = section.score < 60 ? colors.coral600 : colors.gold600;
  return (
    <Pressable onPress={() => onPress?.(section)} style={styles.reviewCard}>
      <View style={styles.reviewBody}>
        <Text style={styles.reviewName} numberOfLines={1}>{section.name}</Text>
        <Text style={[styles.reviewScore, { color: scoreColor }]}>{section.score}% best</Text>
      </View>
      <Text style={styles.reviewChevron}>›</Text>
    </Pressable>
  );
}

export default function DashboardScreen({ navigation }) {
  const { user, token } = useAuth();
  const [student, setStudent] = useState(null);
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [me, badgeData] = await Promise.all([
        api.get('/students/me', token),
        api.get('/students/me/badges', token),
      ]);
      setStudent(me);
      setBadges(badgeData ?? []);

      // Weekly stats require a courseClassId — use first enrollment if available
      const enrollments = me.enrollments ?? [];
      if (enrollments.length > 0) {
        const classId = enrollments[0].courseClassId;
        const [weeklyStats, reviewData] = await Promise.all([
          api.get(`/stats/weekly?courseClassId=${classId}`, token),
          api.get(`/stats/reviews?courseClassId=${classId}`, token),
        ]);
        setStats(weeklyStats);
        setReviews(reviewData ?? []);
      }
    } catch (e) {
      console.warn('DashboardScreen load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const initials = user?.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  return (
    <ScreenSurface>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AvatarCircle name={user?.name} size={40} />
          <View>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] ?? 'Student'}</Text>
            {student?.activeTitle && (
              <Text style={styles.title}>{student.activeTitle}</Text>
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          {student && (
            <>
              <StreakBadge streak={student.enrollments?.[0]?.streak ?? 0} />
              <XpBadge xp={student.enrollments?.[0]?.currentPoints ?? 0} />
            </>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Weekly Stats */}
        <View style={styles.section}>
          <SectionDivider label="This week" />
          {stats ? (
            <WeeklyStatsCard stats={stats} />
          ) : (
            <View style={styles.noEnrollment}>
              <Text style={styles.noEnrollmentText}>Join a class to see weekly stats.</Text>
            </View>
          )}
        </View>

        {/* Suggested reviews */}
        {reviews.length > 0 && (
          <View style={styles.section}>
            <SectionDivider label="Suggested reviews" />
            {reviews.slice(0, 5).map(r => (
              <ReviewCard
                key={r.sectionId}
                section={r}
                onPress={() => navigation.navigate('StudentSection', { sectionId: r.sectionId })}
              />
            ))}
          </View>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <View style={styles.section}>
            <SectionDivider label="Earned badges" />
            <BadgeRow badges={badges} />
          </View>
        )}
      </ScrollView>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral200,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greeting: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: colors.neutral900,
  },
  title: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: colors.purple600,
    marginTop: 1,
  },
  scroll: {
    paddingBottom: 32,
  },
  section: {
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing[4],
    gap: 8,
  },
  noEnrollment: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noEnrollmentText: {
    ...typeScale.small,
    color: colors.neutral600,
  },
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  reviewBody: {
    flex: 1,
  },
  reviewName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.neutral900,
  },
  reviewScore: {
    ...typeScale.caption,
    marginTop: 2,
  },
  reviewChevron: {
    fontSize: 22,
    color: colors.neutral400,
    fontFamily: 'Nunito_700Bold',
  },
});
