import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Pressable,
  TouchableOpacity, Modal, Animated, TextInput, KeyboardAvoidingView,
  Platform, Clipboard, ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { ScreenSurface } from '../../components/base';
import { colors, typeScale, screenPadding, radius } from '../../theme';

// ─── Sheet (slides up from bottom) ───────────────────────────────────────────

function Sheet({ visible, onClose, title, children }) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(600)).current;
  const fade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: visible ? 0 : 600, duration: visible ? 280 : 220, useNativeDriver: true }),
      Animated.timing(fade,  { toValue: visible ? 1 : 0,   duration: visible ? 220 : 180, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={[StyleSheet.absoluteFill, ss.backdrop, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[ss.panel, { paddingBottom: insets.bottom + 8, transform: [{ translateY: slide }] }]}>
          <View style={ss.grabber} />
          <View style={ss.sheetHeader}>
            <Text style={ss.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} style={ss.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={16} color={colors.neutral800} />
            </Pressable>
          </View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ss = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(33,8,79,0.5)' },
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 16, paddingTop: 12,
    shadowColor: '#210A4F', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2, shadowRadius: 24, elevation: 16,
    maxHeight: '88%',
  },
  grabber: {
    width: 44, height: 5, borderRadius: 99,
    backgroundColor: colors.neutral200, alignSelf: 'center', marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },
  sheetTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 18, color: colors.neutral900 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.neutral100, alignItems: 'center', justifyContent: 'center',
  },
});

// ─── Option row (inside options sheet) ───────────────────────────────────────

function OptionRow({ icon, label, sub, onPress, primary, subdued }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        oStyles.row,
        primary && oStyles.rowPrimary,
        subdued && oStyles.rowSubdued,
        pressed && oStyles.rowPressed,
      ]}
    >
      <View style={[oStyles.iconBox, primary && oStyles.iconPrimary, subdued && oStyles.iconSubdued]}>
        <Ionicons
          name={icon}
          size={16}
          color={primary ? '#fff' : subdued ? colors.neutral600 : colors.purple600}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[oStyles.label, primary && oStyles.labelPrimary, subdued && oStyles.labelSubdued]}>
          {label}
        </Text>
        {!!sub && <Text style={oStyles.sub} numberOfLines={1}>{sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={14} color={colors.neutral300} />
    </Pressable>
  );
}

const oStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.neutral200,
    borderRadius: radius.md, padding: 12, marginBottom: 8,
  },
  rowPrimary: { backgroundColor: colors.purple50, borderColor: colors.purple400,
    shadowColor: colors.purple400, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 },
  rowSubdued: { borderColor: colors.neutral200 },
  rowPressed: { opacity: 0.8 },
  iconBox: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.purple50, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  iconPrimary: {
    backgroundColor: colors.purple600,
    shadowColor: colors.purple800, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2,
  },
  iconSubdued: { backgroundColor: colors.neutral50, borderWidth: 1.5, borderColor: colors.neutral200 },
  label: { fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: colors.neutral900, marginBottom: 1 },
  labelPrimary: { color: colors.purple800 },
  labelSubdued: { color: colors.neutral600 },
  sub: { fontFamily: 'Outfit_500Medium', fontSize: 11, color: colors.neutral600 },
});

// ─── Form field ───────────────────────────────────────────────────────────────

