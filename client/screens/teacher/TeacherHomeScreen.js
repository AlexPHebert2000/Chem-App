import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  Pressable, ActivityIndicator, TouchableOpacity,
  Modal, Animated, Dimensions, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { ScreenSurface } from '../../components/base';
import ClassCard from '../../components/ClassCard';
import { colors, typeScale, screenPadding, radius } from '../../theme';

const SCREEN_W = Dimensions.get('window').width;
const DRAWER_W = Math.min(SCREEN_W * 0.78, 320);

// ─── Sheet (bottom overlay) ───────────────────────────────────────────────────

function Sheet({ visible, onClose, title, children }) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 600, duration: 220, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 0,   duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[StyleSheet.absoluteFill, sheetStyles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[sheetStyles.panel, { paddingBottom: insets.bottom + 8, transform: [{ translateY: slideAnim }] }]}
        >
          <View style={sheetStyles.grabber} />
          <View style={sheetStyles.sheetHeader}>
            <Text style={sheetStyles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} style={sheetStyles.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={16} color={colors.neutral800} />
            </Pressable>
          </View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(33,8,79,0.5)',
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingTop: 12,
    shadowColor: '#210A4F',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
    maxHeight: '85%',
  },
  grabber: {
    width: 44,
    height: 5,
    borderRadius: 99,
    backgroundColor: colors.neutral200,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 18,
    color: colors.neutral900,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Form field ───────────────────────────────────────────────────────────────

function FormField({ label, value, onChangeText, placeholder, autoFocus }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.neutral400 ?? colors.neutral600}
        autoFocus={autoFocus}
        style={[fieldStyles.input, focused && fieldStyles.inputFocused]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: colors.neutral600,
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  input: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.neutral900,
    backgroundColor: colors.neutral50,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputFocused: {
    borderColor: colors.purple400,
  },
});

// ─── Submit button ────────────────────────────────────────────────────────────

function SubmitButton({ label, onPress, disabled, loading: busy }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        submitStyles.btn,
        (disabled || busy) && submitStyles.btnDisabled,
        pressed && !disabled && submitStyles.btnPressed,
      ]}
    >
      {busy
        ? <ActivityIndicator size="small" color={colors.neutral900} />
        : <Text style={submitStyles.label}>{label}</Text>
      }
    </Pressable>
  );
}

const submitStyles = StyleSheet.create({
  btn: {
    backgroundColor: colors.purple400,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  btnDisabled: { opacity: 0.45 },
  btnPressed: { transform: [{ translateY: 2 }], shadowOffset: { width: 0, height: 1 } },
  label: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 15,
    color: colors.neutral900,
  },
});

// ─── Create Course Sheet ──────────────────────────────────────────────────────

function CreateCourseSheet({ visible, onClose, token, onCreated }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setName(''); setError(''); setBusy(false); };

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const course = await api.post('/courses', { name: name.trim() }, token);
      reset();
      onClose();
      onCreated(course);
    } catch (e) {
      setError(e.message ?? 'Something went wrong');
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={() => { reset(); onClose(); }} title="Create course">
      <Text style={formInfoText}>
        A course is the content template — students join through sections.
      </Text>
      <FormField
        label="COURSE NAME"
        value={name}
        onChangeText={setName}
        placeholder="e.g. General Chemistry I"
        autoFocus
      />
      {!!error && <Text style={errorText}>{error}</Text>}
      <SubmitButton
        label="Create course"
        onPress={submit}
        disabled={!name.trim()}
        loading={busy}
      />
    </Sheet>
  );
}

// ─── Create Section Sheet ─────────────────────────────────────────────────────

