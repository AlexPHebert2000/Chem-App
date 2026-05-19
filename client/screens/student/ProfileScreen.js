import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Pressable, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Ellipse } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { colors } from '../../theme';

function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

// ─── DonutChart ──────────────────────────────────────────────────────────────
function DonutChart({ progress = 0, size = 80, stroke = 9 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(1, Math.max(0, progress));
  const dash = filled * circ;
  const c = size / 2;
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={c} cy={c} r={r} fill="none" stroke={colors.neutral100} strokeWidth={stroke}/>
      <Circle cx={c} cy={c} r={r} fill="none" stroke={colors.purple600} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"/>
    </Svg>
  );
}

// ─── StatPill (dark, in header) ───────────────────────────────────────────────
function StatPill({ emoji, value, label }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statPillEmoji}>{emoji}</Text>
      <View>
        <Text style={styles.statPillValue}>{value}</Text>
        <Text style={styles.statPillLabel}>{label}</Text>
      </View>
    </View>
  );
}

// ─── WeeklyGoalCard ───────────────────────────────────────────────────────────
function GoalStat({ value, label, color }) {
  return (
    <View style={styles.goalStat}>
      <Text style={[styles.goalStatVal, { color }]}>{value}</Text>
      <Text style={styles.goalStatLabel}>{label}</Text>
    </View>
  );
}

