import { useState, useCallback, useEffect, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, FlatList, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import ScreenHeader from '../../components/ScreenHeader';
import QuestionCard from '../../components/QuestionCard';
import TagFilterHeader from '../../components/TagFilterHeader';
import EmptyState from '../../components/EmptyState';
import ShadowButton from '../../components/ShadowButton';
import { colors, spacing, screenPadding } from '../../theme';

export default function QuestionPickerScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const { sectionId, alreadyAddedIds = [] } = useRoute().params;

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [adding, setAdding] = useState(false);

  const [filterTags, setFilterTags] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [tagInput, setTagInput] = useState('');

  const alreadyAdded = new Set(alreadyAddedIds);

  const fetchQuestions = useCallback(async () => {
    try {
      const data = await api.get('/questions', token);
      setQuestions(data);
    } catch {
      Alert.alert('Error', 'Could not load questions.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(fetchQuestions);

  const allTags = useMemo(() => {
    const map = new Map();
    questions.forEach(q => q.tags?.forEach(t => map.set(t.id, t)));
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [questions]);

  useEffect(() => {
    if (filterTags.length === 0) {
      setFilteredList(questions);
      return;
    }
    setFilteredList(questions.filter(q =>
      filterTags.every(ft => (q.tagIds ?? []).includes(ft.id))
    ));
  }, [questions, filterTags]);

  const tagSuggestions = tagInput.trim()
    ? allTags
        .filter(t =>
          t.name.toLowerCase().includes(tagInput.trim().toLowerCase()) &&
          !filterTags.some(f => f.id === t.id)
        )
        .slice(0, 5)
    : [];

  function addFilterTag(tag) {
    setFilterTags(prev => [...prev, tag]);
    setTagInput('');
  }

  function toggleSelect(id) {
    if (alreadyAdded.has(id)) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  async function handleAddSelected() {
    if (selected.size === 0 || adding) return;
    setAdding(true);
    const ids = Array.from(selected);
    const failed = [];
    for (const questionId of ids) {
      try {
        await api.post(`/sections/${sectionId}/questions/${questionId}`, {}, token);
      } catch {
        failed.push(questionId);
      }
    }
    setAdding(false);
    if (failed.length > 0) {
      Alert.alert('Partial Error', `${failed.length} question(s) could not be added. Please try again.`);
    } else {
      navigation.goBack();
    }
  }

  const selectedCount = selected.size;
  const isDisabled = selectedCount === 0 || adding;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Add from Bank" subtitle="Select questions to add" />

      {loading ? (
        <ActivityIndicator color={colors.purple400} style={{ marginTop: spacing[6] }} />
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <QuestionCard
              question={item}
              index={index}
              onPress={() => toggleSelect(item.id)}
              isAdded={alreadyAdded.has(item.id)}
              isSelected={selected.has(item.id)}
            />
          )}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <TagFilterHeader
              tagInput={tagInput}
              onTagInput={setTagInput}
              suggestions={tagSuggestions}
              filterTags={filterTags}
              onAddTag={addFilterTag}
              onRemoveTag={id => setFilterTags(prev => prev.filter(t => t.id !== id))}
              noMatchMessage="No questions match all selected tags."
              loading={loading}
            />
          }
          ListEmptyComponent={
            filterTags.length === 0
              ? <EmptyState title="No questions in your bank yet. Create some first!" />
              : null
          }
          keyboardShouldPersistTaps="handled"
        />
      )}

      <View style={styles.bottomBar}>
        <ShadowButton
          label={adding ? 'Adding…' : selectedCount === 0 ? 'Select Questions' : `Add ${selectedCount} Selected`}
          onPress={handleAddSelected}
          disabled={isDisabled}
          paddingVertical={16}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  list: { paddingHorizontal: screenPadding.horizontal, paddingBottom: 120 },
  bottomBar: {
    position: 'absolute',
    bottom: 36,
    left: screenPadding.horizontal,
    right: screenPadding.horizontal,
  },
});
