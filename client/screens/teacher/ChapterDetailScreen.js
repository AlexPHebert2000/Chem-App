import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Modal, Animated,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { colors, radius } from '../../theme';

// ─── Sheet ─────────────────────────────────────────────────────────────────────

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

// ─── OptionRow ─────────────────────────────────────────────────────────────────

function OptionRow({ icon, label, sub, onPress, primary, subdued, disabled }) {
  return (
    <Pressable
      onPress={disabled ? null : onPress}
      style={({ pressed }) => [or.row, primary && or.rowPrimary, subdued && or.rowSubdued, disabled && or.rowDisabled, !disabled && pressed && { opacity: 0.8 }]}
    >
      <View style={[or.iconBox, primary && or.iconPrimary, subdued && or.iconSubdued]}>
        <Ionicons name={icon} size={16} color={primary ? '#fff' : subdued ? colors.neutral600 : colors.purple600} />
      </View>
      <View style={or.text}>
        <Text style={[or.label, subdued && { color: colors.neutral600 }]}>{label}</Text>
        {sub ? <Text style={or.sub}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={14} color={colors.neutral300} />
    </Pressable>
  );
}

const or = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: colors.neutral200,
    borderRadius: radius.md, padding: 12, marginBottom: 8,
  },
  rowPrimary: {
    backgroundColor: colors.purple50, borderColor: colors.purple400,
    shadowColor: colors.purple400, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 0, elevation: 2,
  },
  rowSubdued: { backgroundColor: '#fff' },
  rowDisabled: { opacity: 0.4 },
  iconBox: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.purple50,
    alignItems: 'center', justifyContent: 'center',
  },
  iconPrimary: {
    backgroundColor: colors.purple600,
    shadowColor: colors.purple800, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 0, elevation: 2,
  },
  iconSubdued: { backgroundColor: colors.neutral50, borderWidth: 1.5, borderColor: colors.neutral200 },
  text: { flex: 1 },
  label: { fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: colors.neutral900 },
  sub: { fontFamily: 'Outfit_500Medium', fontSize: 11, color: colors.neutral600, marginTop: 1 },
});

// ─── Stars ─────────────────────────────────────────────────────────────────────

function Stars({ n, max = 3 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1, alignItems: 'center' }}>
      {Array.from({ length: max }).map((_, i) => (
        <Ionicons key={i} name={i < n ? 'star' : 'star-outline'} size={11}
          color={i < n ? colors.gold400 : colors.neutral200} />
      ))}
    </View>
  );
}

// ─── TypeChip ──────────────────────────────────────────────────────────────────

const TYPE_MAP = {
  MC:      { bg: colors.purple50,  border: colors.purple100, fg: colors.purple600, label: 'MC' },
  FIB:     { bg: colors.teal50,    border: colors.teal400,   fg: colors.teal600,   label: 'FIB' },
  TF:      { bg: colors.purple50,  border: colors.purple100, fg: colors.purple600, label: 'TF' },
  MS:      { bg: colors.gold50,    border: colors.gold200,   fg: colors.gold800,   label: 'MS' },
  SA:      { bg: colors.coral50,   border: colors.coral400,  fg: colors.coral600,  label: 'SA' },
  DYNAMIC: { bg: colors.teal50,    border: colors.teal400,   fg: colors.teal600,   label: 'DYN' },
};

function TypeChip({ type }) {
  const t = TYPE_MAP[type] ?? TYPE_MAP.MC;
  return (
    <View style={{ backgroundColor: t.bg, borderWidth: 1.5, borderColor: t.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 10, color: t.fg, letterSpacing: 0.4 }}>{t.label}</Text>
    </View>
  );
}

// ─── Stat blocks ───────────────────────────────────────────────────────────────

function accuracyColor(score) {
  if (score == null) return colors.neutral600;
  if (score >= 90) return colors.teal600;
  if (score >= 80) return colors.green600;
  if (score >= 70) return colors.gold800;
  return colors.coral600;
}

function scoreBarColor(score) {
  if (score == null) return colors.neutral200;
  if (score >= 90) return colors.teal400;
  if (score >= 80) return colors.green400;
  if (score >= 70) return colors.gold400;
  return colors.coral400;
}

