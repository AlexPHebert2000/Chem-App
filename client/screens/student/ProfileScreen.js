import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  ScreenSurface, AvatarCircle, StreakBadge, XpBadge, SectionDivider, Card,
} from '../../components/base';
import BadgeRow from '../../components/BadgeRow';
import { colors, typeScale, spacing, screenPadding, radius } from '../../theme';

function StatBox({ label, value, color = colors.purple600 }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value ?? '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, token, logout } = useAuth();
  const [student, setStudent] = useState(null);
  const [badges, setBadges] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [me, badgeData] = await Promise.all([
        api.get('/students/me', token),
        api.get('/students/me/badges', token),
      ]);
      setStudent(me);
      setBadges(badgeData ?? []);
    } catch (e) {
      console.warn('ProfileScreen load error:', e.message);
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const enrollment = student?.enrollments?.[0];
  const lifetimeXp = enrollment?.lifetimePoints ?? 0;

  return (
    <ScreenSurface>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <AvatarCircle name={user?.name} size={72} />
          <Text style={styles.name}>{user?.name ?? '—'}</Text>
          {student?.activeTitle && (
            <View style={styles.titlePill}>
              <Text style={styles.titleText}>{student.activeTitle}</Text>
            </View>
          )}
          <View style={styles.pills}>
            <StreakBadge streak={enrollment?.streak ?? 0} />
            <XpBadge xp={lifetimeXp} />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <SectionDivider label="Stats" />
          <Card style={styles.statsCard}>
            <StatBox label="Lifetime XP" value={lifetimeXp.toLocaleString()} color={colors.gold600} />
            <StatBox label="Current streak" value={enrollment?.streak ?? 0} color={colors.coral600} />
            <StatBox label="Badges earned" value={badges.length} color={colors.purple600} />
          </Card>
        </View>

        {/* Badges */}
        {badges.length > 0 && (
          <View style={styles.section}>
            <SectionDivider label="Badges" />
            <BadgeRow badges={badges} />
          </View>
        )}

        {/* Settings link */}
        <View style={styles.section}>
          <Pressable
            style={styles.settingsRow}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settingsLabel}>Weekly goal settings</Text>
            <Text style={styles.settingsChevron}>›</Text>
          </Pressable>

          <Pressable style={[styles.settingsRow, styles.logoutRow]} onPress={logout}>
            <Text style={styles.logoutLabel}>Log out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: screenPadding.horizontal,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral100,
    gap: 8,
  },
  name: {
    ...typeScale.h1,
    color: colors.neutral900,
    marginTop: 4,
  },
  titlePill: {
    backgroundColor: colors.purple50,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.purple200,
    paddingVertical: 4,
    paddingHorizontal: 14,
  },
  titleText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: colors.purple600,
  },
  pills: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing[4],
    gap: 8,
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: 'Nunito_900Black',
    fontSize: 22,
    lineHeight: 26,
  },
  statLabel: {
    ...typeScale.caption,
    color: colors.neutral600,
    textAlign: 'center',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  logoutRow: {
    marginTop: 4,
    borderColor: colors.coral200,
    backgroundColor: colors.coral50,
  },
  settingsLabel: {
    ...typeScale.body,
    color: colors.neutral900,
  },
  settingsChevron: {
    fontSize: 22,
    color: colors.neutral400,
  },
  logoutLabel: {
    ...typeScale.body,
    color: colors.coral600,
    fontFamily: 'Nunito_700Bold',
  },
});
