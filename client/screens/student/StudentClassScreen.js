import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Ellipse, Circle, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { colors, typeScale, screenPadding } from '../../theme';

// Cycling avatar colors — assigned by rank so they're stable
const AVATAR_COLORS = [
  colors.coral400, colors.blue400, colors.purple400,
  colors.teal400, colors.gold400, colors.green400,
];
const avatarColor = (rank) => AVATAR_COLORS[(rank - 1) % AVATAR_COLORS.length];

const initials = (name = '') =>
  name.split(' ').slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase() || '?';

// ─── Medal config ─────────────────────────────────────────────────────────────
const MEDALS = {
  1: { ring: colors.gold400,  deep: colors.gold600,  label: 'CHAMP', size: 76 },
  2: { ring: '#C8CFDB',        deep: '#8AA1B5',        label: '2ND',   size: 60 },
  3: { ring: '#D9A172',        deep: '#B47840',        label: '3RD',   size: 60 },
};

// ─── Atom orbit SVG (decorative) ─────────────────────────────────────────────
function AtomOrbit() {
  return (
    <Svg viewBox="0 0 200 200" width={200} height={200} style={styles.atomSvg}>
      <Ellipse cx="100" cy="100" rx="80" ry="30" fill="none" stroke="#fff" strokeWidth="2"/>
      <Ellipse cx="100" cy="100" rx="80" ry="30" fill="none" stroke="#fff" strokeWidth="2" rotation="60" originX="100" originY="100"/>
      <Ellipse cx="100" cy="100" rx="80" ry="30" fill="none" stroke="#fff" strokeWidth="2" rotation="120" originX="100" originY="100"/>
      <Circle cx="100" cy="100" r="8" fill="#fff"/>
    </Svg>
  );
}

