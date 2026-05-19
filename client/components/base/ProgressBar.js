import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { colors, radius } from '../../theme';

export default function ProgressBar({ progress = 0, color = colors.purple400, height = 8, style }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.min(Math.max(progress, 0), 1), { duration: 400 });
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={[styles.track, { height }, style]}>
      <Animated.View style={[styles.fill, { backgroundColor: color, height, borderRadius: radius.full }, barStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.neutral100,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radius.full,
  },
});
