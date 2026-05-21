import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typeScale } from '../theme';
import ShadowButton from './base/ShadowButton';

export default function FeedbackBar({ result, message, onContinue }) {
  const translateY = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (result) {
      translateY.setValue(100);
      Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }).start();
    }
  }, [result]);

  if (!result) return null;

  const isCorrect = result === 'correct';

  return (
    <Animated.View style={[
      styles.bar,
      {
        borderTopColor: isCorrect ? colors.teal400 : colors.coral400,
        backgroundColor: isCorrect ? colors.teal50 : colors.coral50,
        transform: [{ translateY }],
      },
    ]}>
      <View style={styles.row}>
        <View style={[
          styles.iconCircle,
          {
            backgroundColor: isCorrect ? colors.teal400 : colors.coral400,
            shadowColor: isCorrect ? colors.teal600 : colors.coral600,
          },
        ]}>
          <Ionicons name={isCorrect ? 'checkmark' : 'close'} size={18} color="#FFF" />
        </View>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: isCorrect ? colors.teal600 : colors.coral600 }]}>
            {isCorrect ? 'Nice work!' : 'Not quite.'}
          </Text>
          {message ? (
            <Text style={[styles.body, { color: isCorrect ? colors.teal600 : colors.coral600 }]}>
              {message}
            </Text>
          ) : null}
        </View>
      </View>

      <ShadowButton
        label="Continue"
        variant={isCorrect ? 'success' : 'primary'}
        onPress={onContinue}
        style={styles.btn}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 2,
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontFamily: 'Nunito_900Black',
    fontSize: 18,
    lineHeight: 22,
  },
  body: {
    ...typeScale.small,
    marginTop: 2,
  },
  btn: {
    marginTop: 2,
  },
});
