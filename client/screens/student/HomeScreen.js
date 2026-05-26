import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  Pressable, Animated, TextInput, Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { getItem, setItem } from '../../lib/storage';
import { ScreenSurface, StreakBadge, XpBadge } from '../../components/base';
import ChapterBanner from '../../components/ChapterBanner';
import SectionNode from '../../components/SectionNode';
import BottomSheet from '../../components/BottomSheet';
import ShadowButton from '../../components/base/ShadowButton';
import { colors, typeScale, screenPadding } from '../../theme';

const CHAPTER_THEMES = ['purple', 'teal', 'coral', 'gold'];

// Must match NODE_OFFSETS in SectionNode.js so the curve starts/ends at each node center
const NODE_OFFSETS = [0, 44, -44, 28, -28, 0];
const CONNECTOR_W = 220;
const CONNECTOR_H = 72;

function PathConnector({ fromIndex, toIndex }) {
  const fromOff = NODE_OFFSETS[fromIndex % NODE_OFFSETS.length];
  const toOff   = NODE_OFFSETS[toIndex   % NODE_OFFSETS.length];
  const x1 = CONNECTOR_W / 2 + fromOff;
  const x2 = CONNECTOR_W / 2 + toOff;
  const d = `M ${x1} 0 C ${x1} ${CONNECTOR_H * 0.5}, ${x2} ${CONNECTOR_H * 0.5}, ${x2} ${CONNECTOR_H}`;
  return (
    <Svg width={CONNECTOR_W} height={CONNECTOR_H} viewBox={`0 0 ${CONNECTOR_W} ${CONNECTOR_H}`}>
      <Path
        d={d}
        fill="none"
        stroke={colors.neutral200}
        strokeWidth={3}
        strokeDasharray="6 8"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── ClassSheet ───────────────────────────────────────────────────────────────
// Renders as an absolute-positioned dropdown anchored just below the header.
// Always mounted so exit animation plays — use pointerEvents to block interaction when hidden.
function ClassSheet({ visible, enrollments, activeClassId, onSwitch, onClose, onJoinAnother, topOffset }) {
  const slideAnim  = useRef(new Animated.Value(-300)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const panelFade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: visible ? 0 : -300,
        duration: visible ? 240 : 180,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: visible ? 1 : 0,
        duration: visible ? 200 : 150,
        useNativeDriver: true,
      }),
      Animated.timing(panelFade, {
        toValue: visible ? 1 : 0,
        duration: visible ? 200 : 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  return (
    <>
      {/* Backdrop — sits below the header, dismisses on tap */}
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, { top: topOffset, opacity: fadeAnim, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 10 }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Dropdown panel — slides down from the header edge */}
      <Animated.View
        pointerEvents={visible ? 'box-none' : 'none'}
        style={[cs.sheet, { top: topOffset, opacity: panelFade, transform: [{ translateY: slideAnim }], zIndex: 11 }]}
      >
        <Text style={cs.sheetTitle}>My Classes</Text>
        <View style={cs.divider} />
        {enrollments.map((enroll, i) => {
          const isActive   = enroll.courseClassId === activeClassId;
          const sectionNum = enroll.courseClass?.sectionNumber;
          const times      = enroll.courseClass?.meetingTimes;
          const subtitle   = [sectionNum ? `Section ${sectionNum}` : null, times].filter(Boolean).join(' · ');
          return (
            <Pressable
              key={enroll.courseClassId}
              style={({ pressed }) => [cs.classRow, pressed && cs.classRowPressed, isActive && cs.classRowActive]}
              onPress={() => onSwitch(enroll)}
            >
              <View style={cs.classRowLeft}>
                <View style={[cs.dot, isActive && cs.dotActive]}>
                  {isActive && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={cs.className} numberOfLines={1}>{enroll.courseName ?? `Class ${i + 1}`}</Text>
                  {!!subtitle && <Text style={cs.classSub} numberOfLines={1}>{subtitle}</Text>}
                </View>
              </View>
              <View style={cs.classBadges}>
                <StreakBadge streak={enroll.streak ?? 0} />
                <XpBadge xp={enroll.currentPoints ?? 0} />
              </View>
            </Pressable>
          );
        })}
        <View style={cs.divider} />
        <Pressable style={cs.joinRow} onPress={onJoinAnother}>
          <Ionicons name="add-circle-outline" size={18} color={colors.purple600} />
          <Text style={cs.joinLabel}>Join another class</Text>
        </Pressable>
        <View style={{ height: 8 }} />
      </Animated.View>
    </>
  );
}

// ─── HomeScreen ────────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation, route }) {
  const { token } = useAuth();
  const courseId = route?.params?.courseId;

  const [courseName,      setCourseName]      = useState('');
  const [activeCourseId,  setActiveCourseId]  = useState(null);
  const [enrollment,      setEnrollment]      = useState(null);
  const [allEnrollments,  setAllEnrollments]  = useState([]);
  const [activeClassId,   setActiveClassId]   = useState(null);
  const [classDrawerOpen, setClassDrawerOpen] = useState(false);
  const [headerHeight,    setHeaderHeight]    = useState(0);
  const [chapters,        setChapters]        = useState([]);
  const [completedIds,    setCompletedIds]    = useState(new Set());
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [sheetSection,    setSheetSection]    = useState(null);
  const [coursesCache,    setCoursesCache]    = useState([]);
  const [joinSheetOpen,   setJoinSheetOpen]   = useState(false);
  const [joinCode,        setJoinCode]        = useState('');
  const [joining,         setJoining]         = useState(false);

  const loadChapters = useCallback(async (cid) => {
    if (!cid) return;
    const chaptersData = await api.get(`/courses/${cid}/chapters`, token);
    setChapters(chaptersData ?? []);
    const ids = new Set();
    (chaptersData ?? []).forEach(ch =>
      (ch.sections ?? []).forEach(s => { if (s.completed) ids.add(s.id); })
    );
    setCompletedIds(ids);
  }, [token]);

  const load = useCallback(async () => {
    try {
      const [me, courses] = await Promise.all([
        api.get('/students/me', token),
        api.get('/courses', token).catch(() => []),
      ]);
      setCoursesCache(courses ?? []);

      const enrollments = me.enrollments ?? [];
      console.log('[HomeScreen] enrollments from /students/me:', enrollments.length, enrollments.map(e => e.courseClassId));
      // Attach course name to each enrollment for the drawer
      const enriched = enrollments.map(e => ({
        ...e,
        courseName: courses?.find(c => c.id === e.courseClass?.courseId)?.name ?? null,
      }));
      setAllEnrollments(enriched);

      // Pick active class from storage or fall back to first enrollment
      const storedId = await getItem('active_class_id');
      const active = storedId
        ? (enriched.find(e => e.courseClassId === storedId) ?? enriched[0])
        : enriched[0];

      if (!active) return;
      setActiveClassId(active.courseClassId);
      setEnrollment(active);

      const cid = courseId ?? active.courseClass?.courseId;
      setActiveCourseId(cid);
      setCourseName(courses?.find(c => c.id === cid)?.name ?? '');

      await loadChapters(cid);
    } catch (e) {
      console.warn('HomeScreen load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, courseId, loadChapters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const switchClass = async (enroll) => {
    setClassDrawerOpen(false);
    await setItem('active_class_id', enroll.courseClassId);
    setActiveClassId(enroll.courseClassId);
    setEnrollment(enroll);
    const cid = enroll.courseClass?.courseId;
    setActiveCourseId(cid);
    setCourseName(coursesCache?.find(c => c.id === cid)?.name ?? enroll.courseName ?? '');
    await loadChapters(cid);
  };

  const getSectionStatus = (section, chapterSections) => {
    if (completedIds.has(section.id)) return 'done';
    const firstIncomplete = chapterSections.find(s => !completedIds.has(s.id));
    if (firstIncomplete?.id === section.id) return 'next';
    return 'locked';
  };

  const startSection = () => {
    if (!sheetSection) return;
    setSheetSection(null);
    navigation.navigate('StudentSection', { sectionId: sheetSection.id, courseId: activeCourseId });
  };

  const canSwitchClass = allEnrollments.length > 1;
  const isUnenrolled   = !loading && allEnrollments.length === 0;

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      await api.post('/courses/enroll-by-code', { code: joinCode.trim() }, token);
      setJoinCode('');
      setJoinSheetOpen(false);
      setClassDrawerOpen(false);
      await load();
    } catch (e) {
      Alert.alert('Could not join', e.message ?? 'Invalid class code. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <ScreenSurface>
      <Pressable
        style={styles.header}
        onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}
        onPress={canSwitchClass ? () => setClassDrawerOpen(true) : undefined}
        disabled={!canSwitchClass}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.headerTitleRow}>
            {!!courseName && (
              <Text style={styles.headerTitle} numberOfLines={1}>{courseName}</Text>
            )}
            {canSwitchClass && (
              <Ionicons name="chevron-down" size={18} color={colors.neutral600} style={{ marginLeft: 4, marginTop: 2 }} />
            )}
          </View>
          {!!enrollment?.courseClass?.sectionNumber && (
            <Text style={styles.headerSub} numberOfLines={1}>
              {`Section ${enrollment.courseClass.sectionNumber}`}
              {enrollment.courseClass?.meetingTimes ? ` · ${enrollment.courseClass.meetingTimes}` : ''}
            </Text>
          )}
        </View>
        <View style={styles.headerPills}>
          <StreakBadge streak={enrollment?.streak ?? 0} />
          <XpBadge xp={enrollment?.currentPoints ?? 0} />
        </View>
      </Pressable>

      {isUnenrolled && (
        <View style={styles.unenrolledContainer}>
          <Ionicons name="school-outline" size={48} color={colors.purple300} />
          <Text style={styles.unenrolledTitle}>Join a class</Text>
          <Text style={styles.unenrolledSub}>Enter the class code your teacher shared with you.</Text>
          <TextInput
            style={styles.codeInput}
            value={joinCode}
            onChangeText={setJoinCode}
            placeholder="e.g. AB12CD34"
            placeholderTextColor={colors.neutral400}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <ShadowButton
            label={joining ? 'Joining…' : 'Join class'}
            preset="primary"
            onPress={handleJoinByCode}
            disabled={joining || !joinCode.trim()}
            style={{ marginTop: 8, alignSelf: 'stretch' }}
          />
        </View>
      )}

      {!isUnenrolled && (
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {chapters.map((chapter, ci) => {
          const sections = chapter.sections ?? [];
          const completedInChapter = sections.filter(s => completedIds.has(s.id)).length;
          const theme = CHAPTER_THEMES[ci % CHAPTER_THEMES.length];
          const allPrevDone = ci === 0 || chapters.slice(0, ci).every(ch =>
            (ch.sections ?? []).every(s => completedIds.has(s.id))
          );

          return (
            <View key={chapter.id}>
              <ChapterBanner
                chapter={chapter}
                completedCount={completedInChapter}
                totalCount={sections.length}
                theme={theme}
                locked={!allPrevDone}
              />
              <View style={styles.nodesContainer}>
                {sections.map((section, si) => {
                  const status = allPrevDone
                    ? getSectionStatus(section, sections)
                    : 'locked';
                  return (
                    <View key={section.id} style={{ alignItems: 'center' }}>
                      {si > 0 && <PathConnector fromIndex={si - 1} toIndex={si} />}
                      <SectionNode
                        section={{ ...section, status, bestScore: section.score }}
                        theme={theme}
                        index={si}
                        onPress={s => setSheetSection({ ...s, chapterTheme: theme })}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

        {chapters.length === 0 && !loading && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No chapters yet.</Text>
          </View>
        )}
      </ScrollView>
      )}

      <BottomSheet
        visible={!!sheetSection}
        onClose={() => setSheetSection(null)}
        title={sheetSection?.name}
      >
        {sheetSection && (
          <View style={{ gap: 12, paddingTop: 4 }}>
            {!!sheetSection.description && (
              <Text style={styles.sheetSub}>{sheetSection.description}</Text>
            )}
            <Text style={styles.sheetMeta}>
              ~{sheetSection.questionCount * 2} min · {sheetSection.questionCount} questions
            </Text>
            <ShadowButton
              label={completedIds.has(sheetSection.id) ? 'Practice again' : 'Start lesson'}
              preset={completedIds.has(sheetSection.id) ? 'secondary' : 'primary'}
              onPress={startSection}
            />
          </View>
        )}
      </BottomSheet>

      <ClassSheet
        visible={classDrawerOpen}
        enrollments={allEnrollments}
        activeClassId={activeClassId}
        onSwitch={switchClass}
        onClose={() => setClassDrawerOpen(false)}
        onJoinAnother={() => { setClassDrawerOpen(false); setJoinSheetOpen(true); }}
        topOffset={headerHeight}
      />

      <BottomSheet
        visible={joinSheetOpen}
        onClose={() => { setJoinSheetOpen(false); setJoinCode(''); }}
        title="Join a class"
      >
        <View style={{ gap: 12, paddingTop: 4 }}>
          <TextInput
            style={styles.codeInput}
            value={joinCode}
            onChangeText={setJoinCode}
            placeholder="e.g. AB12CD34"
            placeholderTextColor={colors.neutral400}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <ShadowButton
            label={joining ? 'Joining…' : 'Join class'}
            preset="primary"
            onPress={handleJoinByCode}
            disabled={joining || !joinCode.trim()}
          />
        </View>
      </BottomSheet>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral200,
    gap: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    ...typeScale.h2,
    color: colors.neutral900,
  },
  headerSub: {
    ...typeScale.small,
    color: colors.neutral600,
    marginTop: 1,
  },
  headerPills: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  scroll: {
    paddingBottom: 40,
  },
  nodesContainer: {
    paddingVertical: 20,
    paddingHorizontal: screenPadding.horizontal,
    alignItems: 'center',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    ...typeScale.body,
    color: colors.neutral600,
  },
  sheetSub: {
    ...typeScale.body,
    color: colors.neutral600,
  },
  sheetMeta: {
    ...typeScale.small,
    color: colors.purple600,
    fontFamily: 'Nunito_700Bold',
  },
  unenrolledContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: screenPadding.horizontal,
    gap: 12,
  },
  unenrolledTitle: {
    ...typeScale.h1,
    color: colors.neutral900,
    marginTop: 8,
  },
  unenrolledSub: {
    ...typeScale.body,
    color: colors.neutral600,
    textAlign: 'center',
    marginBottom: 4,
  },
  codeInput: {
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: colors.neutral900,
    backgroundColor: '#FFF',
    alignSelf: 'stretch',
    letterSpacing: 2,
  },
});

// ─── ClassSheet styles ─────────────────────────────────────────────────────────
const cs = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 12,
  },
  sheetTitle: {
    ...typeScale.h3,
    color: colors.neutral900,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral200,
    marginBottom: 8,
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 10,
    gap: 12,
  },
  classRowPressed: {
    backgroundColor: colors.neutral100,
  },
  classRowActive: {
    backgroundColor: colors.purple50 ?? '#F5F3FF',
  },
  classRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.neutral200,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dotActive: {
    backgroundColor: colors.purple600,
    borderColor: colors.purple600,
  },
  className: {
    ...typeScale.body,
    color: colors.neutral900,
    fontFamily: 'Nunito_700Bold',
  },
  classSub: {
    ...typeScale.small,
    color: colors.neutral600,
    marginTop: 1,
  },
  classBadges: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  joinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  joinLabel: {
    ...typeScale.body,
    color: colors.purple600,
    fontFamily: 'Nunito_700Bold',
  },
});
