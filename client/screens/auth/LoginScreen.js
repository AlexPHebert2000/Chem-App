import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors, typeScale, spacing, radius, screenPadding } from '../../theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();

  const [role, setRole] = useState('TEACHER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [courseId, setCourseId] = useState('');
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    setLoading(true);
    try {
      await login(role, email.trim(), password, role === 'STUDENT' ? courseId.trim() : undefined, stayLoggedIn);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        {/* Role toggle */}
        <View style={styles.roleRow}>
          {['TEACHER', 'STUDENT'].map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              onPress={() => setRole(r)}
            >
              <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                {r.charAt(0) + r.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.neutral600}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.neutral600}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
        />

        {role === 'STUDENT' && (
          <TextInput
            style={styles.input}
            placeholder="Course ID"
            placeholderTextColor={colors.neutral600}
            value={courseId}
            onChangeText={setCourseId}
            autoCapitalize="none"
          />
        )}

        {/* Stay logged in */}
        <TouchableOpacity style={styles.checkRow} onPress={() => setStayLoggedIn(v => !v)} activeOpacity={0.7}>
          <View style={[styles.checkbox, stayLoggedIn && styles.checkboxChecked]}>
            {stayLoggedIn && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkLabel}>Stay logged in</Text>
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Primary button */}
        <View style={styles.btnShadow}>
          <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color={colors.neutral900} />
              : <Text style={styles.btnText}>Sign in</Text>
            }
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={styles.link}>
          <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkBold}>Sign up</Text></Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral50 },
  container: {
    flexGrow: 1,
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: 80,
    paddingBottom: screenPadding.vertical,
  },
  title: { ...typeScale.h1, color: colors.purple800, marginBottom: spacing[1] },
  subtitle: { ...typeScale.body, color: colors.neutral600, marginBottom: spacing[5] },

  roleRow: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4] },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.purple200,
    alignItems: 'center',
  },
  roleBtnActive: { backgroundColor: colors.purple400, borderColor: colors.purple400 },
  roleBtnText: { ...typeScale.button, color: colors.purple600 },
  roleBtnTextActive: { color: colors.neutral900 },

  input: {
    ...typeScale.body,
    color: colors.neutral800,
    backgroundColor: colors.neutral100,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: 14,
    marginBottom: spacing[3],
  },

  error: { ...typeScale.small, color: colors.coral600, marginBottom: spacing[3] },

  btnShadow: {
    backgroundColor: colors.purple800,
    borderRadius: radius.full,
    marginTop: spacing[2],
    marginBottom: spacing[3],
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

  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.purple400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.purple400 },
  checkmark: { fontSize: 12, color: colors.neutral900, lineHeight: 16 },
  checkLabel: { ...typeScale.small, color: colors.neutral700 },

  link: { alignItems: 'center', marginTop: spacing[2] },
  linkText: { ...typeScale.small, color: colors.neutral600 },
  linkBold: { ...typeScale.small, color: colors.purple600, fontFamily: 'Nunito_800ExtraBold' },
});
