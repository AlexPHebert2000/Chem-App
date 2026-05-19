import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, typeScale } from '../../theme';

const colorMap = {
  purple: { bg: colors.purple50, border: colors.purple200, text: colors.purple600 },
  gold:   { bg: colors.gold50,   border: colors.gold200,   text: colors.gold600 },
  teal:   { bg: colors.teal50,   border: colors.teal400,   text: colors.teal600 },
  coral:  { bg: colors.coral50,  border: colors.coral400,  text: colors.coral600 },
  green:  { bg: colors.green50,  border: colors.green400,  text: colors.green600 },
  blue:   { bg: colors.blue50,   border: colors.blue400,   text: colors.blue600 },
  neutral:{ bg: colors.neutral100, border: colors.neutral200, text: colors.neutral600 },
};

export default function Chip({ label, color = 'purple', variant = 'filled', icon, onPress, style }) {
  const c = colorMap[color] ?? colorMap.purple;
  const isOutline = variant === 'outline';

  const inner = (
    <View style={[
      styles.chip,
      { backgroundColor: isOutline ? 'transparent' : c.bg, borderColor: c.border },
      !onPress && style,
    ]}>
      {icon && <>{icon}</>}
      <Text style={[styles.label, { color: c.text }]}>{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={style}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1.5,
    gap: 4,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  label: {
    ...typeScale.caption,
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
  },
});
