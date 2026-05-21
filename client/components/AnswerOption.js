import React, { useRef } from 'react';
import { Pressable, View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, typeScale } from '../theme';

// state: 'idle' | 'selected' | 'correct' | 'wrong' | 'muted'
const stateStyles = {
  idle:     { bg: '#FFFFFF',       border: colors.neutral200, dot: colors.neutral200, text: colors.neutral900, shadowColor: colors.neutral200 },
  selected: { bg: colors.purple50, border: colors.purple400,  dot: colors.purple400,  text: colors.purple800, shadowColor: colors.purple400 },
  correct:  { bg: colors.teal50,   border: colors.teal400,    dot: colors.teal400,    text: colors.teal600,   shadowColor: colors.teal400 },
  wrong:    { bg: colors.coral50,  border: colors.coral400,   dot: colors.coral400,   text: colors.coral600,  shadowColor: colors.coral400 },
  muted:    { bg: '#FFFFFF',       border: colors.neutral100, dot: colors.neutral200, text: colors.neutral600, shadowColor: 'transparent' },
};

export default function AnswerOption({ label, text, state = 'idle', onPress, disabled = false }) {
  const s = stateStyles[state] ?? stateStyles.idle;
  const pressed = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (!disabled && state !== 'muted')
      Animated.timing(pressed, { toValue: 1, duration: 80, useNativeDriver: true }).start();
  };
  const handlePressOut = () =>
    Animated.timing(pressed, { toValue: 0, duration: 100, useNativeDriver: true }).start();

  const animStyle = {
    transform: [{
      translateY: pressed.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
    }],
  };

  const showIcon = state === 'correct' || state === 'wrong';
  const dotActive = state === 'correct' || state === 'wrong' || state === 'selected';

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => !disabled && state === 'idle' && onPress?.()}
      disabled={disabled || state === 'muted'}
    >
      <Animated.View style={[
        styles.option,
        {
          backgroundColor: s.bg,
          borderColor: s.border,
          shadowColor: s.shadowColor,
          opacity: state === 'muted' ? 0.55 : 1,
        },
        animStyle,
      ]}>
        <View style={[styles.dot, { borderColor: s.dot, backgroundColor: dotActive ? s.dot : '#FFF' }]}>
          {showIcon ? (
            <Ionicons
              name={state === 'correct' ? 'checkmark' : 'close'}
              size={13}
              color="#FFF"
            />
          ) : (
            <Text style={[styles.dotLabel, { color: dotActive ? '#FFF' : colors.neutral800 }]}>{label}</Text>
          )}
        </View>
        <Text style={[styles.text, { color: s.text }]}>{text}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dotLabel: {
    fontFamily: 'Nunito_900Black',
    fontSize: 12,
  },
  text: {
    ...typeScale.body,
    fontFamily: 'Nunito_800ExtraBold',
    flex: 1,
  },
});
