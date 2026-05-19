import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

// 'done' | 'next' | 'locked'
const NODE_OFFSETS = [0, 44, -44, 28, -28, 0];

const themeMap = {
  purple: { fill: colors.purple400, deep: '#4A2690' },
  teal:   { fill: colors.teal400,   deep: colors.teal600 },
  coral:  { fill: colors.coral400,  deep: colors.coral600 },
  gold:   { fill: colors.gold400,   deep: colors.gold600 },
};

function starsFromScore(score) {
  if (score >= 90) return 3;
  if (score >= 75) return 2;
  return 1;
}

export default function SectionNode({ section, theme = 'purple', index = 0, onPress }) {
  const t = themeMap[theme] ?? themeMap.purple;
  const status = section.status ?? (section.completedAt ? 'done' : 'locked');
  const isDone = status === 'done';
  const isNext = status === 'next';
  const isLocked = status === 'locked';
  const size = isNext ? 88 : 68;
  const stars = isDone && section.bestScore != null ? starsFromScore(section.bestScore) : 0;
  const offsetX = NODE_OFFSETS[index % NODE_OFFSETS.length];

  const nudge = useSharedValue(0);
  useEffect(() => {
    if (isNext) {
      nudge.value = withRepeat(
        withSequence(withTiming(-3, { duration: 900 }), withTiming(0, { duration: 900 })),
        -1,
        false
      );
    }
  }, [isNext]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: nudge.value }],
  }));

  const nodeBg = isDone ? t.fill : isNext ? colors.gold400 : colors.neutral100;
  const nodeBorder = isLocked ? { borderWidth: 2, borderColor: colors.neutral300, borderStyle: 'dashed' } : {};
  const nodeShadow = !isLocked ? {
    shadowColor: isDone ? t.deep : isNext ? colors.gold600 : colors.neutral400,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  } : {};

  return (
    <View style={[styles.wrapper, { transform: [{ translateX: offsetX }] }]}>
      {/* Stars */}
      {isDone && (
        <View style={styles.stars}>
          {[0, 1, 2].map(i => (
            <Text key={i} style={{ fontSize: 12, opacity: i < stars ? 1 : 0.15 }}>★</Text>
          ))}
        </View>
      )}

      <Pressable
        onPress={() => !isLocked && onPress?.(section)}
        disabled={isLocked}
        style={({ pressed }) => [
          styles.node,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: nodeBg },
          nodeBorder,
          nodeShadow,
          pressed && !isLocked && { transform: [{ translateY: 4 }], shadowOffset: { width: 0, height: 2 } },
        ]}
      >
        {() => (
          <Animated.View style={[styles.nodeInner, isNext && animStyle]}>
            {isDone && <Ionicons name="checkmark" size={size * 0.45} color="#FFF" />}
            {isNext && <Ionicons name="play" size={size * 0.4} color={colors.neutral900} />}
            {isLocked && <Ionicons name="lock-closed" size={size * 0.38} color={colors.neutral600} />}
          </Animated.View>
        )}
      </Pressable>

      <Text style={[styles.title, isLocked && styles.titleLocked]}>{section.name ?? section.title}</Text>
      {isNext && <Text style={styles.startTag}>TAP TO START</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
    height: 16,
    alignItems: 'center',
  },
  node: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: colors.neutral900,
    textAlign: 'center',
    maxWidth: 200,
    lineHeight: 17,
    marginTop: 4,
  },
  titleLocked: {
    color: colors.neutral600,
  },
  startTag: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.gold800,
    backgroundColor: colors.gold100,
    borderWidth: 1.5,
    borderColor: colors.gold400,
    borderRadius: radius.full,
    paddingVertical: 2,
    paddingHorizontal: 8,
    overflow: 'hidden',
    marginTop: 2,
  },
});