function WeeklyGoalCard({ weekly }) {
  const goal = weekly?.weeklyMinuteGoal ?? 60;
  const done = weekly?.minutesActive ?? 0;
  const progress = goal > 0 ? done / goal : 0;
  const xp = weekly?.xpEarned ?? 0;
  const questions = weekly?.questionsAttempted ?? 0;
  const accuracy = weekly ? Math.round(weekly.percentCorrect ?? 0) : 0;
  const perfect = weekly?.perfectQuizzes ?? 0;

  return (
    <View style={styles.goalCard}>
      <View style={styles.goalCardInner}>
        <View style={styles.goalDonutWrap}>
          <DonutChart progress={progress} size={80} stroke={9}/>
          <View style={styles.goalDonutOverlay}>
            <Text style={styles.goalDonutPct}>{Math.round(progress * 100)}%</Text>
            <Text style={styles.goalDonutSub}>of goal</Text>
          </View>
        </View>
        <View style={styles.goalStats}>
          <GoalStat value={`${done}m`} label="active" color={colors.purple600}/>
          <GoalStat value={`${accuracy}%`} label="accuracy" color={colors.teal600}/>
          <GoalStat value={xp.toLocaleString()} label="XP" color={colors.gold600}/>
          <GoalStat value={questions} label="questions" color={colors.neutral800}/>
        </View>
      </View>
      {perfect > 0 && (
        <View style={styles.perfectRow}>
          <Text style={styles.perfectText}>
            ⭐ {perfect} perfect quiz{perfect !== 1 ? 'zes' : ''} this week
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
function LeaderRow({ row, rank }) {
  const isYou = row.isYou;
  const medals = ['🥇', '🥈', '🥉'];
  const rankLabel = rank <= 3 ? medals[rank - 1] : `#${rank}`;
  const pts = (row.xp ?? row.currentPoints ?? 0).toLocaleString();
  return (
    <View style={[styles.leaderRow, isYou && styles.leaderRowYou]}>
      <Text style={styles.leaderRank}>{rankLabel}</Text>
      <View style={[styles.leaderAvatar, { backgroundColor: isYou ? colors.purple600 : colors.neutral200 }]}>
        <Text style={[styles.leaderAvatarText, { color: isYou ? '#fff' : colors.neutral600 }]}>
          {row.initials ?? initials(row.name ?? '')}
        </Text>
      </View>
      <Text style={[styles.leaderName, isYou && styles.leaderNameYou]} numberOfLines={1}>
        {row.name ?? ''}
        {isYou ? <Text style={styles.youPill}> YOU</Text> : null}
      </Text>
      <View style={styles.leaderRight}>
        <Text style={styles.leaderXp}>{pts}</Text>
        <Text style={styles.leaderXpLabel}>XP</Text>
      </View>
    </View>
  );
}

// ─── BadgeHex ─────────────────────────────────────────────────────────────────
function BadgeHex({ badge }) {
  const icon = badge.badge?.icon ?? '🎖️';
  const name = badge.badge?.name ?? '';
  return (
    <View style={styles.badgeItem}>
      <LinearGradient
        colors={[colors.purple800, colors.purple600]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.badgeIconBox}
      >
        <Text style={styles.badgeIconText}>{icon}</Text>
      </LinearGradient>
      <Text style={styles.badgeName} numberOfLines={2}>{name}</Text>
    </View>
  );
}

// ─── ProgressBadgeRow ─────────────────────────────────────────────────────────
function ProgressBadgeRow({ badge }) {
  const icon = badge.badge?.icon ?? '🎖️';
  const name = badge.badge?.name ?? '';
  const goal = badge.badge?.criteriaAmount ?? 0;
  const progress = badge.progress ?? 0;
  const pct = goal > 0 ? Math.min(1, progress / goal) : 0;
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressIconWrap}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.progressName}>{name}</Text>
          <Text style={styles.progressCount}>{progress}/{goal}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct * 100}%` }]}/>
        </View>
      </View>
    </View>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
function SectionHeader({ label, action }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {action ? <Text style={styles.sectionAction}>{action} ›</Text> : null}
    </View>
  );
}

// ─── ProfileScreen ────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
  const { user, token, logout } = useAuth();
  const [student, setStudent] = useState(null);
  const [badges, setBadges] = useState([]);
  const [weekly, setWeekly] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [me, badgeData] = await Promise.all([
        api.get('/students/me', token),
        api.get('/students/me/badges', token).catch(() => []),
      ]);
      setStudent(me);
      setBadges(Array.isArray(badgeData) ? badgeData : []);

      const enrollment = me?.enrollments?.[0];
      if (enrollment?.courseClassId) {
        const courseId = enrollment.courseClass?.courseId;
        const classId = enrollment.courseClassId;
        const [weeklyData, lbData] = await Promise.all([
          api.get(`/stats/weekly?courseClassId=${classId}`, token).catch(() => null),
          courseId
            ? api.get(`/courses/${courseId}/classes/${classId}/leaderboard`, token).catch(() => [])
            : Promise.resolve([]),
        ]);
        setWeekly(weeklyData);
        setLeaderboard(Array.isArray(lbData) ? lbData : []);
      }
    } catch (e) {
      console.warn('ProfileScreen load error:', e.message);
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const enrollment = student?.enrollments?.[0];
  const streak = enrollment?.streak ?? 0;
  const weeklyXp = weekly?.xpEarned ?? 0;
  const myRank = leaderboard.findIndex(r => r.isYou) + 1 || null;
  const inits = initials(student?.name ?? user?.name ?? '');
  const currentXp = enrollment?.currentPoints ?? 0;
  const lifetimeXp = enrollment?.lifetimePoints ?? 0;
  const earnedBadges = badges.filter(b => b.dateAchieved);
  const progressBadges = badges.filter(b => !b.dateAchieved && b.badge?.criteriaAmount);
  const firstName = (student?.name ?? user?.name ?? 'Student').split(' ')[0];
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.purple800}/>
      <View style={styles.statusBarFill}/>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purple400}/>
        }
      >
        {/* ── Hero Header ── */}
        <LinearGradient
          colors={[colors.purple800, colors.purple600]}
          start={{ x: 0.1, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          {/* Decorative atom SVG */}
          <Svg viewBox="0 0 200 200" style={styles.atomDecor}>
            <Ellipse cx="100" cy="100" rx="80" ry="30"
              fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2"/>
            <Ellipse cx="100" cy="100" rx="80" ry="30"
              fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2"
              transform="rotate(60, 100, 100)"/>
            <Ellipse cx="100" cy="100" rx="80" ry="30"
              fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2"
              transform="rotate(120, 100, 100)"/>
            <Circle cx="100" cy="100" r="8" fill="rgba(255,255,255,0.6)"/>
          </Svg>

          {/* Top row: greeting + gear */}
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerDay}>{dayName} · Good morning</Text>
              <Text style={styles.headerGreeting}>Hi, {firstName} 👋</Text>
            </View>
            <Pressable style={styles.gearBtn} onPress={() => navigation.navigate('Settings')}>
              <Text style={{ fontSize: 18 }}>⚙️</Text>
            </Pressable>
          </View>

          {/* Glassy profile card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{inits}</Text>
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.activeTitle} numberOfLines={1}>
                {student?.activeTitle ?? 'Chemistry Student'}
              </Text>
              <Text style={styles.xpText}>
                {currentXp.toLocaleString()} XP
                {'  ·  '}
                <Text style={styles.xpTextDim}>Lifetime: {lifetimeXp.toLocaleString()}</Text>
              </Text>
              <View style={styles.xpBarTrack}>
                <LinearGradient
                  colors={[colors.gold200, colors.gold400]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.xpBarFill, { width: `${Math.min(100, (currentXp / 1000) * 100)}%` }]}
                />
              </View>
            </View>
          </View>

          {/* Stat pills */}
          <View style={styles.pillsRow}>
            <StatPill emoji="🔥" value={streak} label="day streak"/>
            <StatPill emoji="⚡" value={weeklyXp.toLocaleString()} label="this week"/>
            <StatPill emoji="🏆" value={myRank ? `#${myRank}` : '—'} label="in class"/>
          </View>
        </LinearGradient>

        {/* ── Body ── */}

        {/* Weekly goal */}
        <View style={styles.section}>
          <SectionHeader label="This week" action="See stats"/>
          <WeeklyGoalCard weekly={weekly}/>
        </View>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <View style={styles.section}>
            <SectionHeader label="Leaderboard" action="Full board"/>
            <View style={styles.leaderCard}>
              <LinearGradient
                colors={[colors.gold400, colors.gold200]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.leaderCardHeader}
              >
                <Text style={styles.leaderCardHeaderText}>Class ranking</Text>
              </LinearGradient>
              {leaderboard.slice(0, 5).map((row, i) => (
                <LeaderRow key={row.studentId ?? i} row={row} rank={i + 1}/>
              ))}
            </View>
          </View>
        )}

        {/* Earned badges */}
        {earnedBadges.length > 0 && (
          <View style={styles.section}>
            <SectionHeader label="Earned badges" action={earnedBadges.length > 0 ? `${earnedBadges.length} · See all` : undefined}/>
            <View style={styles.badgeGrid}>
              {earnedBadges.map(b => <BadgeHex key={b.id} badge={b}/>)}
            </View>
          </View>
        )}

        {/* In-progress badges */}
        {progressBadges.length > 0 && (
          <View style={styles.section}>
            <SectionHeader label="Almost there"/>
            <View style={{ gap: 8 }}>
              {progressBadges.map(b => <ProgressBadgeRow key={b.id} badge={b}/>)}
            </View>
          </View>
        )}

        {/* Menu rows */}
        <View style={[styles.section, { gap: 8 }]}>
          <Pressable style={styles.menuRow} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.menuRowLabel}>⚙️  Weekly goal settings</Text>
            <Text style={styles.menuRowChevron}>›</Text>
          </Pressable>
          <Pressable style={[styles.menuRow, styles.logoutRow]} onPress={logout}>
            <Text style={styles.logoutLabel}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutral50 },
  statusBarFill: { height: 50, backgroundColor: colors.purple800 },
  scroll: { paddingBottom: 40 },

  // Header
  header: {
    padding: 16,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  atomDecor: {
    position: 'absolute',
    right: -40,
    top: -20,
    width: 180,
    height: 180,
    opacity: 0.10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerDay: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerGreeting: {
    fontFamily: 'Nunito_900Black',
    fontSize: 24,
    color: '#fff',
    marginTop: 2,
  },
  gearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Profile card (glassy)
  profileCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gold400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Nunito_900Black',
    fontSize: 18,
    color: '#fff',
  },
  activeTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 15,
    color: '#fff',
    marginBottom: 2,
  },
  xpText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
  },
  xpTextDim: {
    color: 'rgba(255,255,255,0.6)',
  },
  xpBarTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.22)',
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 999,
  },

  // Stat pills (dark)
  pillsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statPillEmoji: { fontSize: 16 },
  statPillValue: {
    fontFamily: 'Nunito_900Black',
    fontSize: 14,
    color: '#fff',
    lineHeight: 16,
  },
  statPillLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.7)',
  },

  // Section
  section: {
    paddingHorizontal: 14,
    paddingTop: 16,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: colors.neutral600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionAction: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
    color: colors.purple600,
  },

  // Weekly goal card
  goalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.neutral100,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  goalCardInner: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  goalDonutWrap: { alignItems: 'center', justifyContent: 'center' },
  goalDonutOverlay: {
    position: 'absolute',
    alignItems: 'center',
  },
  goalDonutPct: {
    fontFamily: 'Nunito_900Black',
    fontSize: 14,
    color: colors.purple600,
    lineHeight: 16,
  },
  goalDonutSub: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 9,
    color: colors.neutral600,
  },
  goalStats: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  goalStat: { width: '45%' },
  goalStatVal: {
    fontFamily: 'Nunito_900Black',
    fontSize: 16,
    lineHeight: 18,
  },
  goalStatLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 10,
    color: colors.neutral600,
  },
  perfectRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.neutral100,
  },
  perfectText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: colors.gold600,
  },

  // Leaderboard card
  leaderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.neutral100,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  leaderCardHeader: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  leaderCardHeaderText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: colors.neutral900,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.neutral100,
  },
  leaderRowYou: { backgroundColor: colors.purple50 },
  leaderRank: {
    fontFamily: 'Nunito_900Black',
    fontSize: 13,
    color: colors.neutral600,
    width: 28,
    textAlign: 'center',
  },
  leaderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderAvatarText: {
    fontFamily: 'Nunito_900Black',
    fontSize: 12,
  },
  leaderName: {
    flex: 1,
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: colors.neutral800,
  },
  leaderNameYou: {
    color: colors.purple800,
    fontFamily: 'Nunito_900Black',
  },
  youPill: {
    fontFamily: 'Nunito_900Black',
    fontSize: 10,
    color: colors.purple600,
  },
  leaderRight: { alignItems: 'flex-end' },
  leaderXp: {
    fontFamily: 'Nunito_900Black',
    fontSize: 13,
    color: colors.neutral900,
  },
  leaderXpLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 9,
    color: colors.neutral600,
  },

  // Badge grid
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeItem: {
    width: '22%',
    alignItems: 'center',
    gap: 4,
  },
  badgeIconBox: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIconText: { fontSize: 26 },
  badgeName: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 9,
    color: colors.neutral600,
    textAlign: 'center',
  },

  // In-progress badges
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.neutral100,
    padding: 12,
    gap: 12,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  progressIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.purple50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: colors.neutral800,
  },
  progressCount: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11,
    color: colors.neutral600,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.neutral100,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.purple400,
  },

  // Menu rows
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  logoutRow: {
    borderColor: colors.coral400,
    backgroundColor: colors.coral50,
    justifyContent: 'center',
  },
  menuRowLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.neutral900,
  },
  menuRowChevron: {
    fontSize: 20,
    color: colors.neutral400,
  },
  logoutLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.coral600,
  },
});