function CreateSectionSheet({ visible, onClose, token, courses, onCreated }) {
  const [courseId, setCourseId] = useState('');
  const [sectionNumber, setSectionNumber] = useState('');
  const [meetingTimes, setMeetingTimes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setCourseId(''); setSectionNumber(''); setMeetingTimes('');
    setError(''); setBusy(false);
  };

  const canSubmit = courseId && sectionNumber.trim() && meetingTimes.trim();

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    try {
      const section = await api.post(
        `/courses/${courseId}/classes`,
        { sectionNumber: sectionNumber.trim(), meetingTimes: meetingTimes.trim() },
        token,
      );
      reset();
      onClose();
      onCreated(courseId, section);
    } catch (e) {
      setError(e.message ?? 'Something went wrong');
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={() => { reset(); onClose(); }} title="Create section">
      <Text style={formInfoText}>
        Students join with the code generated automatically.
      </Text>

      <Text style={fieldStyles.label}>COURSE</Text>
      <ScrollView
        style={{ maxHeight: 140, marginBottom: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {courses.map(c => (
          <Pressable
            key={c.id}
            onPress={() => setCourseId(c.id)}
            style={[sectionStyles.courseRow, courseId === c.id && sectionStyles.courseRowSelected]}
          >
            <View style={[sectionStyles.radio, courseId === c.id && sectionStyles.radioSelected]}>
              {courseId === c.id && <View style={sectionStyles.radioDot} />}
            </View>
            <Text style={[sectionStyles.courseRowText, courseId === c.id && sectionStyles.courseRowTextSelected]}>
              {c.name}
            </Text>
          </Pressable>
        ))}
        {courses.length === 0 && (
          <Text style={{ ...typeScale.body, color: colors.neutral600, paddingVertical: 8 }}>
            No courses yet — create a course first.
          </Text>
        )}
      </ScrollView>

      <FormField
        label="SECTION NUMBER"
        value={sectionNumber}
        onChangeText={setSectionNumber}
        placeholder="e.g. 001"
      />
      <FormField
        label="MEETING TIMES"
        value={meetingTimes}
        onChangeText={setMeetingTimes}
        placeholder="e.g. M W F 10:00am"
      />
      {!!error && <Text style={errorText}>{error}</Text>}
      <SubmitButton
        label="Create section"
        onPress={submit}
        disabled={!canSubmit}
        loading={busy}
      />
    </Sheet>
  );
}

const formInfoText = {
  fontFamily: 'Outfit_500Medium',
  fontSize: 13,
  color: colors.neutral600,
  marginBottom: 14,
  lineHeight: 18,
};

const errorText = {
  fontFamily: 'Outfit_500Medium',
  fontSize: 12,
  color: colors.coral600 ?? '#E05252',
  marginBottom: 8,
};

const sectionStyles = StyleSheet.create({
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    marginBottom: 6,
    backgroundColor: '#fff',
  },
  courseRowSelected: {
    borderColor: colors.purple400,
    backgroundColor: colors.purple50,
  },
  courseRowText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: colors.neutral800,
  },
  courseRowTextSelected: {
    color: colors.purple800,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.neutral300,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioSelected: {
    borderColor: colors.purple400,
    backgroundColor: colors.purple400,
  },
  radioDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
});

// ─── Drawer ───────────────────────────────────────────────────────────────────

function initials(name = '') {
  return name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function DrawerItem({ icon, label, sublabel, primary, subdued, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.drawerItem,
        primary && styles.drawerItemPrimary,
        pressed && styles.drawerItemPressed,
      ]}
    >
      <View style={[
        styles.drawerIconBox,
        primary && styles.drawerIconBoxPrimary,
        subdued && styles.drawerIconBoxSubdued,
      ]}>
        <Ionicons
          name={icon}
          size={18}
          color={primary ? '#fff' : subdued ? colors.neutral600 : colors.purple600}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.drawerLabel, subdued && styles.drawerLabelSubdued]}>
          {label}
        </Text>
        {!!sublabel && (
          <Text style={styles.drawerSublabel} numberOfLines={1}>{sublabel}</Text>
        )}
      </View>
      {!subdued && (
        <Ionicons name="chevron-forward" size={14} color={colors.neutral300} />
      )}
    </Pressable>
  );
}