function FormField({ label, value, onChangeText, placeholder, autoFocus }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={fStyles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.neutral400}
        autoFocus={autoFocus}
        style={[fStyles.input, focused && fStyles.inputFocused]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const fStyles = StyleSheet.create({
  label: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.neutral600, letterSpacing: 0.6, marginBottom: 5 },
  input: {
    fontFamily: 'Outfit_500Medium', fontSize: 14, color: colors.neutral900,
    backgroundColor: colors.neutral50, borderWidth: 1.5, borderColor: colors.neutral200,
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10,
  },
  inputFocused: { borderColor: colors.purple400 },
});

// ─── Stat cell (section mode chapter cards) ───────────────────────────────────

function StatCell({ icon, iconColor, label, value, sub, barPct, barColor, bg }) {
  return (
    <View style={[cStyles.statCell, { backgroundColor: bg ?? colors.neutral50 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <Ionicons name={icon} size={11} color={iconColor} />
        <Text style={[cStyles.statLabel, { color: colors.neutral600 }]}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, marginBottom: 4 }}>
        <Text style={[cStyles.statValue, { color: iconColor }]}>{value}</Text>
        {!!sub && <Text style={cStyles.statSub}>{sub}</Text>}
      </View>
      <View style={cStyles.barTrack}>
        <View style={[cStyles.barFill, { width: `${Math.min(barPct, 100)}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

// ─── Chapter card ─────────────────────────────────────────────────────────────

function ChapterCard({ chapter, orderIndex, sectionMode, stats, totalEnrolled, onPress }) {
  const num = orderIndex + 1;

  // score colour band
  const score = stats?.avgScore ?? 0;
  const scoreTone =
    score >= 90 ? { fg: colors.teal600, bar: colors.teal400 } :
    score >= 80 ? { fg: colors.green600, bar: colors.green400 } :
    score >= 70 ? { fg: colors.gold800,  bar: colors.gold400 } :
                  { fg: colors.coral600, bar: colors.coral400 };

  const completed = stats?.completedCount ?? 0;
  const completionPct = totalEnrolled > 0 ? (completed / totalEnrolled) * 100 : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [cStyles.card, pressed && cStyles.cardPressed]}
    >
      {/* Top row */}
      <View style={cStyles.topRow}>
        <View style={cStyles.numCircle}>
          <Text style={cStyles.numText}>{num}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={cStyles.chapterTitle} numberOfLines={1}>{chapter.name}</Text>
          <Text style={cStyles.chapterSub} numberOfLines={2}>{chapter.description}</Text>
          <Text style={cStyles.sectionCount}>
            {chapter._count?.sections ?? 0} {(chapter._count?.sections ?? 0) === 1 ? 'section' : 'sections'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.neutral300} />
      </View>

      {/* Stats row — section mode only */}
      {sectionMode && (
        <View style={cStyles.statsRow}>
          <StatCell
            icon="people-outline"
            iconColor={completionPct === 100 ? colors.teal600 : colors.purple600}
            label="COMPLETED"
            value={completed}
            sub={`/ ${totalEnrolled} students`}
            barPct={completionPct}
            barColor={completionPct === 100 ? colors.teal400 : colors.purple400}
          />
          {stats?.avgScore != null ? (
            <StatCell
              icon="analytics-outline"
              iconColor={scoreTone.fg}
              label="AVG SCORE"
              value={`${score}%`}
              barPct={score}
              barColor={scoreTone.bar}
            />
          ) : (
            <View style={[cStyles.statCell, { backgroundColor: colors.neutral50, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 11, color: colors.neutral400 }}>No attempts yet</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

const cStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.neutral200,
    borderRadius: radius.lg, padding: 14, gap: 12,
    shadowColor: colors.neutral900, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  cardPressed: { opacity: 0.85 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  numCircle: {
    width: 40, height: 40, borderRadius: 20, flexShrink: 0,
    backgroundColor: colors.purple400,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.purple800, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2,
  },
  numText: { fontFamily: 'Nunito_900Black', fontSize: 16, color: '#fff' },
  chapterTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: colors.purple800, lineHeight: 20, marginBottom: 2 },
  chapterSub: { fontFamily: 'Outfit_500Medium', fontSize: 12.5, color: colors.neutral600, lineHeight: 17 },
  sectionCount: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.purple600, marginTop: 4 },
  statsRow: {
    flexDirection: 'row', gap: 6,
    borderTopWidth: 1, borderTopColor: colors.neutral100, paddingTop: 10,
  },
  statCell: { flex: 1, borderRadius: radius.sm, padding: 9 },
  statLabel: { fontFamily: 'Outfit_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontFamily: 'Nunito_900Black', fontSize: 15, lineHeight: 18 },
  statSub: { fontFamily: 'Outfit_500Medium', fontSize: 11, color: colors.neutral600 },
  barTrack: { height: 4, backgroundColor: '#fff', borderRadius: 99, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 99 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ClassDetailScreen({ navigation, route }) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    mode = 'course',       // 'course' | 'section'
    courseId,
    courseClassId,
    courseName,
    sectionNumber,
    code,
    enrollmentCount,
  } = route.params ?? {};

  const isSectionMode = mode === 'section';

  const [chapters, setChapters] = useState([]);
  const [statsMap, setStatsMap] = useState({}); // chapterId → { completedCount, avgScore }
  const [totalEnrolled, setTotalEnrolled] = useState(enrollmentCount ?? 0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sheet, setSheet] = useState(null); // 'options' | 'addChapter' | null
  const [codeCopied, setCodeCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const chaptersData = await api.get(`/courses/${courseId}/chapters`, token);
      setChapters(chaptersData ?? []);

      if (isSectionMode && courseClassId) {
        const statsData = await api.get(
          `/courses/${courseId}/classes/${courseClassId}/stats`,
          token,
        );
        const map = {};
        (statsData.chapters ?? []).forEach(s => { map[s.chapterId] = s; });
        setStatsMap(map);
        setTotalEnrolled(statsData.total ?? enrollmentCount ?? 0);
      }
    } catch (e) {
      console.warn('ClassDetailScreen load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, courseId, courseClassId, isSectionMode]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  // ── Add chapter (course mode) ───────────────────────────────────────────────
  const [chapterName, setChapterName] = useState('');
  const [chapterDesc, setChapterDesc] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState('');

  const submitChapter = async () => {
    if (!chapterName.trim() || !chapterDesc.trim()) return;
    setAddBusy(true); setAddError('');
    try {
      const ch = await api.post(
        `/courses/${courseId}/chapters`,
        { name: chapterName.trim(), description: chapterDesc.trim() },
        token,
      );
      setChapters(prev => [...prev, { ...ch, _count: { sections: 0 } }]);
      setChapterName(''); setChapterDesc('');
      setSheet(null);
    } catch (e) {
      setAddError(e.message ?? 'Something went wrong');
    } finally {
      setAddBusy(false);
    }
  };

  // ── Copy class code ─────────────────────────────────────────────────────────
  const copyCode = () => {
    if (!code) return;
    Clipboard.setString(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1500);
  };

  // ── Export class report ─────────────────────────────────────────────────────
  const exportReport = async () => {
    if (exporting) return;
    setExporting(true);
    setSheet(null);
    try {
      const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
      const res = await fetch(`${BASE_URL}/api/courses/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const csv = await res.text();
      const date = new Date().toISOString().slice(0, 10);
      const filename = `class-report-${date}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      } else {
        const path = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Save class report', UTI: 'public.comma-separated-values-text' });
        }
      }
    } catch (e) {
      console.warn('Export error:', e.message);
    } finally {
      setExporting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  const subtitle = isSectionMode
    ? [sectionNumber && `Section ${sectionNumber}`, totalEnrolled && `${totalEnrolled} students`]
        .filter(Boolean).join(' · ')
    : `${chapters.length} ${chapters.length === 1 ? 'chapter' : 'chapters'}`;

  return (
    <ScreenSurface>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.neutral900} />
          </Pressable>
          <Pressable onPress={() => setSheet('options')} style={styles.iconBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.neutral900} />
          </Pressable>
        </View>

        <Text style={styles.title} numberOfLines={1}>{courseName}</Text>

        <View style={styles.subtitleRow}>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          {isSectionMode && !!code && (
            <>
              <Text style={styles.dot}>·</Text>
              <Pressable onPress={copyCode} style={styles.codeChip}>
                <Text style={styles.codeText}>{codeCopied ? 'Copied!' : code}</Text>
                <Ionicons name={codeCopied ? 'checkmark' : 'copy-outline'} size={10} color={codeCopied ? colors.teal600 : colors.gold800} />
              </Pressable>
            </>
          )}
        </View>
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
          <View style={styles.listHeader}>
            <Text style={styles.listLabel}>CHAPTERS</Text>
            <Text style={styles.listMeta}>
              {chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'}
            </Text>
          </View>

          {chapters.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No chapters yet. Add one from the options menu.</Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {chapters.map((ch, i) => (
                <ChapterCard
                  key={ch.id}
                  chapter={ch}
                  orderIndex={i}
                  sectionMode={isSectionMode}
                  stats={statsMap[ch.id]}
                  totalEnrolled={totalEnrolled}
                  onPress={() => navigation.navigate('ChapterDetail', {
                    chapterId: ch.id,
                    chapterName: ch.name,
                    courseId,
                    courseClassId,
                    mode,
                  })}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Options sheet */}
      <Sheet
        visible={sheet === 'options'}
        onClose={() => setSheet(null)}
        title={courseName}
      >
        <Text style={styles.sheetInfo}>
          {isSectionMode ? 'Manage this section and its students.' : 'Manage course content and chapters.'}
        </Text>

        {isSectionMode ? (
          <>
            <OptionRow
              icon="copy-outline"
              label="Share class code"
              sub={`${code} · invite students to join`}
              onPress={() => { copyCode(); setSheet(null); }}
            />
            <OptionRow
              icon="download-outline"
              label="Export class report"
              sub="CSV of student progress"
              onPress={exportReport}
            />
            <OptionRow
              icon="archive-outline"
              label="Archive section"
              sub="Hide from your active sections"
              subdued
              onPress={() => setSheet(null)}
            />
          </>
        ) : (
          <OptionRow
            icon="add-circle-outline"
            label="Add chapter"
            sub="Create a new chapter for this course"
            primary
            onPress={() => setSheet('addChapter')}
          />
        )}
      </Sheet>

      {/* Add chapter sheet (course mode) */}
      <Sheet
        visible={sheet === 'addChapter'}
        onClose={() => { setChapterName(''); setChapterDesc(''); setAddError(''); setSheet(null); }}
        title={`Chapter ${chapters.length + 1}`}
      >
        <Text style={styles.sheetInfo}>
          Add a new chapter. You can add sections and questions once it's created.
        </Text>
        <FormField label="TITLE" value={chapterName} onChangeText={setChapterName} placeholder="e.g. Thermodynamics" autoFocus />
        <FormField label="DESCRIPTION" value={chapterDesc} onChangeText={setChapterDesc} placeholder="What this chapter covers" />
        {!!addError && <Text style={styles.errorText}>{addError}</Text>}
        <Pressable
          onPress={submitChapter}
          disabled={!chapterName.trim() || !chapterDesc.trim() || addBusy}
          style={({ pressed }) => [
            styles.submitBtn,
            (!chapterName.trim() || !chapterDesc.trim()) && styles.submitBtnDisabled,
            pressed && styles.submitBtnPressed,
          ]}
        >
          {addBusy
            ? <ActivityIndicator size="small" color={colors.neutral900} />
            : <Text style={styles.submitLabel}>Add chapter</Text>
          }
        </Pressable>
      </Sheet>
    </ScreenSurface>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: screenPadding.horizontal,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral200,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.neutral200, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.neutral900, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  title: {
    fontFamily: 'Nunito_900Black', fontSize: 26, color: colors.neutral900, lineHeight: 30,
  },
  subtitleRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4,
  },
  subtitle: { fontFamily: 'Outfit_500Medium', fontSize: 12, color: colors.neutral600 },
  dot: { fontFamily: 'Outfit_500Medium', fontSize: 12, color: colors.neutral300 },
  codeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.gold100, borderWidth: 1.5, borderColor: colors.gold400,
    borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2,
  },
  codeText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 10, color: colors.gold800, letterSpacing: 0.5 },

  scroll: { padding: screenPadding.horizontal, paddingBottom: 48, gap: 10 },
  listHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 2 },
  listLabel: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.neutral600, letterSpacing: 0.8 },
  listMeta: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.neutral600 },
  cardList: { gap: 10 },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { ...typeScale.body, color: colors.neutral600, textAlign: 'center' },

  sheetInfo: { fontFamily: 'Outfit_500Medium', fontSize: 13, color: colors.neutral600, marginBottom: 14, lineHeight: 18 },
  errorText: { fontFamily: 'Outfit_500Medium', fontSize: 12, color: colors.coral600, marginBottom: 8 },

  submitBtn: {
    backgroundColor: colors.purple400, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8,
    shadowColor: colors.purple800, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnPressed: { transform: [{ translateY: 2 }], shadowOffset: { width: 0, height: 1 } },
  submitLabel: { fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: colors.neutral900 },
});
