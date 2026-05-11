import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, typeScale, spacing, radius, screenPadding } from '../../theme';

export default function CourseScreen() {
  const { token }  = useAuth();
  const navigation = useNavigation();
  const { courseId, courseName } = useRoute().params;

  const [chapters, setChapters] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    setError(null);
    api.get(`/courses/${courseId}/chapters`, token)
      .then(setChapters)
      .catch(e => setError(e.message || 'Could not load chapters'))
      .finally(() => setLoading(false));
  }, [courseId, token]));

  const totalSections    = chapters.reduce((s, ch) => s + ch.sections.length, 0);
  const completedSections = chapters.reduce((s, ch) => s + ch.sections.filter(sec => sec.completed).length, 0);
  const pct = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

  return (
    <View style={styles.container}>
      <ScreenHeader title={courseName} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.purple400} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Progress bar */}
          {totalSections > 0 && (
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Course Progress</Text>
                <Text style={styles.progressPct}>{pct}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.progressSub}>{completedSections} of {totalSections} sections complete</Text>
            </View>
          )}

          {chapters.map(chapter => (
            <View key={chapter.id} style={styles.chapter}>
              <Text style={styles.chapterName}>{chapter.name}</Text>
              {chapter.description ? (
                <Text style={styles.chapterDesc}>{chapter.description}</Text>
              ) : null}

              {chapter.sections.map(sec => (
                <SectionRow
                  key={sec.id}
                  section={sec}
                  onPress={() => navigation.navigate('StudentSection', {
                    sectionId: sec.id,
                    sectionName: sec.name,
                    courseId,
                  })}
                />
              ))}

              {chapter.sections.length === 0 && (
                <Text style={styles.emptyChapter}>No sections yet</Text>
              )}
            </View>
          ))}

          {chapters.length === 0 && (
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No content yet</Text>
              <Text style={styles.emptyBody}>Your teacher hasn't added any chapters.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function SectionRow({ section, onPress }) {
  const completed = section.completed;
  const score     = section.score;

  return (
    <TouchableOpacity style={styles.sectionRow} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.statusDot, completed ? styles.statusDotDone : styles.statusDotPending]} />
      <View style={styles.sectionInfo}>
        <Text style={styles.sectionName}>{section.name}</Text>
        <Text style={styles.sectionMeta}>
          {section.questionCount} question{section.questionCount !== 1 ? 's' : ''}
          {completed && score != null ? `  ·  ${score}%` : ''}
        </Text>
      </View>
      {completed ? (
        <Text style={styles.checkmark}>✓</Text>
      ) : (
        <Text style={styles.chevron}>›</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  scroll:    { paddingHorizontal: screenPadding.horizontal, paddingBottom: 40 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: screenPadding.horizontal },
  errorText:  { ...typeScale.body, color: colors.coral600, textAlign: 'center' },
  emptyTitle: { ...typeScale.h3, color: colors.purple800, marginBottom: spacing[2] },
  emptyBody:  { ...typeScale.body, color: colors.neutral600, textAlign: 'center' },

  progressCard: {
    backgroundColor: '#fff', borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.purple100,
    padding: spacing[4], marginBottom: spacing[5], marginTop: spacing[3],
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[2] },
  progressLabel:  { ...typeScale.label, color: colors.purple800 },
  progressPct:    { ...typeScale.label, color: colors.purple400 },
  progressTrack:  { height: 8, backgroundColor: colors.purple100, borderRadius: radius.full, overflow: 'hidden' },
  progressFill:   { height: '100%', backgroundColor: colors.teal400, borderRadius: radius.full },
  progressSub:    { ...typeScale.caption, color: colors.neutral500, marginTop: spacing[2] },

  chapter: { marginBottom: spacing[5] },
  chapterName: { ...typeScale.h3, color: colors.purple900, marginBottom: spacing[1], marginTop: spacing[2] },
  chapterDesc: { ...typeScale.caption, color: colors.neutral500, marginBottom: spacing[3] },
  emptyChapter: { ...typeScale.body, color: colors.neutral400, fontStyle: 'italic', paddingLeft: spacing[3] },

  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    backgroundColor: '#fff', borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.purple100,
    padding: spacing[4], marginBottom: spacing[2],
  },
  statusDot:        { width: 10, height: 10, borderRadius: 5 },
  statusDotDone:    { backgroundColor: colors.teal400 },
  statusDotPending: { backgroundColor: colors.purple200 },

  sectionInfo: { flex: 1 },
  sectionName: { ...typeScale.label, color: colors.purple900 },
  sectionMeta: { ...typeScale.caption, color: colors.neutral500, marginTop: 2 },

  checkmark: { ...typeScale.body, color: colors.teal500 ?? colors.teal400, fontWeight: 'bold' },
  chevron:   { ...typeScale.h3, color: colors.purple300 },
});