function Drawer({ visible, onClose, teacher, navigation, onSignOut, onCreateCourse, onCreateSection, onExport, exporting }) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(DRAWER_W)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: DRAWER_W, duration: 220, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const close = (action) => {
    onClose();
    if (action) setTimeout(action, 280);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.drawerBackdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Panel */}
      <Animated.View
        style={[
          styles.drawerPanel,
          { transform: [{ translateX: slideAnim }] },
        ]}
        pointerEvents="box-none"
      >
        {/* Purple header */}
        <LinearGradient
          colors={[colors.purple800, colors.purple600]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.drawerHeader, { paddingTop: Math.max(insets.top, 16) + 16 }]}
        >
          <View style={styles.drawerAvatar}>
            <Text style={styles.drawerAvatarText}>{initials(teacher?.name)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.drawerName}>{teacher?.name ?? 'Professor'}</Text>
            <Text style={styles.drawerRole}>Teacher</Text>
          </View>
          <Pressable onPress={onClose} style={styles.drawerClose} hitSlop={8}>
            <Ionicons name="close" size={16} color="#fff" />
          </Pressable>
        </LinearGradient>

        {/* Items */}
        <View style={styles.drawerBody}>
          <DrawerItem
            icon="school-outline"
            label="Create course"
            sublabel="New course template for your sections"
            primary
            onPress={() => close(onCreateCourse)}
          />
          <DrawerItem
            icon="add-circle-outline"
            label="Create section"
            sublabel="Add a section and get a student join code"
            primary
            onPress={() => close(onCreateSection)}
          />
          <DrawerItem
            icon="download-outline"
            label={exporting ? 'Exporting…' : 'Export student report'}
            sublabel="CSV of all student progress"
            onPress={() => close(onExport)}
          />
          <DrawerItem
            icon="library-outline"
            label="Question Bank"
            sublabel="Create and manage reusable questions"
            onPress={() => close(() => navigation.navigate('QuestionBank'))}
          />
          <DrawerItem
            icon="settings-outline"
            label="Settings"
            sublabel="Profile, notifications, grading"
            onPress={() => close(() => navigation.navigate('Settings'))}
          />
        </View>

        {/* Footer — sign out */}
        <View style={[styles.drawerFooter, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <DrawerItem
            icon="log-out-outline"
            label="Sign out"
            subdued
            onPress={() => close(onSignOut)}
          />
        </View>
      </Animated.View>
    </Modal>
  );
}

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

// ─── Course card ──────────────────────────────────────────────────────────────
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

