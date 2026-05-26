import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle, Ellipse, Polygon,
  Defs, LinearGradient as SvgGrad, Stop,
} from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { getItem } from '../../lib/storage';
import { colors } from '../../theme';
import { ScreenSurface } from '../../components/base';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

const BADGE_THEMES = {
  coral:  { grad0: colors.coral400,  grad1: '#A03000',       accent: colors.coral600  },
  gold:   { grad0: colors.gold200,   grad1: colors.gold600,  accent: colors.gold400   },
  purple: { grad0: colors.purple400, grad1: colors.purple800, accent: colors.purple600 },
  teal:   { grad0: colors.teal400,   grad1: colors.teal600,  accent: colors.teal600   },
};

function resolveBadgeTheme(hexColor) {
  if (!hexColor) return BADGE_THEMES.purple;
  const h = hexColor.toLowerCase();
  if (/^#ff[678a]|^#d6|^#e5|^#b0/.test(h)) return BADGE_THEMES.coral;
  if (/^#ffd|^#ffc|^#c0/.test(h)) return BADGE_THEMES.gold;
  if (/^#26|^#00/.test(h)) return BADGE_THEMES.teal;
  return BADGE_THEMES.purple;
}

function badgeDesc(studentBadge) {
  const type = studentBadge.badge?.criteriaType;
  const amount = studentBadge.badge?.criteriaAmount;
  if (type === 'STREAK_DAYS') return `Keep a ${amount}-day streak`;
  return '';
}

// ─── DonutChart — gradient stroke ─────────────────────────────────────────────
function DonutChart({ progress = 0, size = 72, stroke = 8 }) {
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(1, Math.max(0, progress));
  const dash = filled * circ;
  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgGrad id="donut-grad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.purple400}/>
          <Stop offset="1" stopColor={colors.gold400}/>
        </SvgGrad>
      </Defs>
      <Circle cx={c} cy={c} r={r} fill="none" stroke={colors.neutral100} strokeWidth={stroke}/>
      <Circle cx={c} cy={c} r={r} fill="none"
        stroke="url(#donut-grad)" strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        rotation={-90} originX={c} originY={c}
      />
    </Svg>
  );
}

// ─── WeeklyGoalCard ───────────────────────────────────────────────────────────
function MiniStat({ value, label }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatVal}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function WeeklyGoalCard({ weekly }) {
  const goal    = weekly?.weeklyMinuteGoal ?? 60;
  const done    = weekly?.minutesActive ?? 0;
  const progress = goal > 0 ? done / goal : 0;
  const accuracy = weekly ? Math.round(weekly.percentCorrect ?? 0) : 0;
  const perfect  = weekly?.perfectQuizzes ?? 0;

  return (
    <View style={styles.weeklyCard}>
      {/* Donut */}
      <View style={styles.weeklyDonutWrap}>
        <DonutChart progress={progress} size={72} stroke={8}/>
        <View style={StyleSheet.absoluteFill}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={styles.weeklyPct}>{Math.round(progress * 100)}%</Text>
          </View>
        </View>
      </View>

      {/* Right side */}
      <View style={styles.weeklyRight}>
        <Text style={styles.weeklyTitle}>Weekly goal</Text>
        <Text style={styles.weeklySubtitle}>{done} of {goal} minutes</Text>
        <View style={styles.weeklyMiniRow}>
          <MiniStat value={perfect} label="perfect"/>
          <MiniStat value={`${accuracy}%`} label="accuracy"/>
        </View>
      </View>
    </View>
  );
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
const RANK_COLORS = [colors.gold600, '#8AA1B5', '#B47840'];

function LeaderRow({ row, rank, last }) {
  const isYou    = row.isYou;
  const rankColor = rank <= 3 ? RANK_COLORS[rank - 1] : colors.neutral600;
  const xp       = (row.xp ?? row.currentPoints ?? 0).toLocaleString();
  const inits    = row.initials ?? initials(row.name ?? '');
  const avatarBg = isYou ? colors.purple600 : colors.neutral200;
  const delta    = row.delta ?? 0;

  return (
    <View style={[styles.leaderRow, isYou && styles.leaderRowYou, last && styles.leaderRowLast]}>
      {isYou && <View style={styles.leaderYouBar}/>}
      <Text style={[styles.leaderRank, { color: rankColor }]}>{rank}</Text>
      <View style={[styles.leaderAvatar, { backgroundColor: avatarBg }]}>
        <Text style={[styles.leaderInitials, { color: isYou ? '#fff' : colors.neutral600 }]}>{inits}</Text>
      </View>
      <View style={styles.leaderInfo}>
        <View style={styles.leaderNameRow}>
          <Text style={[styles.leaderName, isYou && styles.leaderNameYou]} numberOfLines={1}>
            {row.name ?? ''}
          </Text>
          {isYou && (
            <View style={styles.youPill}>
              <Text style={styles.youPillText}>YOU</Text>
            </View>
          )}
        </View>
        <View style={styles.leaderXpRow}>
          <Text style={styles.leaderBolt}>⚡</Text>
          <Text style={styles.leaderXpText}>{xp} XP</Text>
        </View>
      </View>
      {delta !== 0 && (
        <Text style={{ color: delta > 0 ? colors.green600 : colors.coral600, fontFamily: 'Nunito_800ExtraBold', fontSize: 11 }}>
          {delta > 0 ? '↑' : '↓'}{Math.abs(delta)}
        </Text>
      )}
    </View>
  );
}

function LeaderboardCard({ rows, sectionLabel }) {
  return (
    <View style={styles.leaderCard}>
      <LinearGradient
        colors={[colors.gold400, '#FFD966']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.leaderHeader}
      >
        <View style={styles.leaderHeaderLeft}>
          <Text style={{ fontSize: 15 }}>🏆</Text>
          <Text style={styles.leaderHeaderTitle}>{sectionLabel}</Text>
        </View>
        <View style={styles.leaderWeekPill}>
          <Text style={styles.leaderWeekPillText}>This week</Text>
        </View>
      </LinearGradient>
      {rows.slice(0, 5).map((row, i) => (
        <LeaderRow
          key={row.studentId ?? i}
          row={row}
          rank={i + 1}
          last={i === Math.min(4, rows.length - 1)}
        />
      ))}
    </View>
  );
}

// ─── BadgeHex ─────────────────────────────────────────────────────────────────
function BadgeHex({ studentBadge, size = 60, locked = false }) {
  const theme  = resolveBadgeTheme(studentBadge.badge?.color);
  const icon   = studentBadge.badge?.icon ?? '🎖️';
  const gradId = `bg${(studentBadge.badgeId ?? studentBadge.id ?? 'x').slice(-6)}`;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Defs>
          <SvgGrad id={gradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={locked ? colors.neutral200 : theme.grad0}/>
            <Stop offset="1" stopColor={locked ? colors.neutral400 : theme.grad1}/>
          </SvgGrad>
        </Defs>
        {/* Outer accent ring */}
        <Polygon
          points="32,2 58,17 58,47 32,62 6,47 6,17"
          fill={locked ? colors.neutral300 : theme.accent}
        />
        {/* Inner gradient fill */}
        <Polygon
          points="32,7 54,20 54,44 32,57 10,44 10,20"
          fill={`url(#${gradId})`}
        />
      </Svg>

      {/* Emoji overlay */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingTop: 2 }]}>
        <Text style={{ fontSize: size * 0.38, opacity: locked ? 0.4 : 1 }}>{icon}</Text>
      </View>

      {/* Lock badge */}
      {locked && (
        <View style={[styles.lockBadge, { position: 'absolute', bottom: 0, right: 0 }]}>
          <Text style={{ fontSize: 8, color: '#fff' }}>🔒</Text>
        </View>
      )}
    </View>
  );
}

// ─── EarnedBadgesGrid ────────────────────────────────────────────────────────
function EarnedBadgesGrid({ badges }) {
  return (
    <View style={styles.badgesCard}>
      <View style={styles.badgesGrid}>
        {badges.map(b => (
          <View key={b.id} style={styles.badgeCell}>
            <BadgeHex studentBadge={b} size={60}/>
            <Text style={styles.badgeCellName} numberOfLines={2}>{b.badge?.name ?? ''}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── ProgressBadgeRow ────────────────────────────────────────────────────────
function ProgressBadgeRow({ badge, activeStreak }) {
  const goal     = badge.badge?.criteriaAmount ?? 0;
  const progress = badge.badge?.criteriaType === 'STREAK_DAYS'
    ? (activeStreak ?? badge.progress ?? 0)
    : (badge.progress ?? 0);
  const pct      = goal > 0 ? Math.min(1, progress / goal) : 0;
  const xpReward = badge.badge?.xpReward ?? 0;
  const theme    = resolveBadgeTheme(badge.badge?.color);
  const ready    = progress >= goal;
  const desc     = badgeDesc(badge);

  return (
    <View style={[styles.progressCard, ready && { borderColor: theme.accent }]}>
      <BadgeHex studentBadge={badge} size={52} locked={!ready}/>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={styles.progressTop}>
          <Text style={styles.progressName} numberOfLines={1}>{badge.badge?.name ?? ''}</Text>
          {xpReward > 0 && (
            <View style={[styles.xpPill, {
              backgroundColor: theme.accent + '22',
              borderColor: theme.accent + '88',
            }]}>
              <Text style={[styles.xpPillText, { color: theme.accent }]}>+{xpReward} XP</Text>
            </View>
          )}
        </View>
        {!!desc && <Text style={styles.progressDesc}>{desc}</Text>}
        <View style={styles.progressBarRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: theme.accent }]}/>
          </View>
          <Text style={styles.progressCount}>{progress}/{goal}</Text>
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

// ─── StatPill (header) ───────────────────────────────────────────────────────
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

// ─── ProfileScreen ────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, token, logout } = useAuth();
  const [student, setStudent]         = useState(null);
  const [badges, setBadges]           = useState([]);
  const [weekly, setWeekly]           = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [refreshing, setRefreshing]   = useState(false);
  const [activeClassId, setActiveClassId] = useState(null);

  // Re-read active class whenever this tab gains focus
  useFocusEffect(useCallback(() => {
    getItem('active_class_id').then(id => setActiveClassId(id ?? null));
  }, []));

  const load = useCallback(async () => {
    try {
      const [me, badgeData, storedClassId] = await Promise.all([
        api.get('/students/me', token),
        api.get('/students/me/badges', token).catch(() => []),
        getItem('active_class_id'),
      ]);
      setStudent(me);
      setBadges(Array.isArray(badgeData) ? badgeData : []);
      if (storedClassId) setActiveClassId(storedClassId);

      const enrollments = me?.enrollments ?? [];
      const enrollment = storedClassId
        ? (enrollments.find(e => e.courseClassId === storedClassId) ?? enrollments[0])
        : enrollments[0];

      if (enrollment?.courseClassId) {
        const courseId = enrollment.courseClass?.courseId;
        const classId  = enrollment.courseClassId;
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

  const enrollment = activeClassId
    ? (student?.enrollments?.find(e => e.courseClassId === activeClassId) ?? student?.enrollments?.[0])
    : student?.enrollments?.[0];
  const streak       = enrollment?.streak ?? 0;
  const weeklyXp     = weekly?.xpEarned ?? 0;
  const myRank       = leaderboard.findIndex(r => r.isYou) + 1 || null;
  const inits        = initials(student?.name ?? user?.name ?? '');
  const currentXp    = enrollment?.currentPoints ?? 0;
  const lifetimeXp   = enrollment?.lifetimePoints ?? 0;
  const firstName    = (student?.name ?? user?.name ?? 'Student').split(' ')[0];
  const dayName      = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const sectionLabel = enrollment?.courseClass?.sectionNumber
    ? `Section ${enrollment.courseClass.sectionNumber}`
    : 'Your class';

  const earnedBadges   = badges.filter(b => b.dateAchieved);
  const progressBadges = badges.filter(b => !b.dateAchieved && b.badge?.criteriaAmount);

  return (
    <ScreenSurface>
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
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
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

          {/* Greeting row */}
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerDay}>
                {dayName.toUpperCase()} · GOOD MORNING
              </Text>
              <Text style={styles.headerGreeting}>Hi, {firstName} 👋</Text>
            </View>
            <Pressable style={styles.gearBtn} onPress={() => navigation.navigate('Settings')}>
              <Text style={{ fontSize: 18 }}>⚙️</Text>
            </Pressable>
          </View>

          {/* Glassy profile card */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{inits}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.activeTitle} numberOfLines={1}>
                {student?.activeTitle ?? 'Chemistry Student'}
              </Text>
              <View style={styles.xpRow}>
                <Text style={styles.xpText}>
                  {currentXp.toLocaleString()} / {lifetimeXp.toLocaleString()} XP
                </Text>
                <Text style={styles.xpNextText}>
                  {'  ·  '}Lifetime: {lifetimeXp.toLocaleString()}
                </Text>
              </View>
              <View style={styles.xpBarTrack}>
                <LinearGradient
                  colors={[colors.gold200, colors.gold400]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.xpBarFill, { width: `${Math.min(100, (currentXp / Math.max(lifetimeXp, 1)) * 100)}%` }]}
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

        {/* ── THIS WEEK ── */}
        <View style={styles.section}>
          <SectionHeader label="This week"/>
          <WeeklyGoalCard weekly={weekly}/>
        </View>

        {/* ── LEADERBOARD ── */}
        {leaderboard.length > 0 && (
          <View style={styles.section}>
            <SectionHeader label="Leaderboard"/>
            <LeaderboardCard rows={leaderboard} sectionLabel={sectionLabel}/>
          </View>
        )}

        {/* ── EARNED BADGES ── */}
        {earnedBadges.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              label="Earned badges"
              action={earnedBadges.length > 0 ? `${earnedBadges.length} · See all` : undefined}
            />
            <EarnedBadgesGrid badges={earnedBadges}/>
          </View>
        )}

        {/* ── ALMOST THERE ── */}
        {progressBadges.length > 0 && (
          <View style={styles.section}>
            <SectionHeader label="Almost there"/>
            <View style={{ gap: 8 }}>
              {progressBadges.map(b => <ProgressBadgeRow key={b.id} badge={b} activeStreak={enrollment?.streak}/>)}
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenSurface>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
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
    position: 'absolute', right: -40, top: -20,
    width: 180, height: 180, opacity: 0.10,
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  headerDay: {
    fontFamily: 'Nunito_700Bold', fontSize: 11,
    color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8,
  },
  headerGreeting: {
    fontFamily: 'Nunito_900Black', fontSize: 24,
    color: '#fff', marginTop: 2,
  },
  gearBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Profile card (glassy)
  profileCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16, padding: 12, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.gold400,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontFamily: 'Nunito_900Black', fontSize: 18, color: '#fff' },
  activeTitle: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: '#fff', marginBottom: 2,
  },
  xpRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  xpText: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: 'rgba(255,255,255,0.9)' },
  xpNextText: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: 'rgba(255,255,255,0.55)' },
  xpBarTrack: {
    height: 7, borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.22)', overflow: 'hidden',
  },
  xpBarFill: { height: '100%', borderRadius: 999 },

  // Stat pills
  pillsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statPill: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10, padding: 8, paddingHorizontal: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  statPillEmoji: { fontSize: 14 },
  statPillValue: { fontFamily: 'Nunito_900Black', fontSize: 14, color: '#fff', lineHeight: 16 },
  statPillLabel: { fontFamily: 'Outfit_500Medium', fontSize: 9.5, color: 'rgba(255,255,255,0.7)' },

  // Section
  section: { paddingHorizontal: 14, paddingTop: 16, gap: 10 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
  },
  sectionLabel: {
    fontFamily: 'Nunito_700Bold', fontSize: 11,
    color: colors.neutral600, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  sectionAction: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 12, color: colors.purple600,
  },

  // Weekly goal card
  weeklyCard: {
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: colors.neutral200,
    borderRadius: 16,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
    padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  weeklyDonutWrap: { width: 72, height: 72, position: 'relative', flexShrink: 0 },
  weeklyPct: {
    fontFamily: 'Nunito_900Black', fontSize: 17,
    color: colors.purple800, lineHeight: 19,
  },
  weeklyRight: { flex: 1 },
  weeklyTitle: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: colors.neutral900,
  },
  weeklySubtitle: {
    fontFamily: 'Outfit_500Medium', fontSize: 11, color: colors.neutral600, marginBottom: 8,
  },
  weeklyMiniRow: { flexDirection: 'row', gap: 6 },
  miniStat: {
    flex: 1, backgroundColor: colors.neutral50,
    borderRadius: 6, padding: 5, paddingHorizontal: 8,
  },
  miniStatVal: {
    fontFamily: 'Nunito_900Black', fontSize: 14,
    color: colors.purple800, lineHeight: 16,
  },
  miniStatLabel: {
    fontFamily: 'Outfit_500Medium', fontSize: 10, color: colors.neutral600, marginTop: 1,
  },

  // Leaderboard
  leaderCard: {
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: colors.neutral200,
    borderRadius: 16, overflow: 'hidden',
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  leaderHeader: { padding: 10, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leaderHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  leaderHeaderTitle: { fontFamily: 'Nunito_900Black', fontSize: 13, color: colors.neutral900 },
  leaderWeekPill: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999,
  },
  leaderWeekPillText: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.gold800 },
  leaderRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
    borderTopWidth: 1, borderTopColor: colors.neutral100,
    position: 'relative',
  },
  leaderRowYou: { backgroundColor: colors.purple50 },
  leaderRowLast: {},
  leaderYouBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 4, backgroundColor: colors.purple400,
  },
  leaderRank: {
    fontFamily: 'Nunito_900Black', fontSize: 15,
    width: 24, textAlign: 'center', lineHeight: 18,
  },
  leaderAvatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  leaderInitials: { fontFamily: 'Nunito_900Black', fontSize: 12 },
  leaderInfo: { flex: 1, minWidth: 0 },
  leaderNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leaderName: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: colors.neutral900,
  },
  leaderNameYou: { color: colors.purple800 },
  youPill: {
    backgroundColor: colors.purple400,
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999,
  },
  youPillText: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 9,
    color: '#fff', letterSpacing: 0.5,
  },
  leaderXpRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  leaderBolt: { fontSize: 10 },
  leaderXpText: {
    fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.neutral600,
  },

  // Badge hex grid
  badgesCard: {
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: colors.neutral200,
    borderRadius: 16, padding: 14,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeCell: { width: '22%', alignItems: 'center', gap: 5 },
  badgeCellName: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 10,
    color: colors.neutral800, textAlign: 'center', lineHeight: 13,
  },

  // Lock badge overlay
  lockBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.neutral800,
    borderWidth: 2, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },

  // Progress badge row
  progressCard: {
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: colors.neutral200,
    borderRadius: 16, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  progressTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressName: { fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: colors.neutral900, flex: 1 },
  xpPill: {
    borderWidth: 1, borderRadius: 999,
    paddingVertical: 2, paddingHorizontal: 7, flexShrink: 0,
  },
  xpPillText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 9.5, letterSpacing: 0.3 },
  progressDesc: { fontFamily: 'Outfit_500Medium', fontSize: 11, color: colors.neutral600 },
  progressBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: {
    flex: 1, height: 6, borderRadius: 999,
    backgroundColor: colors.neutral100, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999 },
  progressCount: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 11,
    color: colors.neutral600, minWidth: 32, textAlign: 'right',
  },

  // Menu
  menuRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.neutral200,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  logoutRow: { borderColor: colors.coral400, backgroundColor: colors.coral50, justifyContent: 'center' },
  menuLabel: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.neutral900 },
  menuChevron: { fontSize: 20, color: colors.neutral400 },
  logoutLabel: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.coral600 },
});
