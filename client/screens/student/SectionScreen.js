import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { ScreenSurface, ShadowButton, ProgressBar } from '../../components/base';
import QuestionCard from '../../components/QuestionCard';
import AnswerOption from '../../components/AnswerOption';
import FeedbackBar from '../../components/FeedbackBar';
import PeriodicTableOverlay from '../../components/PeriodicTableOverlay';
import { colors, typeScale, screenPadding, radius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

function maxScore(question) {
  if (question.type === 'MULTIPLE_CHOICE' || question.type === 'DYNAMIC') return 1;
  return new Set((question.choices ?? []).map(c => c.blankIndex)).size;
}

export default function SectionScreen({ navigation, route }) {
  const { token } = useAuth();
  const { sectionId } = route.params;

  const [section, setSection] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [result, setResult] = useState(null);
  const [ptOpen, setPtOpen] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [sec, qs] = await Promise.all([
          api.get(`/sections/${sectionId}`, token),
          api.get(`/sections/${sectionId}/questions`, token),
        ]);
        setSection(sec);
        setQuestions(qs ?? []);
      } catch (e) {
        console.warn('SectionScreen load error:', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [sectionId, token]);

  const q = questions[currentIndex];

  const optionState = (choice) => {
    if (!checked) return selected?.id === choice.id ? 'selected' : 'idle';
    const max = q ? maxScore(q) : 1;
    const isCorrectChoice = choice.isCorrect;
    const isSelectedChoice = selected?.id === choice.id;
    if (isCorrectChoice) return 'correct';
    if (isSelectedChoice && !isCorrectChoice) return 'wrong';
    return 'muted';
  };

  const handleCheck = async () => {
    if (!selected || checked || !q) return;
    setChecked(true);
    const isCorrect = selected.isCorrect;
    setResult(isCorrect ? 'correct' : 'wrong');
    // Submit attempt
    try {
      await api.post(`/questions/${q.id}/attempts`, {
        sectionId,
        answers: [{ choiceId: selected.id }],
      }, token);
    } catch (e) {
      console.warn('attempt submit error:', e.message);
    }
  };

  const handleContinue = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelected(null);
      setChecked(false);
      setResult(null);
    } else {
      completeSection();
    }
  };

  const completeSection = async () => {
    try {
      const res = await api.post(`/sections/${sectionId}/complete`, {}, token);
      setXpGained(res.xpEarned ?? 0);
    } catch (e) {
      console.warn('complete error:', e.message);
    } finally {
      setDone(true);
    }
  };

  if (loading) {
    return (
      <ScreenSurface style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.purple400} size="large" />
      </ScreenSurface>
    );
  }

  if (done) {
    return (
      <ScreenSurface>
        <View style={styles.doneContainer}>
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

  if (!q) {
    return (
      <ScreenSurface>
        <View style={styles.doneContainer}>
          <Text style={styles.emptyText}>No questions in this section.</Text>
          <ShadowButton label="Go back" variant="ghost" onPress={() => navigation.goBack()} />
        </View>
      </ScreenSurface>
    );
  }

  const progress = questions.length > 0 ? currentIndex / questions.length : 0;
  const mcChoices = q.choices?.filter((c, i, arr) =>
    arr.findIndex(x => x.id === c.id) === i
  ) ?? [];

  return (
    <ScreenSurface>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.exitBtn}>
          <Ionicons name="close" size={18} color={colors.neutral900} />
        </Pressable>
        <ProgressBar
          progress={progress}
          color={colors.purple400}
          height={10}
          style={styles.progressBar}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, result && { paddingBottom: 180 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* PT button */}
        <Pressable style={styles.ptBtn} onPress={() => setPtOpen(true)}>
          <Ionicons name="grid" size={14} color="#FFF" />
          <Text style={styles.ptBtnText}>Periodic table</Text>
        </Pressable>

        <QuestionCard
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
          questionText={q.text}
          xp={q.difficulty * 10}
        >
          <View style={{ gap: 10 }}>
            {mcChoices.map((choice, ci) => (
              <AnswerOption
                key={choice.id}
                label={String.fromCharCode(65 + ci)}
                text={choice.text}
                state={optionState(choice)}
                onPress={() => !checked && setSelected(choice)}
                disabled={checked}
              />
            ))}
          </View>
        </QuestionCard>

        {!checked && (
          <ShadowButton
            label="Check answer"
            variant="secondary"
            onPress={handleCheck}
            disabled={!selected}
            style={styles.checkBtn}
          />
        )}
      </ScrollView>

      <FeedbackBar
        result={result}
        xp={result === 'correct' ? q.difficulty * 10 : null}
        message={result === 'wrong'
          ? `Correct: ${mcChoices.find(c => c.isCorrect)?.text ?? '—'}`
          : null}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBar: {
    flex: 1,
  },
  scroll: {
    padding: screenPadding.horizontal,
    gap: 14,
    paddingBottom: 24,
  },
  ptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.purple600,
    borderRadius: radius.full,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  ptBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: '#FFF',
  },
  checkBtn: {
    marginTop: 6,
  },
  doneContainer: {
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