// ─── List header ──────────────────────────────────────────────────────────────
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
  const { user, token, logout } = useAuth();
  const [courses, setCourses] = useState([]);
  const [classMap, setClassMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheet, setSheet] = useState(null); // 'createCourse' | 'createSection' | null
  const [exporting, setExporting] = useState(false);
  const [studentSheet, setStudentSheet] = useState(null); // { title, students }
  const [loadingStudents, setLoadingStudents] = useState(false);

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

  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
      const res = await fetch(`${BASE_URL}/api/courses/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const csv = await res.text();
      const date = new Date().toISOString().slice(0, 10);
      const filename = `student-report-${date}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const path = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(path, csv, { encoding: 'utf8' });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(path, {
            mimeType: 'text/csv',
            dialogTitle: 'Save student report',
            UTI: 'public.comma-separated-values-text',
          });
        } else {
          Alert.alert('Export saved', `Report saved to:\n${path}`);
        }
      }
    } catch (e) {
      Alert.alert('Export failed', e.message ?? 'Could not export report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const openStatSheet = async (section, statType) => {
    const titleMap = {
      'roster':       `${section.sectionNumber ? `§${section.sectionNumber} ` : ''}All Students`,
      'active-today': `${section.sectionNumber ? `§${section.sectionNumber} ` : ''}Active Today`,
      'sections-done': `${section.sectionNumber ? `§${section.sectionNumber} ` : ''}Sections Completed`,
    };
    setStudentSheet({ title: titleMap[statType] ?? 'Students', students: [] });
    setLoadingStudents(true);
    try {
      const all = await api.get(`/courses/${section.courseId}/classes/${section.id}/students`, token);
      const filtered = statType === 'active-today'
        ? all.filter(s => s.activeToday)
        : statType === 'sections-done'
        ? all.filter(s => s.sectionsCompleted > 0)
        : all;
      setStudentSheet({ title: titleMap[statType], students: filtered });
    } catch (e) {
      console.warn('openStatSheet error:', e.message);
    } finally {
      setLoadingStudents(false);
    }
  };

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
          onPress={() => setDrawerOpen(true)}
          activeOpacity={0.75}
        >
          {/* hamburger SVG — three horizontal lines */}
          <Svg viewBox="0 0 24 24" width={22} height={22}>
            <Path d="M4 7h16M4 12h16M4 17h16" stroke={colors.neutral900} strokeWidth="2.4" strokeLinecap="round"/>
          </Svg>
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
          <QuestionBankCard onPress={() => navigation.navigate('QuestionBank')} />

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
              {allSections.map((section) => (
                <ClassCard
                  key={section.id}
                  courseClass={section}
                  courseName={section.courseName}
                  accentIndex={section.courseAccentIndex}
                  onPress={() => navigation.navigate('CourseDetail', {
                    mode: 'section',
                    courseId: section.courseId,
                    courseClassId: section.id,
                    courseName: section.courseName,
                    sectionNumber: section.sectionNumber,
                    code: section.code,
                    enrollmentCount: section.enrollmentCount,
                  })}
                  onStatPress={(statType) => openStatSheet(section, statType)}
                />
              ))}
            </View>
          )}

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
                  onPress={() => navigation.navigate('CourseDetail', {
                    mode: 'course',
                    courseId: course.id,
                    courseName: course.name,
                  })}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <Drawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        teacher={user}
        navigation={navigation}
        onSignOut={logout}
        onCreateCourse={() => setSheet('createCourse')}
        onCreateSection={() => setSheet('createSection')}
        onExport={exportCsv}
        exporting={exporting}
      />

      <CreateCourseSheet
        visible={sheet === 'createCourse'}
        onClose={() => setSheet(null)}
        token={token}
        onCreated={(newCourse) => {
          setCourses(prev => [...prev, newCourse]);
          setClassMap(prev => ({ ...prev, [newCourse.id]: [] }));
        }}
      />

      <CreateSectionSheet
        visible={sheet === 'createSection'}
        onClose={() => setSheet(null)}
        token={token}
        courses={courses}
        onCreated={(courseId, newSection) => {
          setClassMap(prev => ({
            ...prev,
            [courseId]: [...(prev[courseId] ?? []), newSection],
          }));
        }}
      />

      {/* Student list sheet */}
      <Sheet
        visible={!!studentSheet}
        onClose={() => setStudentSheet(null)}
        title={studentSheet?.title ?? ''}
      >
        {loadingStudents ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <ActivityIndicator color={colors.purple400} />
          </View>
        ) : (studentSheet?.students ?? []).length === 0 ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <Text style={{ ...typeScale.body, color: colors.neutral600 }}>No students to show.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
            {(studentSheet?.students ?? []).map((s, i) => (
              <View
                key={s.id}
                style={[styles.studentRow, i > 0 && styles.studentRowBorder]}
              >
                <View style={styles.studentAvatar}>
                  <Text style={styles.studentAvatarText}>
                    {s.name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.studentName} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.studentMeta} numberOfLines={1}>
                    {s.sectionsCompleted} section{s.sectionsCompleted !== 1 ? 's' : ''} · {s.currentPoints} XP
                  </Text>
                </View>
                {s.activeToday && (
                  <View style={styles.activePip}>
                    <Text style={styles.activePipText}>Today</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </Sheet>
    </ScreenSurface>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
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
    width: 44,
    height: 44,
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
  qbPressed: { transform: [{ translateY: 2 }] },
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
  qbText: { flex: 1, minWidth: 0 },
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

  dividerRow: { marginVertical: 4 },
  dividerLine: { height: 1, backgroundColor: colors.neutral200 },
  cardList: { gap: 10 },

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
  pressed: { opacity: 0.85 },
  stripe: { width: 5, flexShrink: 0 },
  courseBody: { flex: 1, padding: 14, gap: 8 },
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

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { ...typeScale.body, color: colors.neutral600, textAlign: 'center' },

  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  studentRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral100,
  },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.purple100 ?? colors.purple50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  studentAvatarText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: colors.purple700 ?? colors.purple600,
  },
  studentName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.neutral900,
  },
  studentMeta: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11.5,
    color: colors.neutral600,
    marginTop: 1,
  },
  activePip: {
    backgroundColor: colors.green100 ?? '#DCFCE7',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  activePipText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    color: colors.green600 ?? '#16A34A',
  },

  // Drawer
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(33, 8, 79, 0.45)',
  },
  drawerPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: DRAWER_W,
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    shadowColor: '#210A4F',
    shadowOffset: { width: -12, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 16,
    overflow: 'hidden',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  drawerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gold400,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold600,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
    flexShrink: 0,
  },
  drawerAvatarText: {
    fontFamily: 'Nunito_900Black',
    fontSize: 18,
    color: colors.neutral900,
  },
  drawerName: {
    fontFamily: 'Nunito_900Black',
    fontSize: 16,
    color: '#fff',
    lineHeight: 20,
    marginBottom: 2,
  },
  drawerRole: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.8)',
  },
  drawerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  drawerBody: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  drawerFooter: {
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral100,
    paddingTop: 10,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
  },
  drawerItemPrimary: {
    backgroundColor: colors.purple50,
  },
  drawerItemPressed: {
    backgroundColor: colors.neutral50,
  },
  drawerIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.neutral50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  drawerIconBoxPrimary: {
    backgroundColor: colors.purple600,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  drawerIconBoxSubdued: {
    backgroundColor: colors.neutral50,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
  },
  drawerLabel: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    color: colors.neutral900,
    marginBottom: 1,
  },
  drawerLabelSubdued: {
    color: colors.neutral600,
  },
  drawerSublabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11,
    color: colors.neutral600,
  },
});
