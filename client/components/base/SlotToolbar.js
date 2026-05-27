import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';

const QUICK_PICKS = [
  { label: 'El Name',   expr: '[el(1,18).name]' },
  { label: 'El Symbol', expr: '[el(1,18).symbol]' },
  { label: '1–100',     expr: '[num(1,100)]' },
];

export default function SlotToolbar({ onQuickInsert, onMorePress }) {
  return (
    <View style={s.bar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.row}
        keyboardShouldPersistTaps="always"
      >
        {QUICK_PICKS.map(pick => (
          <Pressable
            key={pick.expr}
            onPress={() => onQuickInsert(pick.expr)}
            style={({ pressed }) => [s.chip, pressed && s.chipPressed]}
          >
            <Ionicons name="add" size={11} color={colors.purple600} />
            <Text style={s.chipText}>{pick.label}</Text>
          </Pressable>
        ))}
        <View style={s.divider} />
        <Pressable
          onPress={onMorePress}
          style={({ pressed }) => [s.moreBtn, pressed && s.moreBtnPressed]}
        >
          <Text style={s.moreText}>More…</Text>
        </Pressable>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.purple50,
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
  divider: {
    width: 1,
    height: 20,
    backgroundColor: colors.neutral200,
    marginHorizontal: 4,
  },
  moreBtn: {
    backgroundColor: colors.neutral100,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    borderRadius: radius.full,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  moreBtnPressed: {
    backgroundColor: colors.neutral200,
  },
  moreText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: colors.neutral800,
  },
});
