import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  Pressable, Modal, Animated, TouchableWithoutFeedback,
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
function ClassSheet({ visible, enrollments, activeClassId, onSwitch, onClose }) {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 400, duration: 220, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 0,   duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[cs.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>
      <Animated.View style={[cs.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={cs.grabber} />
        <Text style={cs.sheetTitle}>My Classes</Text>
        <View style={cs.divider} />
        {enrollments.map((enroll, i) => {
          const isActive = enroll.courseClassId === activeClassId;
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
                <StreakBadge streak={enroll.streak ?? 0} small />
                <XpBadge xp={enroll.currentPoints ?? 0} small />
              </View>
            </Pressable>
          );
        })}
        <View style={{ height: 24 }} />
      </Animated.View>
    </Modal>
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
  const [chapters,        setChapters]        = useState([]);
  const [completedIds,    setCompletedIds]    = useState(new Set());
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [sheetSection,    setSheetSection]    = useState(null);
  const [coursesCache,    setCoursesCache]    = useState([]);

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
        api.get('/courses', token),
      ]);
      setCoursesCache(courses ?? []);

      const enrollments = me.enrollments ?? [];
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

  return (
    <ScreenSurface>
      <Pressable
        style={styles.header}
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
      />
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
});

// ─── ClassSheet styles ─────────────────────────────────────────────────────────
const cs = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 12,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral200,
    marginBottom: 16,
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
});
