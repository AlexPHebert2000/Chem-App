import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View, Text, ScrollView, StyleSheet, Pressable, TextInput,
  Modal, Animated, KeyboardAvoidingView, Platform, RefreshControl,
  ActivityIndicator
} from 'react-native';
import { alertLib } from '../../lib/alertLib';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { colors, radius } from '../../theme';
import DynamicContent from '../../components/base/DynamicContent';

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
      style={({ pressed }) => [
        or.row,
        primary && or.rowPrimary,
        subdued && or.rowSubdued,
        disabled && or.rowDisabled,
        !disabled && pressed && { opacity: 0.8 },
      ]}
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
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.neutral200,
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
    backgroundColor: colors.purple50, alignItems: 'center', justifyContent: 'center',
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

function Stars({ n, max = 5 }) {
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
  MULTIPLE_CHOICE: { bg: colors.purple50,  border: colors.purple100, fg: colors.purple600, label: 'MC' },
  FILL_IN_BLANK:   { bg: colors.teal50,    border: colors.teal400,   fg: colors.teal600,   label: 'FIB' },
  TRUE_FALSE:      { bg: colors.purple50,  border: colors.purple100, fg: colors.purple600, label: 'TF' },
  MULTIPLE_SELECT: { bg: colors.gold50,    border: colors.gold200,   fg: colors.gold800,   label: 'MS' },
  SHORT_ANSWER:    { bg: colors.coral50,   border: colors.coral400,  fg: colors.coral600,  label: 'SA' },
  DYNAMIC:         { bg: colors.teal50,    border: colors.teal400,   fg: colors.teal600,   label: 'DYN' },
};

function TypeChip({ type }) {
  const t = TYPE_MAP[type] ?? TYPE_MAP.MULTIPLE_CHOICE;
  return (
    <View style={{ backgroundColor: t.bg, borderWidth: 1.5, borderColor: t.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 10, color: t.fg, letterSpacing: 0.4 }}>{t.label}</Text>
    </View>
  );
}

// ─── FilterChip ────────────────────────────────────────────────────────────────

