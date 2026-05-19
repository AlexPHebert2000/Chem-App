import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, typeScale, radius, chunkyShadowColors } from '../theme';

export default function ShadowButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  shadowColor = chunkyShadowColors.purple,
  buttonColor = colors.purple400,
  disabledShadowColor = colors.purple200,
  disabledButtonColor = colors.purple100,
  labelColor = colors.neutral900,
  paddingVertical = 14,
  paddingHorizontal,
  style,
}) {
  const isDisabled = disabled || loading;
  return (
    <View style={[
      styles.shadow,
      { backgroundColor: isDisabled ? disabledShadowColor : shadowColor },
      style,
    ]}>
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: isDisabled ? disabledButtonColor : buttonColor },
          paddingHorizontal != null && { paddingHorizontal },
          { paddingVertical },
        ]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator color={labelColor} />
          : <Text style={[styles.label, { color: labelColor }]}>{label}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: radius.full,
    transform: [{ translateY: 4 }],
  },
  button: {
    borderRadius: radius.full,
    alignItems: 'center',
    transform: [{ translateY: -4 }],
  },
  label: { ...typeScale.button },
});
