import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, typeScale, spacing, radius, screenPadding } from '../../theme';

const DIFFICULTY_LABEL = ['', '★', '★★', '★★★', '★★★★', '★★★★★'];

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function QuestionPreviewScreen() {
  const { question, index } = useRoute().params;
  const isFIB = question.type === 'FILL_IN_BLANK';

  // MC state
  const [mcSelected, setMcSelected] = useState(null);

  // FIB state
  const [placed, setPlaced]     = useState({});  // { blankIndex: choiceId }
  const [pickedUp, setPickedUp] = useState(null); // choiceId currently held

  const [submitted, setSubmitted] = useState(false);

  // Derived
  const blankIndices = isFIB
    ? [...new Set(question.choices.map(c => c.blankIndex))].sort((a, b) => a - b)
    : [];

  const pool = isFIB
    ? question.choices.filter(c => !Object.values(placed).includes(c.id))
    : [];

  // ── Interaction ────────────────────────────────────────────────────────────

  function tapPoolChip(choiceId) {
    if (submitted) return;
    setPickedUp(prev => (prev === choiceId ? null : choiceId));
  }

  function tapBlank(blankIndex) {
    if (submitted) return;
    const current = placed[blankIndex]; // choiceId already in blank, or undefined

    if (pickedUp) {
      // Drop picked-up chip into this blank; if blank was filled, return old chip to pool
      setPlaced(prev => ({ ...prev, [blankIndex]: pickedUp }));
      // old chip automatically re-enters pool (filter above handles it)
      setPickedUp(current ?? null); // hold the evicted chip if there was one
    } else if (current) {
      // Pick up the chip that's in the blank
      setPlaced(prev => { const n = { ...prev }; delete n[blankIndex]; return n; });
      setPickedUp(current);
    }
  }

  function canSubmit() {
    if (submitted) return false;
    if (isFIB) return blankIndices.every(i => placed[i] !== undefined);
    return mcSelected !== null;
  }

  function isCorrect() {
    if (isFIB) {
      return blankIndices.every(i => {
        const c = question.choices.find(ch => ch.id === placed[i]);
        return c?.isCorrect;
      });
    }
    return question.choices.find(c => c.id === mcSelected)?.isCorrect ?? false;
  }

  function reset() {
    setMcSelected(null);
    setPlaced({});
    setPickedUp(null);
    setSubmitted(false);
  }

  const correct = submitted && isCorrect();

  // ── MC choice state ────────────────────────────────────────────────────────

  function mcChoiceState(choice) {
    if (!submitted) return mcSelected === choice.id ? 'selected' : 'idle';
    const sel = mcSelected === choice.id;
    if (sel && choice.isCorrect) return 'correct';
    if (sel && !choice.isCorrect) return 'wrong';
    if (!sel && choice.isCorrect) return 'reveal';
    return 'idle';
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={`Question ${index + 1}`} subtitle="Student Preview" />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.metaRow}>
          <Text style={styles.previewBadge}>PREVIEW MODE</Text>
          <Text style={styles.difficulty}>{DIFFICULTY_LABEL[question.difficulty]}</Text>
        </View>

        {/* ── Fill in Blank ── */}
        {isFIB ? (
          <>
            <FIBQuestion
              content={question.content}
              blankIndices={blankIndices}
              placed={placed}
              pickedUp={pickedUp}
              submitted={submitted}
              choices={question.choices}
              onBlankPress={tapBlank}
            />

            {/* Choice pool */}
            {!submitted && (
              <View style={styles.poolSection}>
                <Text style={styles.poolLabel}>Choice Pool</Text>
                <View style={styles.pool}>
                  {pool.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.chip, pickedUp === c.id && styles.chipPickedUp]}
                      onPress={() => tapPoolChip(c.id)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, pickedUp === c.id && styles.chipTextPickedUp]}>
                        {c.content}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {pool.length === 0 && (
                    <Text style={styles.poolEmpty}>All choices placed</Text>
                  )}
                </View>
              </View>
            )}
          </>
        ) : (
          /* ── Multiple Choice ── */
          <>
            <View style={styles.questionCard}>
              <Text style={styles.questionText}>{question.content}</Text>
            </View>
            <View style={styles.choiceList}>
              {question.choices.map(c => (
                <ChoiceButton
                  key={c.id}
                  choice={c}
                  state={mcChoiceState(c)}
                  onPress={() => { if (!submitted) setMcSelected(c.id); }}
                />
              ))}
            </View>
          </>
        )}

        {/* Submit / result */}
        {!submitted ? (
          <View style={[styles.submitShadow, !canSubmit() && styles.submitShadowDisabled]}>
            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit() && styles.submitBtnDisabled]}
              onPress={() => setSubmitted(true)}
              disabled={!canSubmit()}
              activeOpacity={0.85}
            >
              <Text style={styles.submitText}>Check Answer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.resultBanner, correct ? styles.resultCorrect : styles.resultWrong]}>
            <Text style={styles.resultEmoji}>{correct ? '🎉' : '✗'}</Text>
            <Text style={styles.resultText}>{correct ? 'Correct!' : 'Not quite.'}</Text>
          </View>
        )}

        {submitted && (
          <View style={styles.explanationBox}>
            <Text style={styles.explanationLabel}>Explanation</Text>
            <Text style={styles.explanationText}>{question.solutionExplanation}</Text>
          </View>
        )}

        {submitted && (
          <TouchableOpacity onPress={reset} style={styles.retryBtn} activeOpacity={0.7}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ─── FIB question with inline blank slots ────────────────────────────────────

function FIBQuestion({ content, blankIndices, placed, pickedUp, submitted, choices, onBlankPress }) {
  const parts = content.split('___');

  return (
    <View style={styles.questionCard}>
      <View style={styles.inlineRow}>
        {parts.map((part, i) => {
          // Split text into words so they wrap naturally alongside blank chips
          const words = part.split(/\s+/).filter(Boolean);
          const blankIndex = blankIndices[i] ?? i;
          const placedChoice = placed[blankIndex] != null
            ? choices.find(c => c.id === placed[blankIndex])
            : null;

          // After submit: determine blank correctness
          let blankState = 'empty';
          if (placedChoice) {
            if (!submitted) blankState = 'filled';
            else blankState = placedChoice.isCorrect ? 'correct' : 'wrong';
          } else if (!submitted && pickedUp) {
            blankState = 'target'; // visual hint that this blank can accept a drop
          }

          return (
            <View key={i} style={styles.inlineSegment}>
              {words.map((word, wi) => (
                <Text key={wi} style={styles.questionWordText}>{word} </Text>
              ))}
              {i < parts.length - 1 && (
                <TouchableOpacity
                  style={[
                    styles.inlineBlank,
                    blankState === 'filled'  && styles.inlineBlankFilled,
                    blankState === 'target'  && styles.inlineBlankTarget,
                    blankState === 'correct' && styles.inlineBlankCorrect,
                    blankState === 'wrong'   && styles.inlineBlankWrong,
                  ]}
                  onPress={() => onBlankPress(blankIndex)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.inlineBlankText,
                    blankState === 'correct' && styles.inlineBlankTextCorrect,
                    blankState === 'wrong'   && styles.inlineBlankTextWrong,
                  ]}>
                    {placedChoice ? placedChoice.content : (blankState === 'target' ? '  drop  ' : '  ?  ')}
                  </Text>
                  {blankState === 'correct' && <Text style={styles.blankCheck}>✓</Text>}
                  {blankState === 'wrong'   && <Text style={styles.blankX}>✗</Text>}
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── MC choice button ─────────────────────────────────────────────────────────

function ChoiceButton({ choice, state, onPress }) {
  const configs = {
    idle:     { bg: '#fff',          border: colors.purple100,  text: colors.purple900, indicator: null },
    selected: { bg: colors.purple50, border: colors.purple400,  text: colors.purple900, indicator: null },
    correct:  { bg: colors.teal50,   border: colors.teal400,    text: colors.teal600,   indicator: '✓'  },
    wrong:    { bg: colors.coral50,  border: colors.coral400,   text: colors.coral600,  indicator: '✗'  },
    reveal:   { bg: colors.teal50,   border: colors.teal200,    text: colors.teal600,   indicator: '✓'  },
  };
  const { bg, border, text, indicator } = configs[state] ?? configs.idle;

  return (
    <View style={[styles.choiceShadow, { backgroundColor: border }]}>
      <TouchableOpacity
        style={[styles.choiceBtn, { backgroundColor: bg, borderColor: border }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={[styles.choiceText, { color: text }]}>{choice.content}</Text>
        {indicator && <Text style={[styles.indicator, { color: border }]}>{indicator}</Text>}
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },
  scroll: { paddingHorizontal: screenPadding.horizontal, paddingBottom: 48 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  previewBadge: {
    ...typeScale.label, color: colors.purple400,
    backgroundColor: colors.purple50, paddingHorizontal: spacing[3], paddingVertical: spacing[1],
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.purple200,
  },
  difficulty: { ...typeScale.h3, color: colors.gold600 },

  questionCard: {
    backgroundColor: colors.purple800, borderRadius: radius.xl,
    padding: spacing[5], marginBottom: spacing[5],
  },

  // FIB inline rendering
  inlineRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  inlineSegment: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  questionWordText: { fontFamily: 'Nunito_700Bold', fontSize: 17, lineHeight: 26, color: '#fff' },

  inlineBlank: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', borderStyle: 'dashed',
    borderRadius: radius.md, paddingHorizontal: spacing[3], paddingVertical: 6,
    marginHorizontal: 2, minWidth: 64,
  },
  inlineBlankFilled: {
    borderStyle: 'solid', borderColor: colors.gold400,
    backgroundColor: 'rgba(255,193,7,0.15)',
  },
  inlineBlankTarget: {
    borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  inlineBlankCorrect: {
    borderStyle: 'solid', borderColor: colors.teal400,
    backgroundColor: 'rgba(38,198,176,0.2)',
  },
  inlineBlankWrong: {
    borderStyle: 'solid', borderColor: colors.coral400,
    backgroundColor: 'rgba(255,110,80,0.2)',
  },
  inlineBlankText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.gold200 },
  inlineBlankTextCorrect: { color: colors.teal400 },
  inlineBlankTextWrong: { color: colors.coral400 },
  blankCheck: { color: colors.teal400, fontSize: 14, marginLeft: 4, fontFamily: 'Nunito_800ExtraBold' },
  blankX:     { color: colors.coral400, fontSize: 14, marginLeft: 4, fontFamily: 'Nunito_800ExtraBold' },

  // Choice pool
  poolSection: { marginBottom: spacing[5] },
  poolLabel: { ...typeScale.label, color: colors.neutral600, marginBottom: spacing[3] },
  pool: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  poolEmpty: { ...typeScale.body, color: colors.neutral400, fontStyle: 'italic' },

  chip: {
    borderWidth: 1.5, borderColor: colors.purple200, borderRadius: radius.full,
    backgroundColor: '#fff', paddingHorizontal: spacing[4], paddingVertical: 10,
  },
  chipPickedUp: {
    backgroundColor: colors.purple400, borderColor: colors.purple400,
    transform: [{ translateY: -2 }],
    shadowColor: colors.purple800, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 6,
  },
  chipText: { ...typeScale.body, color: colors.purple800 },
  chipTextPickedUp: { color: '#fff' },

  // MC
  choiceList: { gap: spacing[3], marginBottom: spacing[2] },
  choiceShadow: { borderRadius: radius.lg, transform: [{ translateY: 4 }], marginBottom: spacing[3] },
  choiceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: radius.lg, borderWidth: 1.5,
    paddingVertical: 14, paddingHorizontal: spacing[4], transform: [{ translateY: -4 }],
  },
  choiceText: { ...typeScale.body, flex: 1 },
  indicator: { fontSize: 18, fontFamily: 'Nunito_800ExtraBold', marginLeft: spacing[2] },

  // Submit
  submitShadow: { marginTop: spacing[2], backgroundColor: colors.purple800, borderRadius: radius.full, transform: [{ translateY: 4 }] },
  submitShadowDisabled: { backgroundColor: colors.purple200 },
  submitBtn: { backgroundColor: colors.purple400, borderRadius: radius.full, paddingVertical: 16, alignItems: 'center', transform: [{ translateY: -4 }] },
  submitBtnDisabled: { backgroundColor: colors.purple100 },
  submitText: { ...typeScale.button, color: colors.neutral900 },

  resultBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], borderRadius: radius.lg, padding: spacing[4], marginTop: spacing[4] },
  resultCorrect: { backgroundColor: colors.teal50, borderWidth: 1, borderColor: colors.teal400 },
  resultWrong: { backgroundColor: colors.coral50, borderWidth: 1, borderColor: colors.coral400 },
  resultEmoji: { fontSize: 24 },
  resultText: { ...typeScale.h2, color: colors.purple800 },

  explanationBox: { backgroundColor: colors.gold50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gold200, padding: spacing[4], marginTop: spacing[4] },
  explanationLabel: { ...typeScale.label, color: colors.gold800, marginBottom: spacing[2] },
  explanationText: { ...typeScale.body, color: colors.gold800, lineHeight: 22 },

  retryBtn: { alignSelf: 'center', marginTop: spacing[4], padding: spacing[3] },
  retryText: { ...typeScale.label, color: colors.purple400 },
});
