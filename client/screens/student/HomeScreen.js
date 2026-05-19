import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { ScreenSurface, StreakBadge, XpBadge } from '../../components/base';
import ChapterBanner from '../../components/ChapterBanner';
import SectionNode from '../../components/SectionNode';
import BottomSheet from '../../components/BottomSheet';
import ShadowButton from '../../components/base/ShadowButton';
import { colors, typeScale, screenPadding } from '../../theme';

const CHAPTER_THEMES = ['purple', 'teal', 'coral', 'gold'];

function PathLine() {
  return <View style={styles.pathLine} />;
}

export default function HomeScreen({ navigation, route }) {
  const { token } = useAuth();
  const courseId = route?.params?.courseId;

  const [courseName, setCourseName] = useState('');
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
    navigation.navigate('StudentSection', { sectionId: sheetSection.id });
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
                      {si > 0 && <PathLine />}
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
    paddingVertical: 16,
    paddingHorizontal: screenPadding.horizontal,
    alignItems: 'center',
  },
  pathLine: {
    width: 3,
    height: 28,
    backgroundColor: colors.neutral200,
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 2,
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
