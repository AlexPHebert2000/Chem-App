import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  Pressable, Alert, Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { ScreenSurface, ShadowButton, SlotPickerSheet, SlotConfigOverlay } from '../../components/base';
import { parseDynamic } from '../../components/base/DynamicContent';
import { colors, typeScale, screenPadding, radius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

// ─── Field label ─────────────────────────────────────────────────────────────

function FieldLabel({ label, hint }) {
  return (
    <View style={styles.fieldLabelRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint ? <Text style={styles.fieldHint}>({hint})</Text> : null}
    </View>
  );
}

// ─── Accent text input (border changes on focus) ──────────────────────────────

function AccentInput({ accent = 'purple', style, ...props }) {
  const [focused, setFocused] = useState(false);
  const borderColor = focused ? accentColor(accent) : colors.neutral200;
  return (
    <TextInput
      {...props}
      style={[styles.input, { borderColor }, style]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholderTextColor={colors.neutral400}
    />
  );
}

function AccentArea({ accent = 'purple', rows = 3, style, ...props }) {
  const [focused, setFocused] = useState(false);
  const borderColor = focused ? accentColor(accent) : colors.neutral200;
  return (
    <TextInput
      {...props}
      style={[styles.textArea, { borderColor, minHeight: rows * 22 + 24 }, style]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholderTextColor={colors.neutral400}
      multiline
      textAlignVertical="top"
    />
  );
}

function accentColor(accent) {
  if (accent === 'teal') return colors.teal400;
  if (accent === 'coral') return colors.coral400;
  return colors.purple400;
}

// ─── Type selector ────────────────────────────────────────────────────────────

const TYPES = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple\nchoice' },
  { value: 'FILL_IN_BLANK',   label: 'Fill in\nblank' },
  { value: 'DYNAMIC',         label: 'Dynamic' },
];

function TypeSelector({ value, onChange }) {
  return (
    <View style={styles.typeGrid}>
      {TYPES.map(t => {
        const on = value === t.value;
        return (
          <Pressable key={t.value} onPress={() => onChange(t.value)}
            style={[styles.typeBtn, on && styles.typeBtnActive]}>
            <Text style={[styles.typeBtnText, on && styles.typeBtnTextActive]} numberOfLines={2}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── MC options ───────────────────────────────────────────────────────────────

function McOptionRow({ option, index, onChange, onRemove, canRemove }) {
  return (
    <View style={[styles.mcRow, option.isCorrect && styles.mcRowCorrect]}>
      <Pressable onPress={() => onChange({ ...option, isCorrect: !option.isCorrect })}
        style={[styles.mcCircle, option.isCorrect && styles.mcCircleCorrect]}>
        {option.isCorrect && <Ionicons name="checkmark" size={11} color="#fff" />}
      </Pressable>
      <Text style={styles.mcLetter}>{String.fromCharCode(65 + index)}</Text>
      <TextInput
        style={styles.mcInput}
        value={option.content ?? ''}
        onChangeText={t => onChange({ ...option, content: t })}
        placeholder={`Option ${String.fromCharCode(65 + index)}`}
        placeholderTextColor={colors.neutral400}
      />
      {canRemove && (
        <Pressable onPress={onRemove} style={styles.mcRemove}>
          <Ionicons name="close" size={11} color={colors.neutral600} />
        </Pressable>
      )}
    </View>
  );
}

// ─── FIB answers ─────────────────────────────────────────────────────────────

function FibAnswerRow({ index, value, onChange, onRemove, canRemove }) {
  return (
    <View style={styles.fibRow}>
      <View style={styles.blankPill}>
        <Text style={styles.blankPillText}>BLANK {index + 1}</Text>
      </View>
      <AccentInput
        accent="teal"
        style={{ flex: 1 }}
        value={value}
        onChangeText={onChange}
        placeholder="Accepted answer"
      />
      {canRemove && (
        <Pressable onPress={onRemove} style={styles.mcRemove}>
          <Ionicons name="close" size={11} color={colors.neutral600} />
        </Pressable>
      )}
    </View>
  );
}

// ─── Template syntax card (collapseable) ─────────────────────────────────────

const SYNTAX_ROWS = [
  { code: '[el(1,18).name]',        desc: 'element name (Z 1–18)' },
  { code: '[el(1,118).symbol]',     desc: 'element symbol' },
  { code: '[el(1,118).number]',     desc: 'atomic number' },
  { code: '[el(1,118).mass]',       desc: 'atomic mass' },
  { code: '[num(1,100)]',           desc: 'random integer' },
  { code: '[compound(acids).formula]', desc: 'compound' },
];
const XREF_ROWS = [
  { code: '[1.symbol]',              desc: "slot 1's symbol" },
  { code: '[1.number + num(-2,2)]',  desc: 'computed display' },
];
const COMP_ROWS = [
  { code: '[gt(1.mass,2.mass)]', desc: 'slot with greater value' },
  { code: '[lt(1.mass,2.mass)]', desc: 'slot with lesser value' },
];
const ANS_TOKENS = ['1.number', '1.mass', '1+2', '2*1.number'];

function CodeToken({ text }) {
  return <View style={styles.codeToken}><Text style={styles.codeTokenText}>{text}</Text></View>;
}

function SyntaxRow({ code, desc }) {
  return (
    <View style={styles.syntaxRow}>
      <CodeToken text={code} />
      {desc ? <Text style={styles.syntaxDesc}>{desc}</Text> : null}
    </View>
  );
}

function TemplateSyntaxCard() {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.syntaxCard}>
      <Pressable onPress={() => setOpen(v => !v)} style={styles.syntaxHeader}>
        <Text style={styles.syntaxTitle}>TEMPLATE SYNTAX</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.purple600} />
      </Pressable>
      {open && (
        <View style={styles.syntaxBody}>
          {SYNTAX_ROWS.map((r, i) => <SyntaxRow key={i} {...r} />)}
          <Text style={styles.syntaxSubHead}>
            Categories: <Text style={styles.syntaxMono}>acids · bases · salts · oxides</Text>
          </Text>
          <Text style={styles.syntaxSubHead}>Cross-ref:</Text>
          {XREF_ROWS.map((r, i) => <SyntaxRow key={i} {...r} />)}
          <Text style={styles.syntaxSubHead}>Answer ref:</Text>
          <View style={styles.tokenWrap}>
            {ANS_TOKENS.map((t, i) => <CodeToken key={i} text={t} />)}
          </View>
          <Text style={styles.syntaxSubHead}>Comparison:</Text>
          {COMP_ROWS.map((r, i) => <SyntaxRow key={i} {...r} />)}
        </View>
      )}
    </View>
  );
}

// ─── Difficulty picker ────────────────────────────────────────────────────────

function DifficultyPicker({ value, onChange }) {
  return (
    <View style={styles.diffRow}>
      {[1, 2, 3, 4, 5].map(n => {
        const on = value === n;
        return (
          <Pressable key={n} onPress={() => onChange(n)}
            style={[styles.diffBtn, on && styles.diffBtnActive]}>
            <Text style={[styles.diffBtnText, on && styles.diffBtnTextActive]}>{n}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Tag input ────────────────────────────────────────────────────────────────

function TagSection({ selectedIds, onAdd, onRemove, availableTags }) {
  const [search, setSearch] = useState('');
  const selectedTags = availableTags.filter(t => selectedIds.includes(t.id));
  const suggestions = search.trim()
    ? availableTags.filter(t =>
        !selectedIds.includes(t.id) &&
        t.name.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 6)
    : availableTags.filter(t => !selectedIds.includes(t.id)).slice(0, 6);

  return (
    <View>
      <View style={styles.tagContainer}>
        {selectedTags.map(t => (
          <View key={t.id} style={styles.tagPill}>
            <Text style={styles.tagPillText}>#{t.name.replace(' ', '-')}</Text>
            <Pressable onPress={() => onRemove(t.id)} style={styles.tagRemove}>
              <Ionicons name="close" size={9} color={colors.purple600} />
            </Pressable>
          </View>
        ))}
        <TextInput
          style={styles.tagInput}
          value={search}
          onChangeText={setSearch}
          placeholder={selectedIds.length ? 'Add tag…' : 'Search tags…'}
          placeholderTextColor={colors.neutral400}
        />
      </View>
      {suggestions.length > 0 && (
        <View style={styles.tagSuggestions}>
          {suggestions.map(t => (
            <Pressable key={t.id} onPress={() => { onAdd(t.id); setSearch(''); }}
              style={styles.tagSuggestBtn}>
              <Text style={styles.tagSuggestText}>+ #{t.name.replace(' ', '-')}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Slot chip strip (dynamic question editor) ───────────────────────────────

function SlotStrip({ content, onChipPress }) {
  const slots = parseDynamic(content).filter(s => s.type === 'slot');
  if (!slots.length) return null;
  return (
    <View style={strip.container}>
      <Text style={strip.label}>SLOTS</Text>
      <View style={strip.row}>
        {slots.map((slot, i) => (
          <Pressable key={i} onPress={() => onChipPress(slot.expr)}
            style={({ pressed }) => [strip.chip, pressed && strip.chipPressed]}>
            <Ionicons name="flask-outline" size={11} color={colors.purple600} />
            <Text style={strip.chipText}>{slot.label}</Text>
            <Ionicons name="pencil-outline" size={10} color={colors.purple400} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const strip = StyleSheet.create({
  container: {
    backgroundColor: colors.purple50,
    borderWidth: 1.5,
    borderColor: colors.purple100,
    borderRadius: radius.md,
    padding: 10,
  },
  label: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.purple400,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: colors.purple200,
    borderRadius: radius.full,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  chipPressed: {
    backgroundColor: colors.purple100,
  },
  chipText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: colors.purple800,
  },
});

// ─── Main screen ─────────────────────────────────────────────────────────────

const BLANK_MC = [
  { content: '', isCorrect: false, blankIndex: 0 },
  { content: '', isCorrect: false, blankIndex: 0 },
  { content: '', isCorrect: false, blankIndex: 0 },
  { content: '', isCorrect: false, blankIndex: 0 },
];

export default function QuestionEditorScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { questionId, courseId } = route.params ?? {};
  const isEdit = !!questionId;

  const [type, setType] = useState('MULTIPLE_CHOICE');
  const [difficulty, setDifficulty] = useState(2);
  const [content, setContent] = useState('');
  const [correctExplanation, setCorrectExplanation] = useState('');
  const [incorrectExplanation, setIncorrectExplanation] = useState('');

  // MC
  const [mcOptions, setMcOptions] = useState(BLANK_MC);

  // FIB — list of accepted answer strings, one per blank
  const [fibAnswers, setFibAnswers] = useState(['']);

  // Dynamic
  const [answerExpression, setAnswerExpression] = useState('');
  const [answerUnit, setAnswerUnit] = useState('');
  const [distractorCount, setDistractorCount] = useState('');

  // Tags
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);

  const [saving, setSaving] = useState(false);

  // Dynamic slot insertion
  const contentSelectionRef = useRef({ start: 0, end: 0 });
  const [slotPickerVisible, setSlotPickerVisible] = useState(false);
  const [slotConfigVisible, setSlotConfigVisible] = useState(false);
  const [slotConfigExpr, setSlotConfigExpr] = useState('');

  // Load available tags
  useEffect(() => {
    api.get('/tags', token).then(tags => setAvailableTags(tags ?? [])).catch(() => {});
  }, [token]);

  // Load question data if editing
  useEffect(() => {
    if (!questionId) return;
    api.get(`/questions/${questionId}`, token)
      .then(q => {
        if (!q) return;
        setType(q.type ?? 'MULTIPLE_CHOICE');
        setDifficulty(q.difficulty ?? 2);
        setContent(q.content ?? '');
        setCorrectExplanation(q.correctExplanation ?? '');
        setIncorrectExplanation(q.incorrectExplanation ?? '');
        setSelectedTagIds((q.tags ?? []).map(t => t.id));
        if (q.type === 'MULTIPLE_CHOICE' || q.type === 'FILL_IN_BLANK') {
          if (q.choices?.length) {
            if (q.type === 'FILL_IN_BLANK') {
              const sorted = [...q.choices].sort((a, b) => a.blankIndex - b.blankIndex);
              setFibAnswers(sorted.map(c => c.content));
            } else {
              setMcOptions(q.choices);
            }
          }
        } else if (q.type === 'DYNAMIC') {
          setAnswerExpression(q.answerExpression ?? '');
          setAnswerUnit(q.answerUnit ?? '');
          setDistractorCount(q.distractorCount != null ? String(q.distractorCount) : '');
        }
      })
      .catch(() => {});
  }, [questionId, token]);

  const updateMcOption = (i, val) => setMcOptions(prev => prev.map((o, idx) => idx === i ? val : o));
  const addMcOption = () => setMcOptions(prev => [...prev, { content: '', isCorrect: false, blankIndex: 0 }]);
  const removeMcOption = i => setMcOptions(prev => prev.filter((_, idx) => idx !== i));

  const updateFib = (i, val) => setFibAnswers(prev => prev.map((a, idx) => idx === i ? val : a));
  const addFib = () => setFibAnswers(prev => [...prev, '']);
  const removeFib = i => setFibAnswers(prev => prev.filter((_, idx) => idx !== i));

  const addTag = id => setSelectedTagIds(prev => prev.includes(id) ? prev : [...prev, id]);
  const removeTag = id => setSelectedTagIds(prev => prev.filter(x => x !== id));

  const insertSlot = expr => {
    const pos = contentSelectionRef.current.start;
    setContent(prev => prev.slice(0, pos) + expr + prev.slice(pos));
  };

  const openSlotConfig = expr => {
    setSlotConfigExpr(expr);
    setSlotConfigVisible(true);
  };

  const applySlotConfig = newExpr => {
    setContent(prev => prev.replace(slotConfigExpr, newExpr));
  };

  const buildChoices = () => {
    if (type === 'FILL_IN_BLANK') {
      return fibAnswers.map((a, i) => ({ content: a, blankIndex: i, isCorrect: true }));
    }
    return mcOptions;
  };

  const validate = () => {
    if (!content.trim()) { Alert.alert('Missing', 'Question text is required.'); return false; }
    if (!correctExplanation.trim()) { Alert.alert('Missing', 'Correct explanation is required.'); return false; }
    if (!incorrectExplanation.trim()) { Alert.alert('Missing', 'Incorrect explanation is required.'); return false; }
    if (type === 'MULTIPLE_CHOICE') {
      if (!mcOptions.some(o => o.isCorrect)) { Alert.alert('Missing', 'Mark at least one correct answer.'); return false; }
      if (!mcOptions.some(o => o.content?.trim())) { Alert.alert('Missing', 'Add at least one answer option.'); return false; }
    }
    if (type === 'FILL_IN_BLANK' && !fibAnswers.some(a => a.trim())) {
      Alert.alert('Missing', 'At least one blank answer is required.'); return false;
    }
    if (type === 'DYNAMIC' && !answerExpression.trim()) {
      Alert.alert('Missing', 'Answer expression is required for dynamic questions.'); return false;
    }
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const body = {
        type, difficulty,
        content: content.trim(),
        correctExplanation: correctExplanation.trim(),
        incorrectExplanation: incorrectExplanation.trim(),
        tagIds: selectedTagIds,
        choices: buildChoices(),
      };
      if (type === 'DYNAMIC') {
        body.answerExpression = answerExpression.trim();
        if (answerUnit.trim()) body.answerUnit = answerUnit.trim();
        const dc = parseInt(distractorCount, 10);
        if (!isNaN(dc)) body.distractorCount = dc;
      }
      if (isEdit) {
        await api.patch(`/questions/${questionId}`, body, token);
      } else {
        await api.post('/questions', body, token);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message ?? 'Could not save question.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenSurface>
      <StatusBar style="dark" />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.neutral900} />
        </Pressable>
        <Text style={styles.title}>{isEdit ? 'Edit question' : 'New question'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <SlotPickerSheet
        visible={slotPickerVisible}
        onClose={() => setSlotPickerVisible(false)}
        onSelect={insertSlot}
      />
      <SlotConfigOverlay
        visible={slotConfigVisible}
        expr={slotConfigExpr}
        onClose={() => setSlotConfigVisible(false)}
        onConfirm={applySlotConfig}
      />

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

        {/* TYPE */}
        <FieldLabel label="TYPE" />
        <TypeSelector value={type} onChange={setType} />

        {/* QUESTION */}
        {type === 'DYNAMIC' ? (
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>QUESTION</Text>
            <Pressable onPress={() => setSlotPickerVisible(true)} style={styles.addSlotBtn}>
              <Ionicons name="add" size={13} color={colors.purple600} />
              <Text style={styles.addSlotText}>Add slot</Text>
            </Pressable>
          </View>
        ) : (
          <FieldLabel label="QUESTION" />
        )}
        <AccentArea
          accent="purple"
          value={content}
          onChangeText={setContent}
          rows={type === 'DYNAMIC' ? 4 : 3}
          onSelectionChange={e => { contentSelectionRef.current = e.nativeEvent.selection; }}
          placeholder={
            type === 'MULTIPLE_CHOICE' ? 'e.g. What is the atomic number of Magnesium?'
            : type === 'FILL_IN_BLANK' ? 'Use ___ for blanks. e.g. The pH of pure water is ___.'
            : 'e.g. How many protons are in [el(1,18).name]?'
          }
          style={type === 'DYNAMIC' ? { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' } : null}
        />

        {/* DYNAMIC: slot chip strip */}
        {type === 'DYNAMIC' && <SlotStrip content={content} onChipPress={openSlotConfig} />}

        {/* DYNAMIC: template syntax */}
        {type === 'DYNAMIC' && <TemplateSyntaxCard />}

        {/* MC OPTIONS */}
        {type === 'MULTIPLE_CHOICE' && (
          <>
            <FieldLabel label="OPTIONS" hint="tap circle to mark correct" />
            {mcOptions.map((o, i) => (
              <McOptionRow key={i} option={o} index={i}
                onChange={val => updateMcOption(i, val)}
                onRemove={() => removeMcOption(i)}
                canRemove={mcOptions.length > 2}
              />
            ))}
            {mcOptions.length < 6 && (
              <Pressable onPress={addMcOption} style={styles.addOptionBtn}>
                <Ionicons name="add" size={12} color={colors.purple600} />
                <Text style={styles.addOptionText}>Add option</Text>
              </Pressable>
            )}
          </>
        )}

        {/* FIB ANSWERS */}
        {type === 'FILL_IN_BLANK' && (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Use <Text style={styles.infoMono}>___</Text> in the question text to mark each blank. List one accepted answer per blank below.
              </Text>
            </View>
            <FieldLabel label="ACCEPTED ANSWERS" />
            {fibAnswers.map((a, i) => (
              <FibAnswerRow key={i} index={i} value={a}
                onChange={v => updateFib(i, v)}
                onRemove={() => removeFib(i)}
                canRemove={fibAnswers.length > 1}
              />
            ))}
            <Pressable onPress={addFib} style={styles.addOptionBtn}>
              <Ionicons name="add" size={12} color={colors.purple600} />
              <Text style={styles.addOptionText}>Add another blank</Text>
            </Pressable>
          </>
        )}

        {/* DYNAMIC FIELDS */}
        {type === 'DYNAMIC' && (
          <>
            <FieldLabel label="ANSWER EXPRESSION" />
            <AccentInput
              accent="purple"
              value={answerExpression}
              onChangeText={setAnswerExpression}
              placeholder="e.g. 1.number or 1.mass or 1+2"
              style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}
            />
            <View style={styles.dynRow}>
              <View style={{ flex: 1 }}>
                <FieldLabel label="ANSWER UNIT" hint="optional, e.g. g" />
                <AccentInput
                  accent="purple"
                  value={answerUnit}
                  onChangeText={setAnswerUnit}
                  placeholder="g"
                />
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel label="DISTRACTORS" hint="default 3" />
                <AccentInput
                  accent="purple"
                  value={distractorCount}
                  onChangeText={setDistractorCount}
                  placeholder="3"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </>
        )}

        {/* EXPLANATIONS */}
        <FieldLabel label="CORRECT ANSWER EXPLANATION" />
        <AccentArea
          accent="teal"
          value={correctExplanation}
          onChangeText={setCorrectExplanation}
          rows={3}
          placeholder="Explain why the correct answer is right"
        />

        <FieldLabel label="INCORRECT ANSWER EXPLANATION" />
        <AccentArea
          accent="coral"
          value={incorrectExplanation}
          onChangeText={setIncorrectExplanation}
          rows={3}
          placeholder="Explain what to review if the answer is wrong"
        />

        {/* DIFFICULTY */}
        <FieldLabel label="DIFFICULTY" />
        <DifficultyPicker value={difficulty} onChange={setDifficulty} />

        {/* TAGS */}
        <FieldLabel label="TAGS" hint="optional" />
        <TagSection
          selectedIds={selectedTagIds}
          onAdd={addTag}
          onRemove={removeTag}
          availableTags={availableTags}
        />

        <ShadowButton
          label={saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save question'}
          variant="primary"
          onPress={save}
          disabled={saving}
          style={{ marginTop: 20 }}
        />
      </ScrollView>
    </ScreenSurface>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral200,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 20,
    color: colors.neutral900,
  },
  form: {
    padding: screenPadding.horizontal,
    paddingBottom: 48,
    gap: 8,
  },

  // Field labels
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, marginBottom: 6 },
  fieldLabel: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.purple600,
  },
  fieldHint: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.neutral600,
  },

  // Inputs
  input: {
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    borderRadius: radius.md,
    paddingVertical: 11,
    paddingHorizontal: 12,
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.neutral900,
    backgroundColor: '#FFF',
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    borderRadius: radius.md,
    padding: 12,
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.neutral900,
    backgroundColor: '#FFF',
  },

  // Type selector
  typeGrid: { flexDirection: 'row', gap: 6 },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBtnActive: {
    backgroundColor: colors.purple600,
    borderColor: colors.purple800,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  typeBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    color: colors.neutral800,
  },
  typeBtnTextActive: { color: '#FFF' },

  // MC options
  mcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    borderRadius: radius.md,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 6,
    marginBottom: 6,
  },
  mcRowCorrect: {
    backgroundColor: colors.teal50,
    borderColor: colors.teal400,
  },
  mcCircle: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.neutral300,
    backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  mcCircleCorrect: {
    backgroundColor: colors.teal400,
    borderColor: colors.teal400,
  },
  mcLetter: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
    color: colors.neutral600,
    width: 18,
    textAlign: 'center',
    flexShrink: 0,
  },
  mcInput: {
    flex: 1,
    paddingVertical: 6,
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.neutral900,
    backgroundColor: 'transparent',
  },
  mcRemove: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.neutral100,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.purple200,
    borderStyle: 'dashed',
    marginBottom: 4,
  },
  addOptionText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.purple600,
  },

  // FIB
  fibRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  blankPill: {
    backgroundColor: colors.teal50,
    borderWidth: 1.5,
    borderColor: colors.teal400,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
    flexShrink: 0,
  },
  blankPillText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.teal600,
  },
  infoBox: {
    backgroundColor: colors.blue50,
    borderWidth: 1.5,
    borderColor: colors.blue400,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 4,
  },
  infoText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.blue600,
    lineHeight: 17,
  },
  infoMono: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#FFF',
    paddingHorizontal: 3,
    borderRadius: 3,
  },

  // Dynamic
  dynRow: { flexDirection: 'row', gap: 12 },
  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.purple50,
    borderWidth: 1.5,
    borderColor: colors.purple200,
    borderRadius: radius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginLeft: 'auto',
  },
  addSlotText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.purple600,
  },

  // Template syntax card
  syntaxCard: {
    backgroundColor: colors.purple50,
    borderWidth: 1.5,
    borderColor: colors.purple100,
    borderRadius: radius.lg,
    marginBottom: 6,
    overflow: 'hidden',
  },
  syntaxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  syntaxTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.purple600,
  },
  syntaxBody: { paddingHorizontal: 12, paddingBottom: 12 },
  syntaxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  syntaxDesc: { fontFamily: 'Outfit_500Medium', fontSize: 11.5, color: colors.purple800 },
  syntaxSubHead: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.purple800,
    marginTop: 8,
    marginBottom: 4,
  },
  syntaxMono: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: '500' },
  tokenWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  codeToken: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: colors.purple100,
    borderRadius: 5,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  codeTokenText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11.5,
    color: colors.purple600,
  },

  // Difficulty
  diffRow: { flexDirection: 'row', gap: 8 },
  diffBtn: {
    width: 44, height: 44,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diffBtnActive: {
    backgroundColor: colors.gold400,
    borderColor: colors.gold600,
    shadowColor: colors.gold800,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  diffBtnText: {
    fontFamily: 'Nunito_900Black',
    fontSize: 16,
    color: colors.neutral800,
  },
  diffBtnTextActive: { color: colors.neutral900 },

  // Tags
  tagContainer: {
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    borderRadius: radius.md,
    backgroundColor: '#FFF',
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.purple50,
    borderWidth: 1.5,
    borderColor: colors.purple100,
    borderRadius: 999,
    paddingVertical: 3,
    paddingLeft: 8,
    paddingRight: 4,
  },
  tagPillText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: colors.purple600,
  },
  tagRemove: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.purple100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagInput: {
    flex: 1,
    minWidth: 80,
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.neutral900,
    paddingVertical: 4,
  },
  tagSuggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tagSuggestBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: colors.purple200,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tagSuggestText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: colors.purple600,
  },
});
