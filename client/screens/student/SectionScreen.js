import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import ScreenHeader from '../../components/ScreenHeader';
import QuestionView from '../../components/QuestionView';
import { colors, typeScale, spacing, radius, screenPadding } from '../../theme';

export default function SectionScreen() {
  const { token }  = useAuth();
  const navigation = useNavigation();
  const { sectionId, sectionName, courseId } = useRoute().params;

  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [questions, setQuestions]   = useState([]);
  const [sessionId, setSessionId]   = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);

  const [completing, setCompleting]         = useState(false);
  const [completionData, setCompletionData] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const [qs, { sessionId: sid }] = await Promise.all([
          api.get(`/sections/${sectionId}/questions`, token),
          api.post('/study/start', { courseId }, token),
        ]);
        if (!mounted) return;
        setQuestions(qs);
        setSessionId(sid);
      } catch (e) {
        if (mounted) setError(e.message || 'Could not load section');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();
    return () => { mounted = false; };
  }, [sectionId, courseId, token]);

  const question       = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  function goNext() {
    setCurrentIndex(i => i + 1);
  }

  async function handleSubmit(choiceIds) {
    return api.post(`/questions/${question.id}/attempt`, { sessionId, choiceIds }, token);
  }

  async function completeSection() {
    if (completing) return;
    setCompleting(true);
    try {
      const data = await api.post(`/sections/${sectionId}/complete`, {}, token);
      setCompletionData(data);
      if (sessionId) {
        api.post('/study/end', { sessionId }, token).catch(() => {});
      }
    } catch (e) {
      if (e.message?.includes('already completed')) {
        setCompletionData({ alreadyCompleted: true });
      } else {
        Alert.alert('Error', e.message || 'Could not complete section');
        setCompleting(false);
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={sectionName} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.purple400} size="large" />
          <Text style={styles.loadingText}>Preparing questions…</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={sectionName} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={sectionName} />
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No questions yet</Text>
          <Text style={styles.emptyBody}>Your teacher hasn't added questions to this section.</Text>
        </View>
      </View>
    );
  }

  if (completionData) {
    const score   = completionData.studentSection?.score ?? null;
    const xp      = completionData.xpEarned ?? 0;
    const already = completionData.alreadyCompleted;
    return (
      <View style={styles.container}>
        <ScreenHeader title={sectionName} />
        <ScrollView contentContainerStyle={styles.completionScroll}>
          <View style={styles.completionCard}>
            <Text style={styles.completionEmoji}>{score >= 70 ? '🎉' : '📚'}</Text>
            <Text style={styles.completionTitle}>
              {already ? 'Already Complete' : 'Section Complete!'}
            </Text>
            {score != null && <Text style={styles.completionScore}>{score}%</Text>}
            {xp > 0 && <Text style={styles.completionXp}>+{xp} XP earned</Text>}
          </View>
          <View style={styles.doneRow}>
            <View style={styles.doneShadow}>
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.85}
              >
                <Text style={styles.doneBtnText}>Back to Course</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  const allDone = currentIndex >= questions.length;
  if (allDone) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={sectionName} />
        <View style={styles.center}>
          <Text style={styles.allDoneEmoji}>✅</Text>
          <Text style={styles.allDoneTitle}>All questions answered!</Text>
          <Text style={styles.allDoneBody}>Tap below to save your progress.</Text>
          <View style={[styles.doneShadow, { marginTop: spacing[6], width: '100%' }]}>
            <TouchableOpacity
              style={[styles.doneBtn, completing && { opacity: 0.6 }]}
              onPress={completeSection}
              disabled={completing}
              activeOpacity={0.85}
            >
              <Text style={styles.doneBtnText}>
                {completing ? 'Saving…' : 'Complete Section'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={sectionName} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Progress */}
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>Question {currentIndex + 1} of {questions.length}</Text>
          <View style={styles.progressPills}>
            {questions.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressPill,
                  i < currentIndex && styles.progressPillDone,
                  i === currentIndex && styles.progressPillCurrent,
                ]}
              />
            ))}
          </View>
        </View>

        <QuestionView
          question={question}
          onSubmit={handleSubmit}
          nextLabel={isLastQuestion ? 'Finish' : 'Next Question →'}
          onNext={goNext}
        />

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  scroll:    { paddingHorizontal: screenPadding.horizontal, paddingBottom: 48 },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: screenPadding.horizontal,
  },
  loadingText: { ...typeScale.body, color: colors.neutral500, marginTop: spacing[3] },
  errorText:   { ...typeScale.body, color: colors.coral600, textAlign: 'center' },
  emptyTitle:  { ...typeScale.h3, color: colors.purple800, marginBottom: spacing[2] },
  emptyBody:   { ...typeScale.body, color: colors.neutral600, textAlign: 'center' },

  progressRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing[4], marginTop: spacing[2],
  },
  progressText:        { ...typeScale.label, color: colors.neutral600 },
  progressPills:       { flexDirection: 'row', gap: 4 },
  progressPill:        { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.purple100 },
  progressPillDone:    { backgroundColor: colors.teal400 },
  progressPillCurrent: { backgroundColor: colors.purple400, width: 16 },

  allDoneEmoji: { fontSize: 48, marginBottom: spacing[3] },
  allDoneTitle: { ...typeScale.h2, color: colors.purple800, marginBottom: spacing[2] },
  allDoneBody:  { ...typeScale.body, color: colors.neutral600, textAlign: 'center' },

  completionScroll: { paddingHorizontal: screenPadding.horizontal, paddingBottom: 48, flexGrow: 1 },
  completionCard: {
    backgroundColor: '#fff', borderRadius: radius.xl,
    borderWidth: 1.5, borderColor: colors.purple100,
    padding: spacing[6], alignItems: 'center',
    marginTop: spacing[6],
  },
  completionEmoji: { fontSize: 56, marginBottom: spacing[3] },
  completionTitle: { ...typeScale.h2, color: colors.purple800, marginBottom: spacing[2] },
  completionScore: { ...typeScale.display ?? typeScale.h1, color: colors.purple400, marginBottom: spacing[1] },
  completionXp:    { ...typeScale.h3, color: colors.gold600 },

  doneRow: { marginTop: spacing[5] },
  doneShadow: {
    backgroundColor: colors.purple800, borderRadius: radius.full, transform: [{ translateY: 4 }],
  },
  doneBtn: {
    backgroundColor: colors.purple400, borderRadius: radius.full,
    paddingVertical: 16, alignItems: 'center', transform: [{ translateY: -4 }],
  },
  doneBtnText: { ...typeScale.button, color: colors.neutral900 },
});
