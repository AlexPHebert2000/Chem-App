import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, Switch,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { ShadowButton, ScreenSurface } from '../../components/base';
import { colors, typeScale, screenPadding, radius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [role, setRole] = useState('STUDENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(role, email.trim().toLowerCase(), password, stayLoggedIn);
    } catch (e) {
      Alert.alert('Login failed', e.message ?? 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenSurface>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / wordmark */}
        <View style={styles.logoArea}>
          <View style={styles.logoMark}>
            <Ionicons name="flask" size={32} color={colors.purple600} />
          </View>
          <Text style={styles.appName}>ChemApp</Text>
          <Text style={styles.tagline}>Master chemistry, one section at a time.</Text>
        </View>

        {/* Role toggle */}
        <View style={styles.roleRow}>
          <Pressable
            style={[styles.roleBtn, role === 'STUDENT' && styles.roleBtnActive]}
            onPress={() => setRole('STUDENT')}
          >
            <Ionicons
              name="school-outline"
              size={16}
              color={role === 'STUDENT' ? colors.purple600 : colors.neutral400}
            />
            <Text style={[styles.roleLabel, role === 'STUDENT' && styles.roleLabelActive]}>
              Student
            </Text>
          </Pressable>
          <Pressable
            style={[styles.roleBtn, role === 'TEACHER' && styles.roleBtnActive]}
            onPress={() => setRole('TEACHER')}
          >
            <Ionicons
              name="people-outline"
              size={16}
              color={role === 'TEACHER' ? colors.purple600 : colors.neutral400}
            />
            <Text style={[styles.roleLabel, role === 'TEACHER' && styles.roleLabelActive]}>
              Teacher
            </Text>
          </Pressable>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.neutral400}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.neutral400}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <Pressable onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.neutral400}
              />
            </Pressable>
          </View>

          <View style={styles.stayRow}>
            <Switch
              value={stayLoggedIn}
              onValueChange={setStayLoggedIn}
              trackColor={{ false: colors.neutral200, true: colors.purple400 }}
              thumbColor="#FFF"
            />
            <Text style={styles.stayLabel}>Stay logged in</Text>
          </View>

          <ShadowButton
            label={loading ? 'Logging in…' : 'Log in'}
            variant="primary"
            onPress={handleLogin}
            disabled={loading}
            style={{ marginTop: 24 }}
          />
        </View>

        {/* Sign up link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <Pressable onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.footerLink}> Sign up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.purple50,
    borderWidth: 2,
    borderColor: colors.purple200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  appName: {
    ...typeScale.display,
    color: colors.neutral900,
    marginBottom: 4,
  },
  tagline: {
    ...typeScale.body,
    color: colors.neutral600,
    textAlign: 'center',
  },
  roleRow: {
    flexDirection: 'row',
    backgroundColor: colors.neutral100,
    borderRadius: radius.lg,
    padding: 4,
    marginBottom: 28,
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  roleBtnActive: {
    backgroundColor: '#FFF',
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  roleLabel: {
    ...typeScale.h3,
    color: colors.neutral400,
  },
  roleLabelActive: {
    color: colors.purple600,
  },
  form: {
    gap: 0,
  },
  fieldLabel: {
    ...typeScale.label,
    color: colors.neutral600,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: colors.neutral900,
    backgroundColor: '#FFF',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyeBtn: {
    padding: 10,
  },
  stayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  stayLabel: {
    ...typeScale.body,
    color: colors.neutral600,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    ...typeScale.body,
    color: colors.neutral600,
  },
  footerLink: {
    ...typeScale.body,
    color: colors.purple600,
    fontFamily: 'Nunito_700Bold',
  },
});