function FilterChip({ label, active, onPress, icon }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        fc.chip,
        active && fc.chipActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      {icon && <View style={{ marginRight: 3 }}>{icon}</View>}
      <Text style={[fc.label, active && fc.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const fc = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: colors.neutral200,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  chipActive: {
    backgroundColor: colors.purple600, borderColor: colors.purple800,
    shadowColor: colors.purple800, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 0, elevation: 2,
  },
  label: { fontFamily: 'Nunito_800ExtraBold', fontSize: 11.5, color: colors.neutral800, letterSpacing: 0.1 },
  labelActive: { color: '#fff' },
});

// ─── QuestionCard ──────────────────────────────────────────────────────────────

function QuestionCard({ token, question, onPress, pickMode, selected, alreadyAdded }) {
  const usedIn = question.usedIn ?? 0;
  const tags = question.tags ?? [];
  const [showDel, setDel] = useState(false);
  return (
    <Pressable
      onPress={alreadyAdded ? null : () => onPress(question)}
      style={({ pressed }) => [
        qc.card,
        selected && qc.cardSelected,
        alreadyAdded && qc.cardAdded,
        !alreadyAdded && pressed && { opacity: 0.85 },
      ]}
    >
      <View style={qc.topRow}>
        {pickMode && (
          <View style={[qc.checkbox, selected && qc.checkboxOn, alreadyAdded && qc.checkboxDone]}>
            {selected && <Ionicons name="checkmark" size={11} color="#fff" />}
            {alreadyAdded && <Ionicons name="checkmark" size={11} color={colors.neutral500} />}
          </View>
        )}
        <TypeChip type={question.type} />
        <Stars n={question.difficulty ?? 1} />
        <View style={{ flex: 1 }} />
        {alreadyAdded ? (
          <Text style={qc.addedText}>Added</Text>
        ) : (
          <View style={qc.usageRow}>
            {usedIn > 0 ? (
              <>
                <Ionicons name="book-outline" size={11} color={colors.purple600} />
                <Text style={qc.usedText}>In {usedIn} section{usedIn === 1 ? '' : 's'}</Text>
              </>
            ) : (
              <Text style={qc.unusedText}>Unused</Text>
            )}
          </View>
        )}
      </View>

      <DynamicContent content={question.content} numberOfLines={3} style={qc.text} />

      {tags.length > 0 && (
        <View style={qc.tagsRow}>
          {tags.map(tag => (
            <View key={tag.id} style={qc.tagChip}>
              <Text style={qc.tagText}>#{tag.name}</Text>
            </View>
          ))}
        </View>
      )}

        <Pressable style={styl.str} onPress={()=>setDel(true)}>
         <Ionicons name="trash-outline" size="1rem"></Ionicons>
        </Pressable>
<Modal animationType='fade' transparent={false} visible={showDel} onRequestClose={()=>setDel(false)}>
        <View style={styl.overlay}>
          <View style={styl.card}>
            <View style={styl.stack}>
             <Text style={styles.title}>Remove From Question Bank?</Text>
              <Text style={styl.idText}>{String(question.id)}</Text>
              <Text style={styl.bodyText}>{question.content}</Text>
            </View>
            <Text style={styl.question}>Do you wish to remove this question from your question bank?</Text>
            <View style={styl.actions}>
              <Pressable style={[styl.btn, styl.cancel]} onPress={()=>setDel(false)}>
                <Text style={styl.btnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styl.btn, styl.delete]}
                onPress={()=>{
                  api.delete(`/questions/${question.id}`, token);
                  setDel(false);
                }}
              >
                <Text style={styl.btnText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Pressable>
  );
}
const styl = StyleSheet.create({
  str:{
    fontSize: "7rem",
    alignSelf: "flex-end",
    alignItems: "flex-end",
    justifyContent: "flex-end"
  },
  overlay: {
    flex: 1,
    backgroundColor: "#fff", // since transparent={false}, this ensures it looks non-transparent
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#eee",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  stack: {
    alignItems: "center", // vertical stacking; you can switch to "flex-start" if desired
    marginBottom: 10,
  },
  idText: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
  },
  question: {
    marginTop: 8,
    marginBottom: 16,
    color: "#444",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancel: {
    backgroundColor: colors.purple400,
  },
  delete: {
    backgroundColor: "#e53935",
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
  },
});
const qc = StyleSheet.create({
  str:{
    alignSelf: "flex-end",
    alignItems: "flex-end",
    justifyContent: "flex-end"
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: colors.neutral200,
    borderRadius: radius.lg, padding: 12,
    gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  cardSelected: {
    borderColor: colors.purple400,
    backgroundColor: colors.purple50,
  },
  cardAdded: { opacity: 0.5 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.neutral300,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxOn: { backgroundColor: colors.purple600, borderColor: colors.purple600 },
  checkboxDone: { borderColor: colors.neutral300, backgroundColor: colors.neutral100 },
  usageRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  usedText: { fontFamily: 'Nunito_700Bold', fontSize: 10.5, color: colors.purple600 },
  unusedText: { fontFamily: 'Nunito_700Bold', fontSize: 10.5, color: colors.neutral600 },
  addedText: { fontFamily: 'Nunito_700Bold', fontSize: 10.5, color: colors.neutral400 },
  text: { fontFamily: 'Outfit_500Medium', fontSize: 13.5, color: colors.neutral900, lineHeight: 19 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tagChip: {
    backgroundColor: colors.neutral50, borderWidth: 1, borderColor: colors.neutral200,
    borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2,
  },
  tagText: { fontFamily: 'Outfit_500Medium', fontSize: 10, color: colors.neutral600 },
});

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function QuestionBankScreen({ navigation, route }) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const { courseId, sectionId, existingIds: existingIdsProp = [] } = route?.params ?? {};
  const pickMode = !!sectionId;
  const existingIdSet = useMemo(() => new Set(existingIdsProp), [existingIdsProp]);

  const [questions, setQuestions]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery]           = useState('');
  const [activeTags, setActiveTags] = useState([]);
  const [sheet, setSheet]           = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [adding, setAdding]           = useState(false);

  const load = useCallback(async () => {
    try {
      const qs = await api.get('/questions', token);
      setQuestions(qs ?? []);
    } catch (e) {
      console.warn('QuestionBankScreen load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  // Extract unique tags from all questions
  const allTags = useMemo(() => {
    const seen = new Set();
    const result = [];
    questions.forEach(q => (q.tags ?? []).forEach(t => {
      if (!seen.has(t.name)) { seen.add(t.name); result.push(t); }
    }));
    return result;
  }, [questions]);

  const toggleTag = (name) =>
    setActiveTags(ts => ts.includes(name) ? ts.filter(x => x !== name) : [...ts, name]);

  const clearFilters = () => { setActiveTags([]); setQuery(''); };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const confirmAdd = async () => {
    if (selectedIds.size === 0 || adding) return;
    setAdding(true);
    try {
      await Promise.all([...selectedIds].map(qId =>
        api.post(`/sections/${sectionId}/questions/${qId}`, {}, token)
      ));
      navigation.goBack();
    } catch (e) {
      alertLib('Error', e.message ?? 'Could not add questions.');
      setAdding(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return questions.filter(item => {
      const matchesText = !q ||
        item.content?.toLowerCase().includes(q) ||
        (item.tags ?? []).some(t => t.name.toLowerCase().includes(q));
      const matchesTags = activeTags.length === 0 ||
        activeTags.every(tag => (item.tags ?? []).some(t => t.name === tag));
      return matchesText && matchesTags;
    });
  }, [questions, query, activeTags]);

  const hasFilters = activeTags.length > 0 || query.length > 0;
  const countLabel = filtered.length === questions.length
    ? `ALL ${questions.length} QUESTIONS`
    : `${filtered.length} OF ${questions.length} QUESTIONS`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral50 }}>
      <StatusBar style="dark" />
      <View style={{ height: insets.top, backgroundColor: '#fff' }} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.squareBtn, pressed && { opacity: 0.7 }]}>
            <Ionicons name="chevron-back" size={20} color={colors.neutral900} />
          </Pressable>
          {!pickMode && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => navigation.navigate('QuestionEditor', { courseId })}
                style={({ pressed }) => [styles.squareBtn, styles.squareBtnPrimary, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="add" size={22} color="#fff" />
              </Pressable>
              <Pressable onPress={() => setSheet(true)} style={({ pressed }) => [styles.squareBtn, pressed && { opacity: 0.7 }]}>
                <Ionicons name="ellipsis-horizontal" size={20} color={colors.neutral900} />
              </Pressable>
            </View>
          )}
        </View>
        <Text style={styles.title}>{pickMode ? 'Add to Section' : 'Question Bank'}</Text>
        <Text style={styles.subtitle}>
          {pickMode
            ? `Tap questions to select them · ${selectedIds.size} selected`
            : `${questions.length} reusable questions`}
        </Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchPill}>
          <Ionicons name="search-outline" size={16} color={colors.neutral600} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search questions"
            placeholderTextColor={colors.neutral400}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} style={styles.clearBtn} hitSlop={6}>
              <Ionicons name="close" size={11} color={colors.neutral800} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Tag filter */}
      <View style={styles.tagBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagScroll}>
          <FilterChip
            label="All"
            active={activeTags.length === 0}
            onPress={clearFilters}
            icon={<Ionicons name="filter-outline" size={11} color={activeTags.length === 0 ? '#fff' : colors.neutral800} />}
          />
          {allTags.map(tag => (
            <FilterChip
              key={tag.id}
              label={tag.name}
              active={activeTags.includes(tag.name)}
              onPress={() => toggleTag(tag.name)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Count row */}
        <View style={styles.countRow}>
          <Text style={styles.countLabel}>{countLabel}</Text>
          {hasFilters && (
            <Pressable onPress={clearFilters} hitSlop={6}>
              <Text style={styles.clearText}>Clear filters</Text>
            </Pressable>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={colors.purple400} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No matching questions</Text>
            <Text style={styles.emptySub}>Try removing a tag or adjusting your search.</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {filtered.map(q => (
              <QuestionCard
                token={token}
                key={q.id}
                question={q}
                pickMode={pickMode}
                selected={selectedIds.has(q.id)}
                alreadyAdded={existingIdSet.has(q.id)}
                onPress={pickMode
                  ? (q) => toggleSelect(q.id)
                  : (q) => navigation.navigate('QuestionEditor', { questionId: q.id, courseId })
                }
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Pick mode — sticky confirm bar */}
      {pickMode && (
        <View style={[styles.pickBar, { paddingBottom: insets.bottom + 10 }]}>
          <Text style={styles.pickBarCount}>
            {selectedIds.size === 0 ? 'Tap to select' : `${selectedIds.size} selected`}
          </Text>
          <Pressable
            onPress={confirmAdd}
            disabled={selectedIds.size === 0 || adding}
            style={({ pressed }) => [
              styles.pickBarBtn,
              (selectedIds.size === 0 || adding) && styles.pickBarBtnDisabled,
              pressed && selectedIds.size > 0 && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.pickBarBtnText}>
              {adding ? 'Adding…' : `Add${selectedIds.size > 0 ? ` ${selectedIds.size}` : ''} question${selectedIds.size === 1 ? '' : 's'}`}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Options sheet */}
      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Question Bank">
        <Text style={styles.sheetHint}>Add, organize, and share questions across your classes.</Text>
        <OptionRow
          icon="add-circle-outline"
          label="Add question"
          sub="Create a new reusable question"
          onPress={() => { setSheet(false); navigation.navigate('QuestionEditor', { courseId }); }}
          primary
        />
        <OptionRow icon="download-outline"   label="Import from CSV"    sub="Bulk-import a question set"         disabled />
        <OptionRow icon="pricetag-outline"   label="Manage tags"         sub="Rename, merge, or remove tags"     disabled />
        <OptionRow icon="copy-outline"       label="Duplicate selected"  sub="Copy as a starting point"          disabled />
        <OptionRow icon="archive-outline"    label="Archive unused"      sub="Hide questions not in any section"  disabled subdued />
      </Sheet>
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
  squareBtnPrimary: {
    backgroundColor: colors.purple600,
    borderColor: colors.purple600,
  },
  title: { fontFamily: 'Nunito_900Black', fontSize: 26, color: colors.neutral900, lineHeight: 30 },
  subtitle: { fontFamily: 'Outfit_500Medium', fontSize: 12, color: colors.neutral600, marginTop: 3 },
  searchBar: { backgroundColor: '#fff', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 },
  searchPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: colors.neutral200,
    borderRadius: 999, paddingHorizontal: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  searchInput: {
    flex: 1, paddingVertical: 11,
    fontFamily: 'Outfit_500Medium', fontSize: 14, color: colors.neutral900,
  },
  clearBtn: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.neutral100, alignItems: 'center', justifyContent: 'center',
  },
  tagBar: {
    backgroundColor: '#fff',
    paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: colors.neutral100,
  },
  tagScroll: { paddingHorizontal: 14, gap: 6 },
  list: { padding: 14, paddingBottom: 40 },
  countRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  countLabel: {
    fontFamily: 'Outfit_500Medium', fontSize: 10.5, letterSpacing: 0.4,
    color: colors.neutral600, textTransform: 'uppercase',
  },
  clearText: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 11,
    color: colors.purple600, letterSpacing: 0.4, textTransform: 'uppercase',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: colors.neutral200, borderStyle: 'dashed',
    borderRadius: radius.lg, padding: 24, alignItems: 'center',
  },
  emptyTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: colors.neutral800, marginBottom: 4 },
  emptySub: { fontFamily: 'Outfit_500Medium', fontSize: 12.5, color: colors.neutral600, textAlign: 'center' },
  sheetHint: { fontFamily: 'Outfit_500Medium', fontSize: 13, color: colors.neutral600, marginBottom: 14 },
  pickBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: colors.neutral200,
    paddingHorizontal: 14, paddingTop: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 8,
  },
  pickBarCount: {
    flex: 1, fontFamily: 'Outfit_500Medium', fontSize: 13, color: colors.neutral600,
  },
  pickBarBtn: {
    backgroundColor: colors.purple600,
    paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: radius.md,
    shadowColor: colors.purple800, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1, shadowRadius: 0, elevation: 3,
  },
  pickBarBtnDisabled: {
    backgroundColor: colors.neutral200,
    shadowOpacity: 0,
  },
  pickBarBtnText: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: '#fff',
  },
});
