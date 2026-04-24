import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, typeScale, spacing, radius, screenPadding } from '../theme';

export default function HomeScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello, {user?.name}</Text>
      <Text style={styles.subtitle}>{user?.role === 'TEACHER' ? 'Teacher' : 'Student'}</Text>

      <View style={styles.btnShadow}>
        <TouchableOpacity style={styles.btn} onPress={logout} activeOpacity={0.85}>
          <Text style={styles.btnText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral50,
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: 80,
  },
  title: { ...typeScale.h1, color: colors.purple800, marginBottom: spacing[1] },
  subtitle: { ...typeScale.body, color: colors.neutral600, marginBottom: spacing[6] },
  btnShadow: {
    backgroundColor: colors.purple800,
    borderRadius: radius.full,
    transform: [{ translateY: 4 }],
  },
  btn: {
    backgroundColor: colors.purple400,
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    transform: [{ translateY: -4 }],
  },
  btnText: { ...typeScale.button, color: colors.neutral900 },
});
