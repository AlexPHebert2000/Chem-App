import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
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
  // Cubic bezier: control points pulled to the opposite side for the S shape
  const d = `M ${x1} 0 C ${x1} ${CONNECTOR_H * 0.5}, ${x2} ${CONNECTOR_H * 0.5}, ${x2} ${CONNECTOR_H}`;
  return (
    <Svg width="100%" height={CONNECTOR_H} viewBox={`0 0 ${CONNECTOR_W} ${CONNECTOR_H}`} preserveAspectRatio="none">
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

export default function HomeScreen({ navigation, route }) {
  const { token } = useAuth();
  const courseId = route?.params?.courseId;

  const [courseName, setCourseName] = useState('');
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [completedIds, setCompletedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetSection, setSheetSection] = useState(null);

  const load = useCallback(async () => {
    try {
      const [me, courses] = await Promise.all([
        api.get('/students/me', token),
        api.get('/courses', token),
      ]);

      const enroll = me.enrollments?.[0];
      setEnrollment(enroll);

      const cid = courseId ?? enroll?.courseClass?.courseId;
      if (!cid) return;
      setActiveCourseId(cid);

      const enrolled = courses?.find(c => c.id === cid) ?? courses?.[0];
      setCourseName(enrolled?.name ?? '');

      const chaptersData = await api.get(`/courses/${cid}/chapters`, token);
      setChapters(chaptersData ?? []);

      // Completion data is embedded in the chapters response — no separate call needed
      const ids = new Set();
      (chaptersData ?? []).forEach(ch =>
        (ch.sections ?? []).forEach(s => { if (s.completed) ids.add(s.id); })
      );
      setCompletedIds(ids);
    } catch (e) {
      console.warn('HomeScreen load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, courseId]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

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

  return (
    <ScreenSurface>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          {!!courseName && (
            <Text style={styles.headerTitle} numberOfLines={1}>{courseName}</Text>
          )}
        </View>
        <View style={styles.headerPills}>
          <StreakBadge streak={enrollment?.streak ?? 0} />
          <XpBadge xp={enrollment?.currentPoints ?? 0} />
        </View>
      </View>

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
                    <View key={section.id}>
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
  headerTitle: {
    ...typeScale.h2,
    color: colors.neutral900,
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
