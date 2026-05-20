import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  Pressable, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { ScreenSurface } from '../../components/base';
import ClassCard from '../../components/ClassCard';
import { colors, typeScale, screenPadding, radius } from '../../theme';

// ─── Question Bank hero card ──────────────────────────────────────────────────
function QuestionBankCard({ onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.qbCard, pressed && styles.qbPressed]}>
      <LinearGradient
        colors={[colors.purple600, colors.purple800]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.qbGradient}
      >
        {/* atom watermark */}
        <Svg viewBox="0 0 100 100" width={110} height={110} style={styles.qbAtom}>
          <Ellipse cx="50" cy="50" rx="40" ry="14" fill="none" stroke="#fff" strokeWidth="2"/>
          <Ellipse cx="50" cy="50" rx="40" ry="14" fill="none" stroke="#fff" strokeWidth="2" rotation="60" originX="50" originY="50"/>
          <Ellipse cx="50" cy="50" rx="40" ry="14" fill="none" stroke="#fff" strokeWidth="2" rotation="120" originX="50" originY="50"/>
        </Svg>

        <View style={styles.qbIconBox}>
          <Ionicons name="library" size={28} color="#fff" />
        </View>

        <View style={styles.qbText}>
          <Text style={styles.qbTitle}>Question Bank</Text>
          <Text style={styles.qbSub}>Create and manage reusable questions</Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
      </LinearGradient>
    </Pressable>
  );
}

// ─── Course card (for the "Courses" section) ──────────────────────────────────
const ACCENT = [
  { stripe: colors.purple600, text: colors.purple600 },
  { stripe: colors.teal600,   text: colors.teal600 },
  { stripe: colors.gold600,   text: colors.gold800 },
  { stripe: colors.coral600,  text: colors.coral600 },
];

function CourseCard({ course, sectionCount, accentIndex, onPress }) {
  const a = ACCENT[accentIndex % ACCENT.length];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.courseCard, pressed && styles.pressed]}>
      <View style={[styles.stripe, { backgroundColor: a.stripe }]} />
      <View style={styles.courseBody}>
        <Text style={styles.courseTitle} numberOfLines={1}>{course.name}</Text>
        <Text style={styles.sectionCount}>
          {sectionCount} {sectionCount === 1 ? 'section' : 'sections'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.neutral200} style={{ alignSelf: 'center', marginRight: 14 }} />
    </Pressable>
  );
}

// ─── Divider with label ───────────────────────────────────────────────────────
function ListHeader({ label, meta }) {
  return (
    <View style={styles.listHeader}>
      <Text style={styles.listLabel}>{label}</Text>
      {!!meta && <Text style={styles.listMeta}>{meta}</Text>}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function TeacherHomeScreen({ navigation }) {
  const { user, token } = useAuth();
  const [courses, setCourses] = useState([]);
  const [classMap, setClassMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const coursesData = await api.get('/courses', token);
      setCourses(coursesData ?? []);
      const entries = await Promise.all(
        (coursesData ?? []).map(async c => {
          try {
            const cls = await api.get(`/courses/${c.id}/classes`, token);
            return [c.id, cls ?? []];
          } catch {
            return [c.id, []];
          }
        })
      );
      setClassMap(Object.fromEntries(entries));
    } catch (e) {
      console.warn('TeacherHomeScreen load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  // All sections across all courses, each annotated with course name and accent index
  const allSections = courses.flatMap((c, ci) =>
    (classMap[c.id] ?? []).map(cls => ({
      ...cls,
      courseName: c.name,
      courseAccentIndex: ci,
    }))
  );

  const totalStudents = allSections.reduce((sum, s) => sum + (s.enrollmentCount ?? 0), 0);

  return (
    <ScreenSurface>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerGreeting}>
            Hello, {user?.name?.split(' ')[0] ?? 'Professor'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => navigation.navigate('QuestionBank')}
          activeOpacity={0.75}
        >
          <Ionicons name="library-outline" size={18} color={colors.purple600} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.purple400} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Question Bank card */}
          <QuestionBankCard onPress={() => navigation.navigate('QuestionBank')} />

          {/* ── SECTIONS ── */}
          <ListHeader
            label="SECTIONS"
            meta={`${allSections.length} ${allSections.length === 1 ? 'section' : 'sections'} · ${totalStudents} students`}
          />

          {allSections.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No sections yet. Create a course and add a section.</Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {allSections.map((section, i) => (
                <ClassCard
                  key={section.id}
                  courseClass={section}
                  courseName={section.courseName}
                  accentIndex={section.courseAccentIndex}
                  onPress={() => navigation.navigate('ClassDetail', {
                    classId: section.id,
                    courseName: section.courseName,
                  })}
                />
              ))}
            </View>
          )}

          {/* ── COURSES ── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
          </View>

          <ListHeader
            label="COURSES"
            meta={`${courses.length} ${courses.length === 1 ? 'course' : 'courses'}`}
          />

          {courses.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No courses yet.</Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {courses.map((course, ci) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  sectionCount={(classMap[course.id] ?? []).length}
                  accentIndex={ci}
                  onPress={() => {}}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </ScreenSurface>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral200,
    gap: 12,
  },
  headerGreeting: {
    fontFamily: 'Nunito_900Black',
    fontSize: 26,
    color: colors.neutral900,
    lineHeight: 30,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.neutral900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },

  // Scroll
  scroll: {
    padding: screenPadding.horizontal,
    paddingBottom: 48,
    gap: 14,
  },

  // Question Bank card
  qbCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 0,
    elevation: 4,
  },
  qbPressed: {
    transform: [{ translateY: 2 }],
  },
  qbGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  qbAtom: {
    position: 'absolute',
    right: -10,
    top: -10,
    opacity: 0.12,
  },
  qbIconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  qbText: {
    flex: 1,
    minWidth: 0,
  },
  qbTitle: {
    fontFamily: 'Nunito_900Black',
    fontSize: 18,
    color: '#fff',
    lineHeight: 22,
    marginBottom: 2,
  },
  qbSub: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },

  // List header
  listHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: -4,
  },
  listLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: colors.neutral600,
    letterSpacing: 0.8,
  },
  listMeta: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: colors.neutral600,
  },

  // Divider between sections and courses
  dividerRow: {
    marginVertical: 4,
  },
  dividerLine: {
    height: 1,
    backgroundColor: colors.neutral200,
  },

  // Card list
  cardList: {
    gap: 10,
  },

  // Course card
  courseCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    overflow: 'hidden',
    shadowColor: colors.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  pressed: {
    opacity: 0.85,
  },
  stripe: {
    width: 5,
    flexShrink: 0,
  },
  courseBody: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  courseTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: colors.purple800,
  },
  sectionCount: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.neutral600,
  },

  // Loader / empty
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    ...typeScale.body,
    color: colors.neutral600,
    textAlign: 'center',
  },
});
