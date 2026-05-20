import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { ScreenSurface, ShadowButton, ProgressBar } from '../../components/base';
import QuestionCard from '../../components/QuestionCard';
import AnswerOption from '../../components/AnswerOption';
import FeedbackBar from '../../components/FeedbackBar';
import PeriodicTableOverlay from '../../components/PeriodicTableOverlay';
import { colors, typeScale, screenPadding, radius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

export default function SectionScreen({ navigation, route }) {
  const { token } = useAuth();
  const { sectionId, courseId } = route.params;

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [result, setResult] = useState(null);
  const [correctChoiceIds, setCorrectChoiceIds] = useState([]);
  const [explanation, setExplanation] = useState(null);
  const [ptOpen, setPtOpen] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const sessionRef = useRef(null);

  useEffect(() => {
    api.get(`/sections/${sectionId}/questions`, token)
      .then(qs => setQuestions(qs ?? []))
      .catch(e => console.warn('SectionScreen load error:', e.message))
      .finally(() => setLoading(false));
  }, [sectionId, token]);

  useEffect(() => {
    if (!courseId) return;
    api.post('/study/start', { courseId }, token)
      .then(r => { setSessionId(r.sessionId); sessionRef.current = r.sessionId; })
      .catch(e => console.warn('Session start error:', e.message));

    return () => {
      if (sessionRef.current) {
        api.post('/study/end', { sessionId: sessionRef.current }, token).catch(() => {});
        sessionRef.current = null;
      }
    };
  }, [courseId, token]);

  const q = questions[currentIndex];
  const mcChoices = q?.choices?.filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i) ?? [];
  const correctChoice = mcChoices.find(c => correctChoiceIds.includes(c.id));
  const xp = q ? (q.difficulty ?? 1) * 10 : 0;
  const progress = questions.length > 0 ? currentIndex / questions.length : 0;

  const optionState = (choice) => {
    if (!checked || !result) return selected?.id === choice.id ? 'selected' : 'idle';
    if (correctChoiceIds.includes(choice.id)) return 'correct';
    if (selected?.id === choice.id) return 'wrong';
    return 'muted';
  };

  const handleCheck = async () => {
    if (!selected || checked || !q) return;
    setChecked(true);
    try {
      const res = await api.post(`/questions/${q.id}/attempt`, {
        sessionId,
        choiceIds: [selected.id],
      }, token);
      setResult(res.isCorrect ? 'correct' : 'wrong');
      setCorrectChoiceIds(res.correctChoiceIds ?? []);
      setExplanation(res.explanation ?? null);
    } catch (e) {
      console.warn('attempt submit error:', e.message);
      setResult('wrong');
    }
  };

  const handleContinue = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelected(null);
      setChecked(false);
      setResult(null);
      setCorrectChoiceIds([]);
      setExplanation(null);
    } else {
      completeSection();
    }
  };

  const completeSection = async () => {
    if (sessionRef.current) {
      api.post('/study/end', { sessionId: sessionRef.current }, token).catch(() => {});
      sessionRef.current = null;
      setSessionId(null);
    }
    try {
      const res = await api.post(`/sections/${sectionId}/complete`, {}, token);
      setXpGained(res.xpEarned ?? 0);
    } catch (e) {
      console.warn('complete error:', e.message);
    } finally {
      setDone(true);
    }
  };

  const feedbackMessage = result === 'correct'
    ? `+${xp} XP${explanation ? ` — ${explanation}` : ''}`
    : correctChoice ? `Correct answer: ${correctChoice.content}` : (explanation ?? null);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <ScreenSurface style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.purple400} size="large" />
      </ScreenSurface>
    );
  }

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <ScreenSurface>
        <View style={styles.centerContainer}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>Section complete!</Text>
          <Text style={styles.doneXp}>+{xpGained} XP earned</Text>
          <ShadowButton
            label="Back to trail"
            variant="primary"
            onPress={() => navigation.goBack()}
            style={{ marginTop: 24, minWidth: 200 }}
          />
        </View>
      </ScreenSurface>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────────
  if (!q) {
    return (
      <ScreenSurface>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No questions in this section.</Text>
          <ShadowButton label="Go back" variant="ghost" onPress={() => navigation.goBack()} />
        </View>
      </ScreenSurface>
    );
  }

  // ── Question ─────────────────────────────────────────────────────────────────
  return (
    <ScreenSurface>
      {/* Top bar: X + gradient progress bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.exitBtn}>
          <Ionicons name="close" size={18} color={colors.neutral900} />
        </Pressable>
        <ProgressBar
          progress={progress}
          gradientColors={[colors.purple400, colors.gold400]}
          height={12}
          style={styles.progressBar}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, result && { paddingBottom: 180 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Meta row: Q N of M · XP pill */}
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>QUESTION {currentIndex + 1} OF {questions.length}</Text>
          <Text style={styles.metaDot}>·</Text>
          <View style={styles.xpPill}>
            <Ionicons name="flash" size={10} color={colors.gold600} />
            <Text style={styles.xpText}>+{xp} XP</Text>
          </View>
        </View>

        {/* Question card — PT button lives inside */}
        <QuestionCard
          questionText={q.content}
          footer={
            <Pressable onPress={() => setPtOpen(true)} style={styles.ptBtnContainer}>
              <LinearGradient
                colors={[colors.blue400, colors.purple600]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ptBtn}
              >
                <Ionicons name="grid" size={15} color="#FFF" />
                <Text style={styles.ptBtnText}>Open periodic table</Text>
              </LinearGradient>
            </Pressable>
          }
        />

        {/* Answer options — outside card */}
        <View style={styles.optionsList}>
          {mcChoices.map((choice, ci) => (
            <AnswerOption
              key={choice.id}
              label={String.fromCharCode(65 + ci)}
              text={choice.content}
              state={optionState(choice)}
              onPress={() => !checked && setSelected(choice)}
              disabled={checked}
            />
          ))}
        </View>

        {/* Check answer button */}
        {!checked && (
          <ShadowButton
            label="Check answer"
            variant="primary"
            onPress={handleCheck}
            disabled={!selected}
            style={styles.checkBtn}
          />
        )}
      </ScrollView>

      <FeedbackBar
        result={result}
        message={feedbackMessage}
        onContinue={handleContinue}
      />

      <PeriodicTableOverlay open={ptOpen} onClose={() => setPtOpen(false)} />
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral100,
  },
  exitBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  progressBar: {
    flex: 1,
  },
  scroll: {
    padding: screenPadding.horizontal,
    gap: 14,
    paddingBottom: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaLabel: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.purple600,
  },
  metaDot: {
    color: colors.neutral400,
    fontSize: 14,
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.gold50,
    borderWidth: 1.5,
    borderColor: colors.gold200,
    borderRadius: radius.full,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  xpText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: colors.gold800,
  },
  ptBtnContainer: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    overflow: 'hidden',
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  ptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  ptBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: '#FFF',
  },
  optionsList: {
    gap: 10,
  },
  checkBtn: {
    marginTop: 4,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  doneEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  doneTitle: {
    ...typeScale.h1,
    color: colors.neutral900,
    textAlign: 'center',
  },
  doneXp: {
    ...typeScale.h3,
    color: colors.gold600,
  },
  emptyText: {
    ...typeScale.body,
    color: colors.neutral600,
  },
});
