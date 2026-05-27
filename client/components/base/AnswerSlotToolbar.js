import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { colors, radius } from '../../theme';

export default function AnswerSlotToolbar({ slots, onInsert }) {
  if (!slots || slots.length === 0) {
    return (
      <View style={s.bar}>
        <View style={s.row}>
          <Text style={s.emptyText}>Add slots to the question to insert references</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={s.bar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.row}
        keyboardShouldPersistTaps="always"
      >
        {slots.flatMap(slot =>
          slot.refs.map(ref => (
            <Pressable
              key={ref}
              onPress={() => onInsert(ref)}
              style={({ pressed }) => [s.chip, pressed && s.chipPressed]}
            >
              <Text style={s.chipText}>{ref}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    backgroundColor: colors.neutral50,
    borderTopWidth: 1,
    borderTopColor: colors.neutral200,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  chip: {
    backgroundColor: colors.teal50,
    borderWidth: 1.5,
    borderColor: colors.teal400,
    borderRadius: radius.full,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  chipPressed: {
    backgroundColor: '#B2EBE5',
  },
  chipText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: colors.teal600,
  },
  emptyText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: colors.neutral400,
    fontStyle: 'italic',
  },
});
