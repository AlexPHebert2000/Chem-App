import React, { useRef } from 'react';
import { Pressable, View, Text, Animated, StyleSheet } from 'react-native';
import { colors, radius, typeScale, chunkyShadowColors } from '../../theme';

const SHADOW_OFFSET = 4;
const PRESS_TRANSLATE = 3;

const variantMap = {
  primary:   { fill: colors.purple400, shadow: chunkyShadowColors.purple },
  secondary: { fill: colors.gold400,   shadow: chunkyShadowColors.gold },
  success:   { fill: colors.teal400,   shadow: chunkyShadowColors.teal },
  danger:    { fill: colors.coral400,  shadow: chunkyShadowColors.coral },
  ghost:     { fill: '#FFFFFF',        shadow: chunkyShadowColors.neutral, border: colors.purple200 },
};

export default function ShadowButton({ label, onPress, variant = 'primary', disabled = false, style }) {
  const v = variantMap[variant] ?? variantMap.primary;
  const pressed = useRef(new Animated.Value(0)).current;

  const handlePressIn = () =>
    Animated.timing(pressed, { toValue: 1, duration: 80, useNativeDriver: true }).start();
  const handlePressOut = () =>
    Animated.timing(pressed, { toValue: 0, duration: 100, useNativeDriver: true }).start();

  const btnStyle = {
    transform: [{
      translateY: pressed.interpolate({ inputRange: [0, 1], outputRange: [0, PRESS_TRANSLATE] }),
    }],
  };

  return (
    <View style={[styles.wrapper, style]}>
      <View style={[styles.shadowLayer, { backgroundColor: v.shadow, borderRadius: radius.full }]} />
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        disabled={disabled}
        style={{ borderRadius: radius.full }}
      >
        <Animated.View style={[
          styles.button,
          { backgroundColor: disabled ? colors.neutral200 : v.fill },
          v.border && { borderWidth: 2, borderColor: v.border },
          btnStyle,
        ]}>
          <Text style={[styles.label, disabled && { color: colors.neutral600 }]}>{label}</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  shadowLayer: {
    position: 'absolute',
    top: SHADOW_OFFSET,
    left: 0,
    right: 0,
    bottom: 0,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typeScale.button,
    color: colors.neutral900,
  },
});
