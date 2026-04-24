import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors, typeScale, spacing, radius, screenPadding } from '../../theme';

export default function SignupScreen({ navigation }) {
  const { signup } = useAuth();

  const [role, setRole] = useState('TEACHER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    setError('');
    setLoading(true);
    try {
      await signup(role, name.trim(), email.trim(), password);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Get started for free</Text>

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
          placeholder="Full name"
          placeholderTextColor={colors.neutral600}
          value={name}
          onChangeText={setName}
          autoComplete="name"
        />

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
          placeholder="Password (min 8 characters)"
          placeholderTextColor={colors.neutral600}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        {role === 'STUDENT' && (
          <Text style={styles.hint}>
            You'll need a Course ID to log in. Ask your teacher for it.
          </Text>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.btnShadow}>
          <TouchableOpacity style={styles.btn} onPress={handleSignup} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color={colors.neutral900} />
              : <Text style={styles.btnText}>Create account</Text>
            }
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.link}>
          <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Sign in</Text></Text>
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
    paddingTop: 60,
    paddingBottom: screenPadding.vertical,
  },
  back: { marginBottom: spacing[4] },
  backText: { ...typeScale.small, color: colors.purple600, fontFamily: 'Nunito_700Bold' },

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

  hint: { ...typeScale.caption, color: colors.neutral600, marginBottom: spacing[3] },
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

  link: { alignItems: 'center', marginTop: spacing[2] },
  linkText: { ...typeScale.small, color: colors.neutral600 },
  linkBold: { ...typeScale.small, color: colors.purple600, fontFamily: 'Nunito_800ExtraBold' },
});
