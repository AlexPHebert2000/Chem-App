import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { ScreenSurface, ShadowButton } from '../../components/base';
import { colors, typeScale, screenPadding, radius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen({ navigation }) {
  const { token } = useAuth();
  const [goal, setGoal] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/students/me', token)
      .then(me => setGoal(String(me.weeklyMinuteGoal ?? 60)))
      .catch(() => {});
  }, [token]);

  const save = async () => {
    const val = parseInt(goal, 10);
    if (isNaN(val) || val < 1) {
      Alert.alert('Invalid', 'Please enter a positive number of minutes.');
      return;
    }
    setSaving(true);
    try {
      await api.patch('/students/me/goal', { weeklyMinuteGoal: val }, token);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message ?? 'Could not save goal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenSurface>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.neutral900} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Weekly active-time goal</Text>
        <Text style={styles.sub}>How many minutes per week do you want to study?</Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={goal}
            onChangeText={setGoal}
            keyboardType="number-pad"
            placeholder="60"
            placeholderTextColor={colors.neutral400}
            maxLength={4}
          />
          <Text style={styles.unit}>minutes</Text>
        </View>

        <ShadowButton
          label={saving ? 'Saving…' : 'Save'}
          variant="primary"
          onPress={save}
          disabled={saving}
          style={{ marginTop: 24 }}
        />
      </View>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral200,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typeScale.h2,
    color: colors.neutral900,
  },
  content: {
    padding: screenPadding.horizontal,
    paddingTop: 28,
    gap: 6,
  },
  label: {
    ...typeScale.h3,
    color: colors.neutral900,
  },
  sub: {
    ...typeScale.small,
    color: colors.neutral600,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    width: 88,
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 20,
    color: colors.neutral900,
    textAlign: 'center',
    backgroundColor: '#FFF',
  },
  unit: {
    ...typeScale.body,
    color: colors.neutral600,
  },
});
