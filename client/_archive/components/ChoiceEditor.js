import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typeScale, spacing, radius } from '../theme';

export default function ChoiceEditor({ choices, onChoiceChange, onSetCorrect, onAddChoice, onRemoveChoice }) {
  return (
    <>
      {choices.map((choice, i) => (
        <View key={i} style={styles.row}>
          <TouchableOpacity
            style={[styles.radio, choice.isCorrect && styles.radioActive]}
            onPress={() => onSetCorrect(i)}
            activeOpacity={0.8}
          >
            {choice.isCorrect && <View style={styles.radioDot} />}
          </TouchableOpacity>
          <TextInput
            style={[styles.input, styles.choiceInput]}
            placeholder={`Choice ${i + 1}`}
            placeholderTextColor={colors.neutral400}
            value={choice.content}
            onChangeText={text => onChoiceChange(i, text)}
          />
          {choices.length > 2 && (
            <TouchableOpacity onPress={() => onRemoveChoice(i)} style={styles.removeBtn} activeOpacity={0.7}>
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      {choices.length < 6 && (
        <TouchableOpacity onPress={onAddChoice} style={styles.addChoice} activeOpacity={0.7}>
          <Text style={styles.addChoiceText}>+ Add choice</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.purple200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.purple400 },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.purple400 },
  input: {
    ...typeScale.body,
    color: colors.purple900,
    borderWidth: 1.5,
    borderColor: colors.purple200,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: 12,
  },
  choiceInput: { flex: 1 },
  removeBtn: { padding: 6 },
  removeText: { ...typeScale.label, color: colors.coral400 },
  addChoice: { paddingVertical: spacing[2] },
  addChoiceText: { ...typeScale.label, color: colors.purple400 },
});
