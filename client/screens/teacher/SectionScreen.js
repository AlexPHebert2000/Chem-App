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
const TYPE_LABEL = { MULTIPLE_CHOICE: 'Multiple Choice', FILL_IN_BLANK: 'Fill in Blank' };

export default function SectionScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const { sectionId, sectionName } = useRoute().params;

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQuestions = useCallback(async () => {
    try {
      const data = await api.get(`/sections/${sectionId}/questions`, token);
      setQuestions(data);
    } catch {
      Alert.alert('Error', 'Could not load questions.');
    } finally {
      setLoading(false);
    }
  }, [sectionId, token]);

  useFocusEffect(fetchQuestions);

  function renderQuestion({ item, index }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('QuestionDetail', { question: item, sectionId })}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <View style={styles.typePill}>
            <Text style={styles.typeText}>{TYPE_LABEL[item.type]}</Text>
          </View>
          <Text style={styles.difficulty}>{DIFFICULTY_LABEL[item.difficulty]}</Text>
        </View>
        <Text style={styles.content}>{index + 1}. {item.content}</Text>
        <Text style={styles.choiceCount}>{item.choices.length} choices</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={sectionName} subtitle="Questions" />

      {loading ? (
        <ActivityIndicator color={colors.purple400} style={{ marginTop: spacing[6] }} />
      ) : (
        <FlatList
          data={questions}
          keyExtractor={item => item.id}
          renderItem={renderQuestion}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No questions yet. Add your first one!</Text>}
        />
      )}

      <View style={styles.fabShadow}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateQuestion', { sectionId })}
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>+ Add Question</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  list: { paddingHorizontal: screenPadding.horizontal, paddingBottom: 120 },

  card: {
    backgroundColor: colors.purple50, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.purple100,
    padding: spacing[4], marginBottom: spacing[3],
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  typePill: {
    backgroundColor: colors.purple100, borderRadius: radius.sm,
    paddingHorizontal: spacing[2], paddingVertical: 2,
  },
  typeText: { ...typeScale.caption, color: colors.purple800 },
  difficulty: { ...typeScale.caption, color: colors.gold600 },
  content: { ...typeScale.body, color: colors.purple900, marginBottom: spacing[2] },
  choiceCount: { ...typeScale.caption, color: colors.neutral600 },

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
});
