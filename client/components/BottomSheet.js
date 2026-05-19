import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors, radius } from '../theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function BottomSheet({ visible, onClose, children, title }) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withTiming(0, { duration: 280 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
    }
  }, [visible]);

  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd(e => {
      if (e.translationY > 100) {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
        opacity.value = withTiming(0, { duration: 200 });
        runOnJS(onClose)();
      } else {
        translateY.value = withTiming(0, { duration: 200 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          {/* Grabber */}
          <View style={styles.grabber} />

          {title && <Text style={styles.title}>{title}</Text>}

          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(33, 8, 79, 0.5)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingBottom: 32,
    paddingTop: 12,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 20,
  },
  grabber: {
    width: 44,
    height: 5,
    borderRadius: 99,
    backgroundColor: colors.neutral200,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Nunito_900Black',
    fontSize: 20,
    color: colors.neutral900,
    marginBottom: 16,
  },
});
