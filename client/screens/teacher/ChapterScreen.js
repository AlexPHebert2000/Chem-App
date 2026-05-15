import { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, typeScale, spacing, radius, screenPadding } from '../../theme';

const DIFFICULTY_LABEL = ['', '★', '★★', '★★★', '★★★★', '★★★★★'];
const TYPE_LABEL = { MULTIPLE_CHOICE: 'MC', FILL_IN_BLANK: 'FIB' };

export default function ChapterScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const { chapterId, chapterName } = useRoute().params;

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [sectionQuestions, setSectionQuestions] = useState({});
  const [loadingQuestions, setLoadingQuestions] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Ref so useFocusEffect can read expandedId without a stale closure
  const expandedIdRef = useRef(null);

  const fetchSections = useCallback(async () => {
    try {
      const data = await api.get(`/chapters/${chapterId}/sections`, token);
      setSections(data);
    } catch {
      Alert.alert('Error', 'Could not load sections.');
    } finally {
      setLoading(false);
    }
  }, [chapterId, token]);

  const fetchSectionQuestions = useCallback(async (sectionId) => {
    setLoadingQuestions(prev => ({ ...prev, [sectionId]: true }));
    try {
      const data = await api.get(`/sections/${sectionId}/questions`, token);
      setSectionQuestions(prev => ({ ...prev, [sectionId]: data }));
    } catch {
      Alert.alert('Error', 'Could not load questions.');
    } finally {
      setLoadingQuestions(prev => ({ ...prev, [sectionId]: false }));
    }
  }, [token]);

  // Refresh sections and re-fetch open drawer on every focus (e.g. return from QuestionPicker)
  useFocusEffect(useCallback(() => {
    fetchSections();
    const id = expandedIdRef.current;
    if (id) fetchSectionQuestions(id);
  }, [fetchSections, fetchSectionQuestions]));

  function toggleSection(sectionId) {
    if (expandedId === sectionId) {
      setExpandedId(null);
      expandedIdRef.current = null;
      return;
    }
    setExpandedId(sectionId);
    expandedIdRef.current = sectionId;
    fetchSectionQuestions(sectionId);
  }

  async function handleCreate() {
    if (!name.trim() || !description.trim()) return;
    setSaving(true);
    try {
      const section = await api.post(`/chapters/${chapterId}/sections`, { name, description }, token);
      setSections(prev => [...prev, { ...section, _count: { questions: 0 } }]);
      setName(''); setDescription(''); setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Could not create section.');
    } finally {
      setSaving(false);
    }
  }

  function renderSection({ item, index }) {
    const isExpanded = expandedId === item.id;
    const questions = sectionQuestions[item.id] || [];
    const loadingQ = loadingQuestions[item.id];
    const questionCount = sectionQuestions[item.id]
      ? sectionQuestions[item.id].length
      : item._count.questions;

    return (
      <View style={styles.sectionWrapper}>
        <TouchableOpacity
          style={[styles.card, isExpanded && styles.cardOpen]}
          onPress={() => toggleSection(item.id)}
          activeOpacity={0.8}
        >
          <View style={styles.cardLeft}>
            <View style={styles.indexBadge}>
              <Text style={styles.indexText}>{index + 1}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>{item.description}</Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.count}>{questionCount} Q</Text>
            <Text style={styles.chevron}>{isExpanded ? '▴' : '▾'}</Text>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.drawer}>
            {loadingQ ? (
              <ActivityIndicator
                color={colors.purple400}
                style={{ paddingVertical: spacing[4] }}
              />
            ) : (
              <ScrollView
                style={styles.questionScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {questions.length === 0 ? (
                  <Text style={styles.drawerEmpty}>No questions yet.</Text>
                ) : (
                  questions.map((q, qi) => (
                    <TouchableOpacity
                      key={q.id}
                      style={[styles.questionRow, qi === questions.length - 1 && styles.questionRowLast]}
                      onPress={() => navigation.navigate('QuestionDetail', { question: q, sectionId: item.id })}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.qNum}>{qi + 1}.</Text>
                      <View style={styles.qBody}>
                        <Text style={styles.qContent} numberOfLines={2}>{q.content}</Text>
                        <View style={styles.qMeta}>
                          <View style={styles.typePill}>
                            <Text style={styles.typeText}>{TYPE_LABEL[q.type]}</Text>
                          </View>
                          <Text style={styles.difficulty}>{DIFFICULTY_LABEL[q.difficulty]}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.addFromBank}
              onPress={() => navigation.navigate('QuestionPicker', {
                sectionId: item.id,
                alreadyAddedIds: questions.map(q => q.id),
              })}
              activeOpacity={0.8}
            >
              <Text style={styles.addFromBankText}>+ Add from Bank</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  const canSave = name.trim() && description.trim() && !saving;

  return (
    <View style={styles.container}>
      <ScreenHeader title={chapterName} subtitle="Sections" />

      {loading ? (
        <ActivityIndicator color={colors.purple400} style={{ marginTop: spacing[6] }} />
      ) : (
        <FlatList
          data={sections}
          keyExtractor={item => item.id}
          renderItem={renderSection}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No sections yet. Add your first one!</Text>}
        />
      )}

      <View style={styles.fabShadow}>
        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
          <Text style={styles.fabText}>+ Add Section</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New Section</Text>
            <TextInput
              style={styles.input}
              placeholder="Section name"
              placeholderTextColor={colors.neutral400}
              value={name}
              onChangeText={setName}
              autoFocus
            />
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="Description"
              placeholderTextColor={colors.neutral400}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setModalVisible(false); setName(''); setDescription(''); }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={[styles.saveShadow, !canSave && styles.saveShadowDisabled]}>
                <TouchableOpacity
                  style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
                  onPress={handleCreate}
                  activeOpacity={0.85}
                  disabled={!canSave}
                >
                  <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  list: { paddingHorizontal: screenPadding.horizontal, paddingBottom: 120 },

  sectionWrapper: { marginBottom: spacing[3] },

  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.purple50, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.purple100,
    padding: spacing[4],
  },
  cardOpen: {
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing[3] },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  indexBadge: {
    width: 32, height: 32, borderRadius: radius.full,
    backgroundColor: colors.gold100, alignItems: 'center', justifyContent: 'center',
  },
  indexText: { ...typeScale.label, color: colors.gold800 },
  cardBody: { flex: 1 },
  cardTitle: { ...typeScale.h3, color: colors.purple800 },
  cardMeta: { ...typeScale.small, color: colors.neutral600, marginTop: 2 },
  count: { ...typeScale.caption, color: colors.purple400 },
  chevron: { ...typeScale.caption, color: colors.purple400 },

  // Drawer
  drawer: {
    backgroundColor: '#fff',
    borderWidth: 1, borderTopWidth: 0, borderColor: colors.purple100,
    borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg,
    overflow: 'hidden',
  },
  questionScroll: { maxHeight: 280 },
  questionRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    borderBottomWidth: 1, borderBottomColor: colors.purple50,
    gap: spacing[2],
  },
  questionRowLast: { borderBottomWidth: 0 },
  qNum: { ...typeScale.caption, color: colors.neutral400, width: 20, paddingTop: 1 },
  qBody: { flex: 1 },
  qContent: { ...typeScale.body, color: colors.purple900, marginBottom: 4 },
  qMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  typePill: {
    backgroundColor: colors.purple50, borderRadius: radius.sm,
    paddingHorizontal: spacing[2], paddingVertical: 2,
  },
  typeText: { ...typeScale.caption, color: colors.purple600 },
  difficulty: { ...typeScale.caption, color: colors.gold600 },
  drawerEmpty: {
    ...typeScale.small, color: colors.neutral400,
    textAlign: 'center', paddingVertical: spacing[4],
  },
  addFromBank: {
    borderTopWidth: 1, borderTopColor: colors.purple100,
    paddingVertical: spacing[3], paddingHorizontal: spacing[4],
    alignItems: 'center',
    backgroundColor: colors.purple50,
  },
  addFromBankText: { ...typeScale.label, color: colors.purple600 },

  empty: { ...typeScale.body, color: colors.neutral400, textAlign: 'center', marginTop: spacing[6] },

  fabShadow: {
    position: 'absolute', bottom: 36, alignSelf: 'center',
    backgroundColor: colors.purple800, borderRadius: radius.full, transform: [{ translateY: 4 }],
  },
  fab: {
    backgroundColor: colors.purple400, borderRadius: radius.full,
    paddingVertical: 14, paddingHorizontal: spacing[6], transform: [{ translateY: -4 }],
  },
  fabText: { ...typeScale.button, color: colors.neutral900 },

  overlay: { flex: 1, backgroundColor: 'rgba(18,11,53,0.5)', justifyContent: 'center', paddingHorizontal: screenPadding.horizontal },
  sheet: { backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing[5] },
  sheetTitle: { ...typeScale.h2, color: colors.purple800, marginBottom: spacing[4] },
  input: {
    ...typeScale.body, color: colors.purple900,
    borderWidth: 1.5, borderColor: colors.purple200, borderRadius: radius.md,
    paddingHorizontal: spacing[4], paddingVertical: 12, marginBottom: spacing[3],
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[3], alignItems: 'center', marginTop: spacing[1] },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: spacing[4] },
  cancelText: { ...typeScale.label, color: colors.neutral600 },
  saveShadow: { backgroundColor: colors.purple800, borderRadius: radius.full, transform: [{ translateY: 3 }] },
  saveShadowDisabled: { backgroundColor: colors.purple200 },
  saveBtn: { backgroundColor: colors.purple400, borderRadius: radius.full, paddingVertical: 12, paddingHorizontal: spacing[5], transform: [{ translateY: -3 }] },
  saveBtnDisabled: { backgroundColor: colors.purple100 },
  saveText: { ...typeScale.button, color: colors.neutral900 },
});
