import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import ScreenHeader from '../../components/ScreenHeader';
import QuestionView from '../../components/QuestionView';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { colors, typeScale, spacing, radius, screenPadding } from '../../theme';

const DIFFICULTY_LABEL = ['', '★', '★★', '★★★', '★★★★', '★★★★★'];

export default function QuestionPreviewScreen() {
  const { question } = useRoute().params;
  const { token } = useAuth();
  const isDynamic = question.type === 'DYNAMIC';

  const [resolvedQuestion, setResolvedQuestion] = useState(null);
  const [resolving, setResolving]               = useState(isDynamic);
  const [resolveError, setResolveError]         = useState(null);

  const fetchResolved = useCallback(async () => {
    setResolving(true);
    setResolveError(null);
    setResolvedQuestion(null);
    try {
      const data = await api.get(`/questions/${question.id}/preview`, token);
      setResolvedQuestion(data);
    } catch (e) {
      setResolveError(e.message || 'Could not generate preview');
    } finally {
      setResolving(false);
    }
  }, [question.id, token]);

  useEffect(() => {
    if (isDynamic) fetchResolved();
  }, [isDynamic, fetchResolved]);

  async function handleLocalSubmit(choiceIds, q) {
    const isFIB = q.type === 'FILL_IN_BLANK';
    if (isFIB) {
      const isCorrect = choiceIds.every(id => q.choices.find(c => c.id === id)?.isCorrect);
      return {
        isCorrect,
        xpDelta: 0,
        explanation: isCorrect ? (q.correctExplanation ?? '—') : (q.incorrectExplanation ?? '—'),
      };
    }
    const choice    = q.choices.find(c => c.id === choiceIds[0]);
    const isCorrect = choice?.isCorrect ?? false;
    return {
      isCorrect,
      xpDelta: 0,
      explanation: isCorrect ? (q.correctExplanation ?? '—') : (q.incorrectExplanation ?? '—'),
    };
  }

  const activeQuestion = isDynamic ? resolvedQuestion : question;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Question" subtitle="Student Preview" />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.metaRow}>
          <Text style={styles.previewBadge}>PREVIEW MODE</Text>
          <Text style={styles.difficulty}>{DIFFICULTY_LABEL[question.difficulty]}</Text>
        </View>

        {isDynamic && resolving && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.purple400} size="large" />
            <Text style={styles.loadingText}>Generating question…</Text>
          </View>
        )}

        {isDynamic && resolveError && (
          <View style={styles.center}>
            <Text style={styles.errorText}>{resolveError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchResolved} activeOpacity={0.7}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeQuestion && !resolving && (
          <QuestionView
            key={resolvedQuestion?.content ?? question.id}
            question={activeQuestion}
            onSubmit={handleLocalSubmit}
            nextLabel={isDynamic ? 'New Question' : 'Try Again'}
            onNext={isDynamic ? fetchResolved : () => {}}
          />
        )}

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  scroll:    { paddingHorizontal: screenPadding.horizontal, paddingBottom: 48 },

  metaRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing[4], marginTop: spacing[2],
  },
  previewBadge: {
    ...typeScale.label, color: colors.purple400,
    backgroundColor: colors.purple50, paddingHorizontal: spacing[3], paddingVertical: spacing[1],
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.purple200,
  },
  difficulty: { ...typeScale.h3, color: colors.gold600 },

  center: { alignItems: 'center', paddingVertical: spacing[6] },
  loadingText: { ...typeScale.body, color: colors.neutral500, marginTop: spacing[3] },
  errorText:   { ...typeScale.body, color: colors.coral600, textAlign: 'center', marginBottom: spacing[3] },
  retryBtn:    { padding: spacing[3] },
  retryText:   { ...typeScale.label, color: colors.purple400 },
});
