import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Modal, Image, Dimensions, Pressable,
} from 'react-native';
import { colors, typeScale, spacing, radius } from '../theme';

const periodicTableImg = require('../assets/periodic_table.png');
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Props:
//   question   — full question object (type, content, choices)
//   onSubmit   — async (choiceIds, question) => { isCorrect, xpDelta?, explanation }
//   nextLabel  — label for the post-result action button
//   onNext     — called after next/try-again is tapped
export default function QuestionView({ question, onSubmit, nextLabel = 'Next', onNext }) {
  const [selected, setSelected]               = useState(null);
  const [result, setResult]                   = useState(null);
  const [submitting, setSubmitting]           = useState(false);
  const [showPeriodicTable, setShowPeriodicTable] = useState(false);

  useEffect(() => {
    setSelected(null);
    setResult(null);
    setSubmitting(false);
  }, [question?.id]);

  const isMC          = question.type === 'MULTIPLE_CHOICE';
  const isDynamic     = question.type === 'DYNAMIC';
  const isFIB         = question.type === 'FILL_IN_BLANK';
  const isChoiceBased = isMC || isDynamic;

  const blankIndices = isFIB
    ? [...new Set((question.choices ?? []).map(c => c.blankIndex))].sort((a, b) => a - b)
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

  async function handleSubmit() {
    if (!canSubmit() || submitting) return;
    setSubmitting(true);
    try {
      const choiceIds = isChoiceBased
        ? [selected]
        : blankIndices.map(b => selected[b]);
      const res = await onSubmit(choiceIds, question);
      setResult(res);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not submit answer');
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    setSelected(null);
    setResult(null);
    onNext?.();
  }

  const correct = result?.isCorrect;

  return (
    <>
      {/* Periodic Table Overlay */}
      <Modal
        visible={showPeriodicTable}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPeriodicTable(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Periodic Table</Text>
            <Pressable style={styles.modalCloseBtn} onPress={() => setShowPeriodicTable(false)}>
              <Text style={styles.modalCloseTxt}>✕</Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            minimumZoomScale={1}
            maximumZoomScale={4}
            pinchGestureEnabled
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <Image
              source={periodicTableImg}
              style={styles.periodicTableImg}
              resizeMode="contain"
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Periodic Table Button */}
      <TouchableOpacity
        style={styles.ptBtn}
        onPress={() => setShowPeriodicTable(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.ptBtnText}>⚗️ Periodic Table</Text>
      </TouchableOpacity>

      {/* Question card */}
      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{question.content}</Text>
      </View>

      {/* MC / DYNAMIC choices */}
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

      {/* FIB chip groups */}
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

      {/* Check Answer / post-result */}
      {!result ? (
        <View style={[styles.actionShadow, !canSubmit() && styles.actionShadowDisabled]}>
          <TouchableOpacity
            style={[styles.actionBtn, (!canSubmit() || submitting) && styles.actionBtnDisabled]}
            onPress={handleSubmit}
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

          {/* Next / Try Again */}
          <View style={styles.actionShadow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnText}>{nextLabel}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </>
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
  ptBtn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.purple50,
    borderWidth: 1.5, borderColor: colors.purple200,
    borderRadius: radius.full,
    paddingHorizontal: spacing[4], paddingVertical: 7,
    marginBottom: spacing[4],
  },
  ptBtnText: { ...typeScale.label, color: colors.purple700 },

  questionCard: {
    backgroundColor: colors.purple800, borderRadius: radius.xl,
    padding: spacing[5], marginBottom: spacing[5],
  },
  questionText: {
    fontFamily: 'Nunito_700Bold', fontSize: 17,
    color: '#fff', lineHeight: 26,
  },

  choiceList:     { gap: spacing[3], marginBottom: spacing[3] },
  choiceShadow:   { borderRadius: radius.lg, transform: [{ translateY: 4 }], marginBottom: spacing[1] },
  choiceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: radius.lg, borderWidth: 1.5,
    paddingVertical: 14, paddingHorizontal: spacing[4],
    transform: [{ translateY: -4 }],
  },
  choiceBtnText:   { ...typeScale.body, flex: 1 },
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

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(18,11,53,0.92)',
    paddingTop: 48,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[5], paddingBottom: spacing[3],
  },
  modalTitle:    { fontFamily: 'Nunito_700Bold', fontSize: 18, color: '#fff' },
  modalCloseBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.full,
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  modalCloseTxt:       { color: '#fff', fontSize: 16, fontFamily: 'Nunito_700Bold' },
  modalScroll:         { flex: 1 },
  modalScrollContent:  { alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  periodicTableImg:    { width: SCREEN_W, height: SCREEN_H * 0.8 },
});
