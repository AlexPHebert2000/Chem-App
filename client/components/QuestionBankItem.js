import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, typeScale } from '../theme';
import Chip from './base/Chip';

const TYPE_LABELS = {
  MULTIPLE_CHOICE: 'MC',
  FILL_IN_BLANK:   'Fill-in',
  DYNAMIC:         'Dynamic',
};

const DIFF_COLORS = ['', 'teal', 'gold', 'gold', 'coral', 'coral'];

export default function QuestionBankItem({ question, onPress }) {
  const typeLabel = TYPE_LABELS[question.type] ?? question.type;
  const diffColor = DIFF_COLORS[question.difficulty] ?? 'neutral';

  return (
    <Pressable onPress={() => onPress?.(question)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.body}>
        <Text style={styles.preview} numberOfLines={2}>{question.content}</Text>
        <View style={styles.chips}>
          <Chip label={typeLabel} color="purple" />
          <Chip label={`Difficulty ${question.difficulty}`} color={diffColor} />
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral100,
  },
  pressed: {
    backgroundColor: colors.purple50,
  },
  body: {
    flex: 1,
    gap: 6,
  },
  preview: {
    ...typeScale.small,
    color: colors.neutral900,
    fontFamily: 'Outfit_500Medium',
  },
  chips: {
    flexDirection: 'row',
    gap: 6,
  },
  chevron: {
    fontSize: 22,
    color: colors.neutral400,
    fontFamily: 'Nunito_700Bold',
  },
});
