import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import ScreenHeader from '../../components/ScreenHeader';
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
  const [selected, setSelected]         = useState(null);
  const [result, setResult]             = useState(null);
  const [submitting, setSubmitting]     = useState(false);

  const [completing, setCompleting]     = useState(false);
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

  // ── Per-question helpers ───────────────────────────────────────────────────

  const question    = questions[currentIndex];
  const isMC       = question?.type === 'MULTIPLE_CHOICE';
  const isDynamic  = question?.type === 'DYNAMIC';
  const isFIB      = question?.type === 'FILL_IN_BLANK';
  const isChoiceBased = isMC || isDynamic;

  const blankIndices = isFIB
    ? [...new Set((question?.choices ?? []).map(c => c.blankIndex))].sort((a, b) => a - b)
    : [];

  function canSubmit() {
    if (!question || result) return false;
    if (isChoiceBased) return selected !== null;
    if (isFIB) return blankIndices.every(b => selected?.[b] != null);
    return false;
  }

  function handleChoiceSelect(choiceId) {
    if (result) return;
    setSelected(choiceId);
  }

  function handleFIBSelect(blankIndex, choiceId) {
    if (result) return;
    setSelected(prev => ({
      ...((prev && typeof prev === 'object') ? prev : {}),
      [blankIndex]: prev?.[blankIndex] === choiceId ? undefined : choiceId,
    }));
  }

  async function submitAnswer() {
    if (!canSubmit() || submitting) return;
    setSubmitting(true);
    try {
      const choiceIds = isChoiceBased
        ? [selected]
        : blankIndices.map(b => selected[b]);
      const res = await api.post(`/questions/${question.id}/attempt`, { sessionId, choiceIds }, token);
      setResult(res);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not submit answer');
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    setCurrentIndex(i => i + 1);
    setSelected(null);
    setResult(null);
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

  // Completion summary
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

  // After all questions answered
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

  const isLastQuestion = currentIndex === questions.length - 1;
  const correct = result?.isCorrect;

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

        {/* Question card */}
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{question.content}</Text>
        </View>

        {/* Choices */}
        {isChoiceBased && (
          <View style={styles.choiceList}>
            {(question.choices ?? []).map((choice) => {
              const isSelected = selected === choice.id;
              let state = isSelected ? 'selected' : 'idle';
              if (result) {
                if (isSelected && correct)  state = 'correct';
                if (isSelected && !correct) state = 'wrong';
              }
              return (
                <ChoiceButton
                  key={choice.id}
                  label={choice.content}
                  state={state}
                  onPress={() => handleChoiceSelect(choice.id)}
                />
              );
            })}
          </View>
        )}

        {isFIB && (
          <View style={styles.fibContainer}>
            {blankIndices.map((blankIdx, groupI) => {
              const blankChoices = question.choices.filter(c => c.blankIndex === blankIdx);
              const chosenId     = selected?.[blankIdx];
              return (
                <View key={blankIdx} style={styles.fibGroup}>
                  <Text style={styles.fibLabel}>Blank {groupI + 1}</Text>
                  <View style={styles.fibChips}>
                    {blankChoices.map(c => {
                      const chosen = chosenId === c.id;
                      let chipState = chosen ? 'selected' : 'idle';
                      if (result && chosen) chipState = correct ? 'correct' : 'wrong';
                      return (
                        <ChipButton
                          key={c.id}
                          label={c.content}
                          state={chipState}
                          onPress={() => handleFIBSelect(blankIdx, c.id)}
                        />
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Submit / Next */}
        {!result ? (
          <View style={[styles.actionShadow, !canSubmit() && styles.actionShadowDisabled]}>
            <TouchableOpacity
              style={[styles.actionBtn, (!canSubmit() || submitting) && styles.actionBtnDisabled]}
              onPress={submitAnswer}
              disabled={!canSubmit() || submitting}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnText}>{submitting ? 'Checking…' : 'Check Answer'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Result banner */}
            <View style={[styles.resultBanner, correct ? styles.resultCorrect : styles.resultWrong]}>
              <Text style={styles.resultEmoji}>{correct ? '🎉' : '✗'}</Text>
              <View style={styles.resultBody}>
                <Text style={[styles.resultTitle, correct ? styles.resultTitleCorrect : styles.resultTitleWrong]}>
                  {correct ? 'Correct!' : 'Not quite.'}
                </Text>
                {result.xpDelta > 0 && (
                  <Text style={styles.resultXp}>+{result.xpDelta} XP</Text>
                )}
              </View>
            </View>

            {/* Explanation */}
            <View style={[styles.explanationBox, correct ? styles.explanationCorrect : styles.explanationWrong]}>
              <Text style={[styles.explanationLabel, correct ? styles.explanationLabelCorrect : styles.explanationLabelWrong]}>
                {correct ? 'Why you got it right' : 'What to review'}
              </Text>
              <Text style={[styles.explanationText, correct ? styles.explanationTextCorrect : styles.explanationTextWrong]}>
                {result.explanation ?? '—'}
              </Text>
            </View>

            {/* Next / Complete */}
            <View style={styles.actionShadow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={isLastQuestion ? goNext : goNext}
                activeOpacity={0.85}
              >
                <Text style={styles.actionBtnText}>
                  {isLastQuestion ? 'Finish' : 'Next Question →'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Choice button (MC / DYNAMIC) ─────────────────────────────────────────────

function ChoiceButton({ label, state, onPress }) {
  const config = {
    idle:     { bg: '#fff',          border: colors.purple100,  text: colors.purple900 },
    selected: { bg: colors.purple50, border: colors.purple400,  text: colors.purple900 },
    correct:  { bg: colors.teal50,   border: colors.teal400,    text: colors.teal700   },
    wrong:    { bg: colors.coral50,  border: colors.coral400,   text: colors.coral600  },
  };
  const { bg, border, text } = config[state] ?? config.idle;
  const indicator = state === 'correct' ? '✓' : state === 'wrong' ? '✗' : null;

  return (
    <View style={[styles.choiceShadow, { backgroundColor: border }]}>
      <TouchableOpacity
        style={[styles.choiceBtn, { backgroundColor: bg, borderColor: border }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={[styles.choiceBtnText, { color: text }]}>{label}</Text>
        {indicator && <Text style={[styles.choiceIndicator, { color: border }]}>{indicator}</Text>}
      </TouchableOpacity>
    </View>
  );
}

// ─── Chip button (FIB) ────────────────────────────────────────────────────────

function ChipButton({ label, state, onPress }) {
  const config = {
    idle:     { bg: '#fff',          border: colors.purple200, text: colors.purple800 },
    selected: { bg: colors.purple50, border: colors.purple400, text: colors.purple900 },
    correct:  { bg: colors.teal50,   border: colors.teal400,   text: colors.teal700   },
    wrong:    { bg: colors.coral50,  border: colors.coral400,  text: colors.coral600  },
  };
  const { bg, border, text } = config[state] ?? config.idle;
  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: bg, borderColor: border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, { color: text }]}>{label}</Text>
    </TouchableOpacity>
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
  progressText: { ...typeScale.label, color: colors.neutral600 },
  progressPills: { flexDirection: 'row', gap: 4 },
  progressPill: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.purple100,
  },
  progressPillDone:    { backgroundColor: colors.teal400 },
  progressPillCurrent: { backgroundColor: colors.purple400, width: 16 },

  questionCard: {
    backgroundColor: colors.purple800, borderRadius: radius.xl,
    padding: spacing[5], marginBottom: spacing[5],
  },
  questionText: {
    fontFamily: 'Nunito_700Bold', fontSize: 17,
    color: '#fff', lineHeight: 26,
  },

  choiceList: { gap: spacing[3], marginBottom: spacing[3] },
  choiceShadow: { borderRadius: radius.lg, transform: [{ translateY: 4 }], marginBottom: spacing[1] },
  choiceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: radius.lg, borderWidth: 1.5,
    paddingVertical: 14, paddingHorizontal: spacing[4],
    transform: [{ translateY: -4 }],
  },
  choiceBtnText:  { ...typeScale.body, flex: 1 },
  choiceIndicator: { fontSize: 18, fontFamily: 'Nunito_800ExtraBold', marginLeft: spacing[2] },

  fibContainer: { marginBottom: spacing[3] },
  fibGroup:     { marginBottom: spacing[4] },
  fibLabel:     { ...typeScale.label, color: colors.neutral600, marginBottom: spacing[2] },
  fibChips:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip: {
    borderWidth: 1.5, borderRadius: radius.full,
    paddingHorizontal: spacing[4], paddingVertical: 10,
  },
  chipText: { ...typeScale.label },

  actionShadow: {
    marginTop: spacing[4],
    backgroundColor: colors.purple800, borderRadius: radius.full, transform: [{ translateY: 4 }],
  },
  actionShadowDisabled: { backgroundColor: colors.purple200 },
  actionBtn: {
    backgroundColor: colors.purple400, borderRadius: radius.full,
    paddingVertical: 16, alignItems: 'center', transform: [{ translateY: -4 }],
  },
  actionBtnDisabled: { backgroundColor: colors.purple100 },
  actionBtnText: { ...typeScale.button, color: colors.neutral900 },

  resultBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    borderRadius: radius.lg, padding: spacing[4], marginTop: spacing[4],
  },
  resultCorrect: { backgroundColor: colors.teal50,  borderWidth: 1, borderColor: colors.teal400  },
  resultWrong:   { backgroundColor: colors.coral50, borderWidth: 1, borderColor: colors.coral400 },
  resultEmoji:   { fontSize: 28 },
  resultBody:    { flex: 1 },
  resultTitle:   { ...typeScale.h3 },
  resultTitleCorrect: { color: colors.teal700  },
  resultTitleWrong:   { color: colors.coral600 },
  resultXp: { ...typeScale.label, color: colors.gold600, marginTop: 2 },

  explanationBox: {
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing[4], marginTop: spacing[3],
  },
  explanationCorrect: { backgroundColor: colors.teal50,  borderColor: colors.teal400  },
  explanationWrong:   { backgroundColor: colors.coral50, borderColor: colors.coral400 },
  explanationLabel:   { ...typeScale.label, marginBottom: spacing[2] },
  explanationLabelCorrect: { color: colors.teal700  },
  explanationLabelWrong:   { color: colors.coral600 },
  explanationText:         { ...typeScale.body, lineHeight: 22 },
  explanationTextCorrect:  { color: colors.teal700  },
  explanationTextWrong:    { color: colors.coral600 },

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
