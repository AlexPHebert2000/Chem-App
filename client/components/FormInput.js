import { TextInput, StyleSheet } from 'react-native';
import { colors, typeScale, radius, spacing } from '../theme';

export default function FormInput({ style, multiline, numberOfLines, height, ...props }) {
  return (
    <TextInput
      style={[
        styles.input,
        multiline && styles.multiline,
        multiline && height && { height },
        style,
      ]}
      placeholderTextColor={colors.neutral400}
      multiline={multiline}
      numberOfLines={numberOfLines}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    ...typeScale.body,
    color: colors.purple900,
    borderWidth: 1.5,
    borderColor: colors.purple200,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: 12,
    marginBottom: spacing[3],
  },
  multiline: { height: 80, textAlignVertical: 'top' },
});
