import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, typeScale, screenPadding } from '../theme';

export default function ScreenHeader({ title, subtitle }) {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} activeOpacity={0.7}>
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>
      <View style={styles.titles}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: colors.neutral50,
    gap: 12,
  },
  back: { padding: 4 },
  backArrow: { fontSize: 24, color: colors.purple600 },
  titles: { flex: 1 },
  title: { ...typeScale.h2, color: colors.purple800 },
  subtitle: { ...typeScale.label, color: colors.neutral600, marginTop: 2 },
});
