import { Text, StyleSheet } from 'react-native';
import { colors, typeScale, spacing } from '../theme';

export default function EmptyState({ title, subtitle, style }) {
  return (
    <>
      <Text style={[styles.title, style]}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </>
  );
}

const styles = StyleSheet.create({
  title: { ...typeScale.body, color: colors.neutral400, textAlign: 'center', marginTop: spacing[6] },
  subtitle: { ...typeScale.small, color: colors.neutral400, textAlign: 'center', marginTop: spacing[1] },
});
