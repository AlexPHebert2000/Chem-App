import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, FlatList, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import ScreenHeader from '../../components/ScreenHeader';
import QuestionCard from '../../components/QuestionCard';
import EmptyState from '../../components/EmptyState';
import ShadowButton from '../../components/ShadowButton';
import { colors, spacing, screenPadding } from '../../theme';

export default function QuestionBankScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <View style={styles.container}>
      <ScreenHeader title="Question Bank" />

      {loading ? (
        <ActivityIndicator color={colors.purple400} style={{ marginTop: spacing[6] }} />
      ) : (
        <FlatList
          data={questions}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <QuestionCard
              question={item}
              index={index}
              onPress={() => navigation.navigate('QuestionDetail', { question: item })}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState title="No questions yet. Create your first one!" />}
        />
      )}

      <ShadowButton
        label="+ New Question"
        onPress={() => navigation.navigate('CreateQuestion', {})}
        style={styles.fab}
        paddingHorizontal={spacing[6]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  list: { paddingHorizontal: screenPadding.horizontal, paddingBottom: 120 },
  fab: { position: 'absolute', bottom: 36, alignSelf: 'center' },
});
