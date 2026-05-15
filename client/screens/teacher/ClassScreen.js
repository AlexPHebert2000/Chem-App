import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import ScreenHeader from '../../components/ScreenHeader';
import FormSheet from '../../components/FormSheet';
import FormInput from '../../components/FormInput';
import EmptyState from '../../components/EmptyState';
import ShadowButton from '../../components/ShadowButton';
import { colors, typeScale, spacing, radius, screenPadding } from '../../theme';

export default function ClassScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const { courseId, courseName } = useRoute().params;

  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchChapters = useCallback(async () => {
    try {
      const data = await api.get(`/courses/${courseId}/chapters`, token);
      setChapters(data);
    } catch {
      Alert.alert('Error', 'Could not load chapters.');
    } finally {
      setLoading(false);
    }
  }, [courseId, token]);

  useEffect(() => { fetchChapters(); }, [fetchChapters]);

  async function handleCreate() {
    if (!name.trim() || !description.trim()) return;
    setSaving(true);
    try {
      const chapter = await api.post(`/courses/${courseId}/chapters`, { name, description }, token);
      setChapters(prev => [...prev, { ...chapter, _count: { sections: 0 } }]);
      setName(''); setDescription(''); setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Could not create chapter.');
    } finally {
      setSaving(false);
    }
  }

  function closeModal() { setModalVisible(false); setName(''); setDescription(''); }

  function renderChapter({ item, index }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('Chapter', { chapterId: item.id, chapterName: item.name })}
        activeOpacity={0.8}
      >
        <View style={styles.cardLeft}>
          <View style={styles.indexBadge}><Text style={styles.indexText}>{index + 1}</Text></View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardMeta}>{item.description}</Text>
          </View>
        </View>
        <Text style={styles.count}>{item._count.sections} section{item._count.sections !== 1 ? 's' : ''}</Text>
      </TouchableOpacity>
    );
  }

  const canSave = !!(name.trim() && description.trim() && !saving);

  return (
    <View style={styles.container}>
      <ScreenHeader title={courseName} subtitle="Chapters" />

      {loading ? (
        <ActivityIndicator color={colors.purple400} style={{ marginTop: spacing[6] }} />
      ) : (
        <FlatList
          data={chapters}
          keyExtractor={item => item.id}
          renderItem={renderChapter}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState title="No chapters yet. Add your first one!" />}
        />
      )}

      <ShadowButton
        label="+ Add Chapter"
        onPress={() => setModalVisible(true)}
        style={styles.fab}
        paddingHorizontal={spacing[6]}
      />

      <FormSheet
        visible={modalVisible}
        title="New Chapter"
        onClose={closeModal}
        onSave={handleCreate}
        canSave={canSave}
        isSaving={saving}
      >
        <FormInput
          placeholder="Chapter name"
          value={name}
          onChangeText={setName}
          autoFocus
        />
        <FormInput
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />
      </FormSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  list: { paddingHorizontal: screenPadding.horizontal, paddingBottom: 120 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.purple50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.purple100,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing[3] },
  indexBadge: {
    width: 32, height: 32, borderRadius: radius.full,
    backgroundColor: colors.purple200, alignItems: 'center', justifyContent: 'center',
  },
  indexText: { ...typeScale.label, color: colors.purple800 },
  cardBody: { flex: 1 },
  cardTitle: { ...typeScale.h3, color: colors.purple800 },
  cardMeta: { ...typeScale.small, color: colors.neutral600, marginTop: 2 },
  count: { ...typeScale.caption, color: colors.purple400, marginLeft: spacing[2] },

  fab: { position: 'absolute', bottom: 36, alignSelf: 'center' },
});