// ─── Crown SVG for 1st place ──────────────────────────────────────────────────
function Crown() {
  return (
    <Svg viewBox="0 0 24 24" width={22} height={22} style={styles.crown}>
      <Path
        d="M3 8l3 3 3-6 3 6 3-6 3 6 3-3-1.5 11h-15L3 8z"
        fill={colors.gold400}
        stroke={colors.gold600}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Podium avatar (top 3) ────────────────────────────────────────────────────
function PodiumSlot({ entry, myId }) {
  const m = MEDALS[entry.rank];
  const isFirst = entry.rank === 1;
  const isYou = entry.studentId === myId;

  return (
    <View style={[styles.podiumSlot, isFirst && styles.podiumSlotFirst]}>
      {/* crown */}
      {isFirst && <Crown />}

      <View style={{ position: 'relative' }}>
        {/* avatar */}
        <View style={[
          styles.podiumAvatar,
          {
            width: m.size, height: m.size, borderRadius: m.size / 2,
            backgroundColor: avatarColor(entry.rank),
            borderWidth: 3, borderColor: m.ring,
          },
        ]}>
          <Text style={[styles.podiumInitials, { fontSize: m.size * 0.35 }]}>
            {initials(entry.name)}
          </Text>
        </View>

        {/* rank badge */}
        <View style={[
          styles.rankBadge,
          {
            width: isFirst ? 26 : 22,
            height: isFirst ? 26 : 22,
            borderRadius: isFirst ? 13 : 11,
            backgroundColor: m.ring,
          },
        ]}>
          <Text style={[styles.rankBadgeText, { fontSize: isFirst ? 13 : 11 }]}>
            {entry.rank}
          </Text>
        </View>
      </View>

      {/* name */}
      <Text style={[styles.podiumName, isYou && { color: colors.purple600 }]} numberOfLines={1}>
        {entry.name.split(' ')[0]}
      </Text>
      {isYou && (
        <View style={styles.youPill}>
          <Text style={styles.youPillText}>YOU</Text>
        </View>
      )}

      {/* XP pill */}
      <View style={[styles.xpPill, { borderColor: m.ring }]}>
        <Ionicons name="flash" size={11} color={m.deep} />
        <Text style={[styles.xpPillText, { color: m.deep }]}>
          {entry.currentPoints.toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

// ─── Compact row (rank 4+) ────────────────────────────────────────────────────
function LeaderRow({ entry, myId, last }) {
  const isYou = entry.studentId === myId;
  return (
    <View style={[styles.row, !last && styles.rowBorder, isYou && styles.rowYou]}>
      {isYou && <View style={styles.youBar} />}
      <Text style={styles.rowRank}>{entry.rank}</Text>
      <View style={[
        styles.rowAvatar,
        { backgroundColor: avatarColor(entry.rank) },
      ]}>
        <Text style={styles.rowInitials}>{initials(entry.name)}</Text>
      </View>
      <View style={styles.rowNameWrap}>
        <Text style={[styles.rowName, isYou && { color: colors.purple800 }]} numberOfLines={1}>
          {entry.name}
        </Text>
        {isYou && (
          <View style={styles.youPill}>
            <Text style={styles.youPillText}>YOU</Text>
          </View>
        )}
      </View>
      <View style={styles.rowXp}>
        <Ionicons name="flash" size={11} color={colors.gold600} />
        <Text style={styles.rowXpText}>{entry.currentPoints.toLocaleString()}</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function StudentClassScreen() {
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();

  const [courseName, setCourseName] = useState('');
  const [sectionLabel, setSectionLabel] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [myId, setMyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [me, courses] = await Promise.all([
        api.get('/students/me', token),
        api.get('/courses', token),
      ]);

      setMyId(me.id);

      const enroll = me.enrollments?.[0];
      const courseId = enroll?.courseClass?.courseId;
      const classId = enroll?.courseClassId;
      const section = enroll?.courseClass?.sectionNumber;

      const enrolled = courses?.find(c => c.id === courseId) ?? courses?.[0];
      setCourseName(enrolled?.name ?? '');
      if (section) setSectionLabel(`Section ${section}`);

      if (!courseId || !classId) return;

      const board = await api.get(`/courses/${courseId}/classes/${classId}/leaderboard`, token);
      setLeaderboard(board ?? []);
    } catch (e) {
      console.warn('StudentClassScreen load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  // Podium render order: 2nd | 1st | 3rd
  const podiumOrder = [
    top3.find(r => r.rank === 2),
    top3.find(r => r.rank === 1),
    top3.find(r => r.rank === 3),
  ].filter(Boolean);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purple400} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero inside scroll so the card can overlap it in the same stacking context */}
        <LinearGradient
          colors={[colors.purple800, colors.purple600]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 16 }]}
        >
          <AtomOrbit />
          <Text style={styles.heroLabel}>Leaderboard</Text>
          <Text style={styles.heroTitle}>{courseName || 'Your Class'}</Text>
          {!!sectionLabel && (
            <View style={styles.heroMeta}>
              <Ionicons name="person" size={12} color="rgba(255,255,255,0.85)" />
              <Text style={styles.heroMetaText}>
                {sectionLabel} · {leaderboard.length} students
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Overlapping white card */}
        <View style={styles.card}>
          {loading ? (
            <ActivityIndicator color={colors.purple400} style={{ padding: 40 }} />
          ) : (
            <>
              {/* Podium */}
              {podiumOrder.length > 0 && (
                <View style={styles.podium}>
                  {podiumOrder.map(entry => (
                    <PodiumSlot key={entry.rank} entry={entry} myId={myId} />
                  ))}
                </View>
              )}

              {/* Divider */}
              {rest.length > 0 && (
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerLabel}>RANKED 4 – {leaderboard.length}</Text>
                  <View style={styles.dividerLine} />
                </View>
              )}

              {/* Rest of leaderboard */}
              {rest.map((entry, i) => (
                <LeaderRow
                  key={entry.studentId}
                  entry={entry}
                  myId={myId}
                  last={i === rest.length - 1}
                />
              ))}

              {leaderboard.length === 0 && (
                <Text style={styles.empty}>No students yet.</Text>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.neutral50,
  },

  // Hero
  hero: {
    paddingHorizontal: screenPadding.horizontal,
    paddingBottom: 72,
    position: 'relative',
    overflow: 'hidden',
  },
  atomSvg: {
    position: 'absolute',
    right: -40,
    top: -30,
    opacity: 0.10,
  },
  heroLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  heroTitle: {
    fontFamily: 'Nunito_900Black',
    fontSize: 22,
    color: '#fff',
    lineHeight: 27,
    letterSpacing: -0.3,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  heroMetaText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.85)',
  },

  // Scroll
  scroll: {
    paddingBottom: 32,
  },

  // Card
  card: {
    marginHorizontal: 14,
    marginTop: -52,
    zIndex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.neutral100,
    paddingBottom: 8,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
    overflow: 'show',
  },

  // Podium
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingTop: 15,
    paddingBottom: 8,
    gap: 8,
  },
  podiumSlot: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingBottom: 4,
  },
  podiumSlotFirst: {
    transform: [{ translateY: -12 }],
  },
  podiumAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  podiumInitials: {
    fontFamily: 'Nunito_900Black',
    color: '#fff',
    letterSpacing: 0.5,
  },
  rankBadge: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  rankBadgeText: {
    fontFamily: 'Nunito_900Black',
    color: colors.neutral900,
    lineHeight: 14,
  },
  crown: {
    position: 'absolute',
    top: -18,
    alignSelf: 'center',
    transform: [{ rotate: '-6deg' }],
    zIndex: 1,
  },
  podiumName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
    color: colors.neutral900,
    textAlign: 'center',
    maxWidth: 90,
    marginTop: 8,
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  xpPillText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
  },

  // YOU pill
  youPill: {
    backgroundColor: colors.purple400,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  youPillText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 9,
    color: '#fff',
    letterSpacing: 0.5,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.neutral100,
  },
  dividerLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    color: colors.neutral600,
    letterSpacing: 1.2,
  },

  // Compact row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    position: 'relative',
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral100,
  },
  rowYou: {
    backgroundColor: colors.purple50,
  },
  youBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.purple400,
  },
  rowRank: {
    fontFamily: 'Nunito_900Black',
    fontSize: 14,
    color: colors.neutral600,
    width: 28,
    textAlign: 'center',
  },
  rowAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  rowInitials: {
    fontFamily: 'Nunito_900Black',
    fontSize: 12,
    color: '#fff',
    letterSpacing: 0.3,
  },
  rowNameWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  rowName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13.5,
    color: colors.neutral900,
    flexShrink: 1,
  },
  rowXp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowXpText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12.5,
    color: colors.neutral800,
  },

  // Footer / empty
  footer: {
    textAlign: 'center',
    fontFamily: 'Outfit_500Medium',
    fontSize: 11.5,
    color: colors.neutral600,
    paddingTop: 18,
    paddingBottom: 8,
  },
  empty: {
    ...typeScale.body,
    color: colors.neutral400,
    textAlign: 'center',
    paddingVertical: 32,
  },
});
