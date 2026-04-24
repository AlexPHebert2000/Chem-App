import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  TextInput, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, typeScale, spacing, radius, screenPadding } from '../../theme';

export default function ChapterScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const { chapterId, chapterName } = useRoute().params;

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

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

  useEffect(() => { fetchSections(); }, [fetchSections]);

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
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('Section', { sectionId: item.id, sectionName: item.name })}
        activeOpacity={0.8}
      >
        <View style={styles.cardLeft}>
          <View style={styles.indexBadge}><Text style={styles.indexText}>{index + 1}</Text></View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardMeta}>{item.description}</Text>
          </View>
        </View>
        <Text style={styles.count}>{item._count.questions} Q</Text>
      </TouchableOpacity>
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
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalVisible(false); setName(''); setDescription(''); }} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={[styles.saveShadow, !canSave && styles.saveShadowDisabled]}>
                <TouchableOpacity style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]} onPress={handleCreate} activeOpacity={0.85} disabled={!canSave}>
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

  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.purple50, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.purple100,
    padding: spacing[4], marginBottom: spacing[3],
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing[3] },
  indexBadge: {
    width: 32, height: 32, borderRadius: radius.full,
    backgroundColor: colors.gold100, alignItems: 'center', justifyContent: 'center',
  },
  indexText: { ...typeScale.label, color: colors.gold800 },
  cardBody: { flex: 1 },
  cardTitle: { ...typeScale.h3, color: colors.purple800 },
  cardMeta: { ...typeScale.small, color: colors.neutral600, marginTop: 2 },
  count: { ...typeScale.caption, color: colors.purple400, marginLeft: spacing[2] },

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
