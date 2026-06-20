import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
} from 'react-native';

import { alertLib } from '../../lib/alertLib';
import { useAuth } from '../../context/AuthContext';
import { ShadowButton, ScreenSurface } from '../../components/base';
import { colors, typeScale, screenPadding, radius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

export default function SignupScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { signup } = useAuth();
  const [role, setRole] = useState('STUDENT');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password) {
      alertLib('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      alertLib('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await signup(role, name.trim(), email.trim().toLowerCase(), password);
    } catch (e) {
      alertLib('Sign up failed', e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenSurface>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 8 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.neutral900} />
          </Pressable>
        </View>

        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join ChemU and start learning.</Text>

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
          <Text style={styles.fieldLabel}>Full name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Alex Smith"
            placeholderTextColor={colors.neutral400}
            autoCapitalize="words"
            autoComplete="name"
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Email</Text>
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
              placeholder="Min. 8 characters"
              placeholderTextColor={colors.neutral400}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="new-password"
            />
            <Pressable onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.neutral400}
              />
            </Pressable>
          </View>

          <ShadowButton
            label={loading ? 'Creating account…' : 'Create account'}
            variant="primary"
            onPress={handleSignup}
            disabled={loading}
            style={{ marginTop: 28 }}
          />
        </View>

        {/* Log in link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}> Log in</Text>
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
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typeScale.display,
    color: colors.neutral900,
    marginBottom: 4,
  },
  subtitle: {
    ...typeScale.body,
    color: colors.neutral600,
    marginBottom: 28,
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