function CompletedStat({ completed, total }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <View style={st.box}>
      <View style={st.labelRow}>
        <Ionicons name="people-outline" size={11} color={colors.purple600} />
        <Text style={st.labelText}>COMPLETED</Text>
      </View>
      <View style={st.valRow}>
        <Text style={st.bigNum}>{completed}</Text>
        <Text style={st.denomText}>/ {total} students</Text>
      </View>
      <View style={st.track}>
        <View style={[st.fill, { width: `${pct}%`, backgroundColor: pct === 100 ? colors.teal400 : colors.purple400 }]} />
      </View>
    </View>
  );
}

function ScoreStat({ score }) {
  const textColor = accuracyColor(score);
  const barColor  = scoreBarColor(score);
  return (
    <View style={st.box}>
      <View style={st.labelRow}>
        <Ionicons name="radio-button-on-outline" size={11} color={textColor} />
        <Text style={st.labelText}>AVG ACCURACY</Text>
      </View>
      <View style={st.valRow}>
        <Text style={[st.bigNum, { color: textColor }]}>{score ?? '—'}</Text>
        {score != null && <Text style={[st.denomText, { color: textColor }]}>%</Text>}
      </View>
      <View style={st.track}>
        <View style={[st.fill, { width: `${score ?? 0}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  box: {
    flex: 1, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: colors.neutral200,
    borderRadius: radius.sm, padding: 8,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  labelText: {
    fontFamily: 'Outfit_500Medium', fontSize: 10, letterSpacing: 0.4,
    color: colors.neutral600, textTransform: 'uppercase',
  },
  valRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginBottom: 4 },
  bigNum: { fontFamily: 'Nunito_900Black', fontSize: 15, color: colors.neutral900, lineHeight: 18 },
  denomText: { fontFamily: 'Outfit_500Medium', fontSize: 11, color: colors.neutral600 },
  track: { height: 4, backgroundColor: colors.neutral100, borderRadius: 99, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 99 },
});

// ─── QuestionRow ───────────────────────────────────────────────────────────────

function QuestionRow({ question, qStats, sectionMode, isLast, total }) {
  return (
    <View style={[qr.row, !isLast && qr.rowBorder]}>
      <Text style={qr.text} numberOfLines={2}>{question.content}</Text>
      <View style={qr.meta}>
        <TypeChip type={question.type} />
        <Stars n={question.difficulty ?? 1} />
        {sectionMode && qStats != null && (
          <>
            <Text style={qr.dot}>·</Text>
            <Text style={qr.statText}>{qStats.answeredCount}/{total} answered</Text>
            <Text style={qr.dot}>·</Text>
            <Text style={[qr.accuracy, { color: accuracyColor(qStats.accuracy) }]}>
              {qStats.accuracy != null ? `${qStats.accuracy}%` : '—'} accuracy
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const qr = StyleSheet.create({
  row: { paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.neutral200 },
  text: { fontFamily: 'Outfit_500Medium', fontSize: 13.5, color: colors.neutral900, lineHeight: 19, marginBottom: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  dot: { fontFamily: 'Outfit_500Medium', fontSize: 10, color: colors.neutral300 },
  statText: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.neutral600 },
  accuracy: { fontFamily: 'Nunito_800ExtraBold', fontSize: 11 },
});

// ─── SectionCard ───────────────────────────────────────────────────────────────

function SectionCard({ section, orderIndex, expanded, onToggle, questions, loadingQ, stats, totalEnrolled, sectionMode, onAddFromBank }) {
  const qCount = section._count?.questions ?? 0;
  const chevronAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(chevronAnim, { toValue: expanded ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [expanded]);

  const chevronRot = chevronAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={sc.card}>
      <Pressable onPress={onToggle} style={({ pressed }) => [sc.headerRow, pressed && { opacity: 0.85 }]}>
        <LinearGradient
          colors={[colors.purple400, colors.purple800]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={sc.numCircle}
        >
          <Text style={sc.numText}>{orderIndex + 1}</Text>
        </LinearGradient>

        <View style={sc.headerText}>
          <Text style={sc.sectionTitle} numberOfLines={1}>{section.name}</Text>
          {section.description ? (
            <Text style={sc.sectionSub} numberOfLines={1}>{section.description}</Text>
          ) : null}
        </View>

        <View style={sc.rightChips}>
          <View style={sc.qChip}>
            <Text style={sc.qChipText}>{qCount} Q</Text>
          </View>
          <Animated.View style={{ transform: [{ rotate: chevronRot }] }}>
            <Ionicons name="chevron-down" size={14} color={colors.neutral600} />
          </Animated.View>
        </View>
      </Pressable>

      {expanded && (
        <View style={sc.drawer}>
          {sectionMode && (
            <View style={sc.statsRow}>
              <CompletedStat completed={stats?.completedCount ?? 0} total={totalEnrolled} />
              <ScoreStat score={stats?.avgScore ?? null} />
            </View>
          )}

          <View style={sc.questionsSection}>
            <Text style={sc.questionsLabel}>QUESTIONS</Text>
            {loadingQ ? (
              <ActivityIndicator size="small" color={colors.purple400} style={{ marginVertical: 12 }} />
            ) : questions && questions.length > 0 ? (
              questions.map((q, i) => {
                const qStats = sectionMode
                  ? (stats?.questions ?? []).find(s => s.questionId === q.id)
                  : null;
                return (
                  <QuestionRow
                    key={q.id}
                    question={q}
                    qStats={qStats}
                    sectionMode={sectionMode}
                    isLast={i === questions.length - 1}
                    total={totalEnrolled}
                  />
                );
              })
            ) : (
              <Text style={sc.noQuestions}>No questions yet.</Text>
            )}
          </View>

          {!sectionMode && (
            <Pressable onPress={onAddFromBank} style={({ pressed }) => [sc.addFromBank, pressed && { opacity: 0.8 }]}>
              <Ionicons name="add" size={12} color={colors.purple600} />
              <Text style={sc.addFromBankText}>ADD FROM BANK</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: colors.neutral200,
    borderRadius: radius.lg, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  numCircle: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.purple800, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6, shadowRadius: 0, elevation: 2,
  },
  numText: { fontFamily: 'Nunito_900Black', fontSize: 15, color: '#fff' },
  headerText: { flex: 1, minWidth: 0 },
  sectionTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 15.5, color: colors.purple800, marginBottom: 1 },
  sectionSub: { fontFamily: 'Outfit_500Medium', fontSize: 12, color: colors.neutral600, lineHeight: 16 },
  rightChips: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qChip: {
    backgroundColor: colors.purple50, borderWidth: 1.5, borderColor: colors.purple100,
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
  },
  qChipText: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: colors.purple600 },
  drawer: { borderTopWidth: 1, borderTopColor: colors.neutral100, backgroundColor: colors.neutral50 },
  statsRow: { flexDirection: 'row', gap: 6, padding: 12, paddingBottom: 8 },
  questionsSection: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 4 },
  questionsLabel: {
    fontFamily: 'Outfit_500Medium', fontSize: 10.5, letterSpacing: 0.4,
    color: colors.neutral600, textTransform: 'uppercase', marginVertical: 6,
  },
  noQuestions: { fontFamily: 'Outfit_500Medium', fontSize: 13, color: colors.neutral400, paddingVertical: 8 },
  addFromBank: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, paddingHorizontal: 14,
    borderTopWidth: 1, borderTopColor: colors.purple100,
    backgroundColor: colors.purple50,
  },
  addFromBankText: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 11,
    color: colors.purple600, letterSpacing: 1,
  },
});

// ─── AddSectionSheet ───────────────────────────────────────────────────────────

function AddSectionSheet({ visible, onClose, onAdd, nextNum }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc]   = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    await onAdd(title.trim(), desc.trim());
    setSaving(false);
    setTitle(''); setDesc('');
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={`Section ${nextNum}`}>
      <Text style={asSt.hint}>Add a new section. You can add questions inside it once it's created.</Text>
      <Text style={asSt.label}>Title</Text>
      <TextInput style={asSt.input} placeholder="e.g. Isotopes" value={title} onChangeText={setTitle} autoFocus />
      <Text style={asSt.label}>Short description</Text>
      <TextInput style={asSt.input} placeholder="What this section covers" value={desc} onChangeText={setDesc} />
      <Pressable
        onPress={submit}
        disabled={!title.trim() || saving}
        style={({ pressed }) => [asSt.btn, (!title.trim() || saving) && asSt.btnDisabled, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="add" size={14} color={colors.neutral900} />
        <Text style={asSt.btnText}>{saving ? 'Adding…' : 'Add section'}</Text>
      </Pressable>
    </Sheet>
  );
}

const asSt = StyleSheet.create({
  hint: { fontFamily: 'Outfit_500Medium', fontSize: 13, color: colors.neutral600, marginBottom: 14 },
  label: { fontFamily: 'Outfit_500Medium', fontSize: 11, letterSpacing: 0.4, color: colors.neutral600, textTransform: 'uppercase', marginBottom: 4 },
  input: {
    backgroundColor: colors.neutral50, borderWidth: 1.5, borderColor: colors.neutral200,
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10,
    fontFamily: 'Outfit_500Medium', fontSize: 14, color: colors.neutral900, marginBottom: 10,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.gold400, borderRadius: radius.md, paddingVertical: 13, marginTop: 8,
    shadowColor: colors.gold600, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: colors.neutral900 },
});

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function ChapterDetailScreen({ navigation, route }) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    chapterId,
    chapterName,
    courseId,
    courseClassId,
    mode = 'course',
    courseName,
    code,
    chapterOrderIndex,
    totalEnrolled: enrolledParam = 0,
  } = route.params ?? {};

  const isSectionMode = mode === 'section';

  const [sections, setSections]     = useState([]);
  const [statsMap, setStatsMap]     = useState({});   // sectionId → { completedCount, avgScore, questions }
  const [questionMap, setQuestionMap] = useState({}); // sectionId → [questions]
  const [loadingQ, setLoadingQ]     = useState({});   // sectionId → bool
  const [expanded, setExpanded]     = useState({});
  const [totalEnrolled, setTotalEnrolled] = useState(enrolledParam);
  const [loading, setLoading]       = useState(true);
  const [sheet, setSheet]           = useState(null); // 'options' | 'addSection' | null

  const load = useCallback(async () => {
    try {
      const [sectionList, statsData] = await Promise.all([
        api.get(`/chapters/${chapterId}/sections`, token),
        isSectionMode && courseClassId
          ? api.get(`/courses/${courseId}/classes/${courseClassId}/chapters/${chapterId}/stats`, token)
          : Promise.resolve(null),
      ]);
      setSections(sectionList ?? []);
      if (statsData) {
        const map = {};
        (statsData.sections ?? []).forEach(s => { map[s.sectionId] = s; });
        setStatsMap(map);
        if (statsData.total != null) setTotalEnrolled(statsData.total);
      }
    } catch (e) {
      console.warn('ChapterDetailScreen load error:', e.message);
    } finally {
      setLoading(false);
    }
  }, [chapterId, courseId, courseClassId, isSectionMode, token]);

  useEffect(() => { load(); }, [load]);

  const toggleSection = useCallback(async (sectionId) => {
    const nowExpanded = !expanded[sectionId];
    setExpanded(e => ({ ...e, [sectionId]: nowExpanded }));

    if (nowExpanded && !questionMap[sectionId]) {
      setLoadingQ(l => ({ ...l, [sectionId]: true }));
      try {
        const qs = await api.get(`/sections/${sectionId}/questions`, token);
        setQuestionMap(m => ({ ...m, [sectionId]: qs ?? [] }));
      } catch (e) {
        console.warn('Questions load error:', e.message);
        setQuestionMap(m => ({ ...m, [sectionId]: [] }));
      } finally {
        setLoadingQ(l => ({ ...l, [sectionId]: false }));
      }
    }
  }, [expanded, questionMap, token]);

  const addSection = useCallback(async (name, description) => {
    try {
      const newSection = await api.post(`/chapters/${chapterId}/sections`, { name, description }, token);
      setSections(s => [...s, newSection]);
      setSheet(null);
      setExpanded(e => ({ ...e, [newSection.id]: true }));
      setQuestionMap(m => ({ ...m, [newSection.id]: [] }));
    } catch (e) {
      console.warn('Add section error:', e.message);
    }
  }, [chapterId, token]);

  const totalQuestions = sections.reduce((sum, s) => sum + (s._count?.questions ?? 0), 0);
  const chapterNum = chapterOrderIndex != null ? chapterOrderIndex + 1 : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral50 }}>
      <View style={{ height: insets.top, backgroundColor: '#fff' }} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.squareBtn, pressed && { opacity: 0.7 }]}>
            <Ionicons name="chevron-back" size={20} color={colors.neutral900} />
          </Pressable>
          <Pressable onPress={() => setSheet('options')} style={({ pressed }) => [styles.squareBtn, pressed && { opacity: 0.7 }]}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.neutral900} />
          </Pressable>
        </View>

        <Text style={styles.chapterTitle}>{chapterName ?? 'Chapter'}</Text>

        <View style={styles.subtitleRow}>
          {chapterNum != null && <Text style={styles.subtitleText}>Chapter {chapterNum}</Text>}
          {courseName ? (
            <>
              <Text style={styles.subtitleDot}>·</Text>
              <Text style={styles.subtitleText} numberOfLines={1}>{courseName}</Text>
            </>
          ) : null}
          {isSectionMode && code ? (
            <>
              <Text style={styles.subtitleDot}>·</Text>
              <View style={styles.codeChip}>
                <Text style={styles.codeChipText}>{code}</Text>
              </View>
            </>
          ) : null}
        </View>
      </View>

      {/* Sections list */}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <View style={styles.listHeader}>
          <Text style={styles.listLabel}>SECTIONS</Text>
          <Text style={styles.listMeta}>
            {sections.length} {sections.length === 1 ? 'section' : 'sections'} · {totalQuestions} questions
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={colors.purple400} style={{ marginTop: 40 }} />
        ) : sections.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No sections yet.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {sections.map((sec, i) => (
              <SectionCard
                key={sec.id}
                section={sec}
                orderIndex={i}
                expanded={!!expanded[sec.id]}
                onToggle={() => toggleSection(sec.id)}
                questions={questionMap[sec.id]}
                loadingQ={!!loadingQ[sec.id]}
                stats={statsMap[sec.id]}
                totalEnrolled={totalEnrolled}
                sectionMode={isSectionMode}
                onAddFromBank={() => navigation.navigate('QuestionBank')}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Options sheet */}
      <Sheet visible={sheet === 'options'} onClose={() => setSheet(null)} title={chapterName ?? 'Chapter'}>
        <Text style={styles.sheetHint}>Manage sections and chapter content.</Text>
        {!isSectionMode && (
          <>
            <OptionRow
              icon="add-circle-outline"
              label="Add section"
              sub="Create a new section in this chapter"
              onPress={() => setSheet('addSection')}
              primary
            />
            <OptionRow
              icon="library-outline"
              label="Open Question Bank"
              sub="Browse and edit reusable questions"
              onPress={() => { setSheet(null); navigation.navigate('QuestionBank'); }}
            />
          </>
        )}
        <OptionRow
          icon="create-outline"
          label="Edit chapter info"
          sub="Title, description, order"
          onPress={() => setSheet(null)}
        />
        {isSectionMode && (
          <>
            <OptionRow
              icon="download-outline"
              label="Export chapter report"
              sub="Per-question stats by student"
              onPress={() => setSheet(null)}
              disabled
            />
            <OptionRow
              icon="archive-outline"
              label="Archive chapter"
              sub="Hide from this class"
              onPress={() => setSheet(null)}
              subdued
            />
          </>
        )}
      </Sheet>

      {/* Add section sheet */}
      <AddSectionSheet
        visible={sheet === 'addSection'}
        onClose={() => setSheet(null)}
        onAdd={addSection}
        nextNum={sections.length + 1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff', paddingHorizontal: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: colors.neutral100,
  },
  headerTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  squareBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.neutral200, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  chapterTitle: {
    fontFamily: 'Nunito_900Black', fontSize: 26, color: colors.neutral900, lineHeight: 30, marginBottom: 4,
  },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  subtitleText: { fontFamily: 'Outfit_500Medium', fontSize: 12, color: colors.neutral600 },
  subtitleDot: { fontFamily: 'Outfit_500Medium', fontSize: 12, color: colors.neutral300 },
  codeChip: {
    backgroundColor: colors.gold200, borderWidth: 1.5, borderColor: colors.gold400,
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1,
  },
  codeChipText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 10, color: colors.gold800, letterSpacing: 0.4 },
  list: { padding: 14, paddingBottom: 40 },
  listHeader: {
    flexDirection: 'row', alignItems: 'baseline',
    justifyContent: 'space-between', marginBottom: 10,
  },
  listLabel: {
    fontFamily: 'Outfit_500Medium', fontSize: 10.5, letterSpacing: 0.4,
    color: colors.neutral600, textTransform: 'uppercase',
  },
  listMeta: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.neutral600 },
  empty: { paddingTop: 40, alignItems: 'center' },
  emptyText: { fontFamily: 'Outfit_500Medium', fontSize: 14, color: colors.neutral600 },
  sheetHint: { fontFamily: 'Outfit_500Medium', fontSize: 13, color: colors.neutral600, marginBottom: 14 },
});
