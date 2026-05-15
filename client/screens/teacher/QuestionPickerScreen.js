import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, typeScale, spacing, radius, screenPadding } from '../../theme';

const DIFFICULTY_LABEL = ['', '★', '★★', '★★★', '★★★★', '★★★★★'];
const TYPE_LABEL = { MULTIPLE_CHOICE: 'Multiple Choice', FILL_IN_BLANK: 'Fill in Blank', DYNAMIC: 'Dynamic' };

export default function QuestionPickerScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const { sectionId, alreadyAddedIds = [] } = useRoute().params;

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [adding, setAdding] = useState(false);

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

  function toggleSelect(id) {
    if (alreadyAdded.has(id)) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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

  function renderQuestion({ item, index }) {
    const isAdded = alreadyAdded.has(item.id);
    const isSelected = selected.has(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isAdded && styles.cardAdded,
          isSelected && styles.cardSelected,
        ]}
        onPress={() => toggleSelect(item.id)}
        activeOpacity={isAdded ? 1 : 0.8}
        disabled={isAdded}
      >
        <View style={styles.cardTop}>
          <View style={[styles.typePill, isAdded && styles.typePillAdded]}>
            <Text style={[styles.typeText, isAdded && styles.typeTextAdded]}>
              {TYPE_LABEL[item.type]}
            </Text>
          </View>
          <View style={styles.cardTopRight}>
            <Text style={[styles.difficulty, isAdded && styles.difficultyAdded]}>
              {DIFFICULTY_LABEL[item.difficulty]}
            </Text>
            {isAdded && (
              <View style={styles.addedBadge}>
                <Text style={styles.addedBadgeText}>✓ Added</Text>
              </View>
            )}
            {isSelected && !isAdded && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>✓</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={[styles.content, isAdded && styles.contentAdded]}>
          {index + 1}. {item.content}
        </Text>
        <Text style={[styles.choiceCount, isAdded && styles.choiceCountAdded]}>
          {item.choices.length} choices
        </Text>
      </TouchableOpacity>
    );
  }

  const selectedCount = selected.size;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Add from Bank" subtitle="Select questions to add" />

      {loading ? (
        <ActivityIndicator color={colors.purple400} style={{ marginTop: spacing[6] }} />
      ) : (
        <FlatList
          data={questions}
          keyExtractor={item => item.id}
          renderItem={renderQuestion}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No questions in your bank yet. Create some first!</Text>
          }
        />
      )}

      <View style={styles.bottomBar}>
        <View style={[styles.addShadow, (selectedCount === 0 || adding) && styles.addShadowDisabled]}>
          <TouchableOpacity
            style={[styles.addBtn, (selectedCount === 0 || adding) && styles.addBtnDisabled]}
            onPress={handleAddSelected}
            activeOpacity={0.85}
            disabled={selectedCount === 0 || adding}
          >
            <Text style={styles.addBtnText}>
              {adding
                ? 'Adding…'
                : selectedCount === 0
                  ? 'Select Questions'
                  : `Add ${selectedCount} Selected`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  list: { paddingHorizontal: screenPadding.horizontal, paddingBottom: 120 },

  card: {
    backgroundColor: colors.purple50, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.purple100,
    padding: spacing[4], marginBottom: spacing[3],
  },
  cardAdded: {
    backgroundColor: colors.neutral100,
    borderColor: colors.neutral200,
    opacity: 0.6,
  },
  cardSelected: {
    borderColor: colors.purple400,
    backgroundColor: colors.purple100,
  },

  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },

  typePill: {
    backgroundColor: colors.purple100, borderRadius: radius.sm,
    paddingHorizontal: spacing[2], paddingVertical: 2,
  },
  typePillAdded: { backgroundColor: colors.neutral200 },
  typeText: { ...typeScale.caption, color: colors.purple800 },
  typeTextAdded: { color: colors.neutral600 },

  difficulty: { ...typeScale.caption, color: colors.gold600 },
  difficultyAdded: { color: colors.neutral400 },

  addedBadge: {
    backgroundColor: colors.neutral200, borderRadius: radius.sm,
    paddingHorizontal: spacing[2], paddingVertical: 2,
  },
  addedBadgeText: { ...typeScale.caption, color: colors.neutral600 },

  selectedBadge: {
    width: 22, height: 22, borderRadius: radius.full,
    backgroundColor: colors.purple400,
    alignItems: 'center', justifyContent: 'center',
  },
  selectedBadgeText: { ...typeScale.caption, color: colors.neutral900, fontWeight: '700' },

  content: { ...typeScale.body, color: colors.purple900, marginBottom: spacing[2] },
  contentAdded: { color: colors.neutral600 },
  choiceCount: { ...typeScale.caption, color: colors.neutral600 },
  choiceCountAdded: { color: colors.neutral400 },

  empty: { ...typeScale.body, color: colors.neutral400, textAlign: 'center', marginTop: spacing[6] },

  bottomBar: {
    position: 'absolute', bottom: 36, left: screenPadding.horizontal, right: screenPadding.horizontal,
  },
  addShadow: {
    backgroundColor: colors.purple800, borderRadius: radius.full, transform: [{ translateY: 4 }],
  },
  addShadowDisabled: { backgroundColor: colors.purple200 },
  addBtn: {
    backgroundColor: colors.purple400, borderRadius: radius.full,
    paddingVertical: 16, alignItems: 'center', transform: [{ translateY: -4 }],
  },
  addBtnDisabled: { backgroundColor: colors.purple100 },
  addBtnText: { ...typeScale.button, color: colors.neutral900 },
});
