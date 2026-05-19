import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors, typeScale, spacing, radius } from '../theme';

export default function DynamicSyntaxGuide() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Template Syntax</Text>
      <Text style={styles.line}><Text style={styles.code}>[el(1,18).name]</Text>  element name (Z 1–18)</Text>
      <Text style={styles.line}><Text style={styles.code}>[el(1,118).symbol]</Text>  element symbol</Text>
      <Text style={styles.line}><Text style={styles.code}>[el(1,118).number]</Text>  atomic number</Text>
      <Text style={styles.line}><Text style={styles.code}>[el(1,118).mass]</Text>  atomic mass</Text>
      <Text style={styles.line}><Text style={styles.code}>[num(1,100)]</Text>  random integer</Text>
      <Text style={styles.line}><Text style={styles.code}>[compound(acids).formula]</Text>  compound</Text>
      <Text style={[styles.line, styles.lineSpaced]}>
        <Text style={styles.code}>Categories:</Text>  acids · bases · salts · oxides
      </Text>
      <Text style={[styles.line, styles.lineSpaced]}>
        <Text style={styles.code}>Cross-ref:</Text>{'  '}<Text style={styles.code}>[1.symbol]</Text>  slot 1's symbol  ·  <Text style={styles.code}>[1]</Text>  slot 1's num value
      </Text>
      <Text style={styles.line}><Text style={styles.code}>[1.number + num(-2,2)]</Text>  computed display</Text>
      <Text style={[styles.line, styles.lineSpaced]}>
        <Text style={styles.code}>Answer ref:</Text>  <Text style={styles.code}>1.number</Text>, <Text style={styles.code}>1.mass</Text>, <Text style={styles.code}>1+2</Text>, <Text style={styles.code}>2*1.number</Text>
      </Text>
      <Text style={[styles.line, styles.lineSpaced]}>
        <Text style={styles.code}>Comparison:</Text>{'  '}<Text style={styles.code}>[gt(1.mass,2.mass)]</Text>{'  '}slot with greater value
      </Text>
      <Text style={styles.line}>
        <Text style={styles.code}>[lt(1.mass,2.mass)]</Text>{'  '}slot with lesser value
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.purple50,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.purple200,
    padding: spacing[4],
    marginTop: spacing[3],
    gap: spacing[1],
  },
  title: { ...typeScale.label, color: colors.purple800, marginBottom: spacing[2] },
  line: { ...typeScale.caption, color: colors.neutral700, lineHeight: 18 },
  lineSpaced: { marginTop: spacing[2] },
  code: {
    ...typeScale.caption,
    color: colors.purple600,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
});
