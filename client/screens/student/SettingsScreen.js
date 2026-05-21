import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Modal, Animated,
  Switch, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Ellipse } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { colors } from '../../theme';
import { ScreenSurface } from '../../components/base';

// ─── Toggle ──────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: colors.neutral200, true: colors.teal400 }}
      thumbColor="#fff"
      ios_backgroundColor={colors.neutral200}
    />
  );
}

// ─── GoalStepper ─────────────────────────────────────────────────────────────
function GoalStepper({ value, onChange }) {
  const dec = () => onChange(Math.max(30, value - 15));
  const inc = () => onChange(Math.min(600, value + 15));
  return (
    <View style={styles.stepper}>
      <Pressable onPress={dec} style={styles.stepBtn}>
        <Text style={styles.stepBtnText}>−</Text>
      </Pressable>
      <View style={styles.stepValueBox}>
        <Text style={styles.stepValueNum}>{value}</Text>
        <Text style={styles.stepValueUnit}>MIN</Text>
      </View>
      <Pressable onPress={inc} style={styles.stepBtn}>
        <Text style={styles.stepBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

// ─── SegControl ──────────────────────────────────────────────────────────────
function SegControl({ value, options, onChange }) {
  return (
    <View style={styles.seg}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)}
            style={[styles.segItem, on && styles.segItemOn]}>
            <Text style={[styles.segItemText, on && styles.segItemTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── SettingsCard ─────────────────────────────────────────────────────────────
function SettingsCard({ title, accent, children }) {
  return (
    <View>
      {title && (
        <View style={styles.cardTitleRow}>
          <View style={[styles.cardAccentBar, { backgroundColor: accent }]}/>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
      )}
      <View style={styles.card}>
        {children}
      </View>
    </View>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────
function Row({ emoji, iconBg, label, sublabel, right, onPress, last, disabled }) {
  const content = (
    <View style={[styles.row, last && styles.rowLast, disabled && styles.rowDisabled]}>
      <View style={[styles.rowIcon, { backgroundColor: disabled ? colors.neutral100 : iconBg }]}>
        <Text style={[styles.rowIconEmoji, disabled && { opacity: 0.4 }]}>{emoji}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowLabelRow}>
          <Text style={[styles.rowLabel, disabled && styles.rowLabelDisabled]}>{label}</Text>
          {disabled && (
            <View style={styles.comingSoonPill}>
              <Text style={styles.comingSoonText}>coming soon</Text>
            </View>
          )}
        </View>
        {sublabel ? (
          <Text style={[styles.rowSublabel, disabled && { color: colors.neutral400 }]} numberOfLines={1}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      <View style={[styles.rowRight, disabled && { opacity: 0.3 }]}>
        {right}
        {onPress ? <Text style={styles.rowChevron}>›</Text> : null}
      </View>
    </View>
  );
  if (onPress && !disabled) return <Pressable onPress={onPress}>{content}</Pressable>;
  return content;
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ text }) {
  return (
    <View style={styles.toast} pointerEvents="none">
      <Text style={styles.toastText}>✓  {text}</Text>
    </View>
  );
}

// ─── SettingsScreen ───────────────────────────────────────────────────────────
export default function SettingsScreen({ navigation }) {
  const { token, logout, user, updateUser } = useAuth();
  const isStudent = user?.role === 'STUDENT';

  // account state (loaded from API)
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [className, setClassName] = useState('');

  // learning (student only)
  const [weeklyGoal, setWeeklyGoal]     = useState(60);
  const [originalGoal, setOriginalGoal] = useState(60);

  const [theme, setTheme]       = useState('light');
  const [textSize, setTextSize] = useState('regular');

  // modal state
  const [editModal, setEditModal] = useState(null); // null | 'name' | 'password'
  const [newName, setNewName]             = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingModal, setSavingModal]     = useState(false);

  // logout & toast
  const [showLogout, setShowLogout] = useState(false);
  const [toast, setToast]           = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((text) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1600);
  }, []);

  const load = useCallback(async () => {
    try {
      if (isStudent) {
        const me = await api.get('/students/me', token);
        setName(me.name ?? '');
        setEmail(me.email ?? '');
        const enr = me.enrollments?.[0];
        if (enr) {
          const sec = enr.courseClass?.sectionNumber;
          setClassName(sec ? `Section ${sec}` : '');
        }
        const goal = me.weeklyMinuteGoal ?? 60;
        setWeeklyGoal(goal);
        setOriginalGoal(goal);
      } else {
        const me = await api.get('/auth/me', token);
        setName(me.name ?? '');
        setEmail(me.email ?? '');
      }
    } catch (e) {
      console.warn('SettingsScreen load error:', e.message);
    }
  }, [token, isStudent]);

  useEffect(() => { load(); }, [load]);

  const saveGoal = useCallback(async (val) => {
    if (val === originalGoal) return;
    try {
      await api.patch('/students/me/goal', { weeklyMinuteGoal: val }, token);
      setOriginalGoal(val);
      showToast('Weekly goal saved');
    } catch {
      showToast('Could not save goal');
    }
  }, [originalGoal, token, showToast]);

  // ── Name edit ──────────────────────────────────────────────────────────────
  const openNameModal = () => {
    setNewName(name);
    setEditModal('name');
  };

  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) { Alert.alert('Error', 'Name cannot be blank.'); return; }
    setSavingModal(true);
    try {
      const updated = await api.patch('/auth/me', { name: trimmed }, token);
      setName(updated.name);
      updateUser({ name: updated.name });
      setEditModal(null);
      showToast('Name updated');
    } catch (e) {
      Alert.alert('Error', e.message ?? 'Could not update name.');
    } finally {
      setSavingModal(false);
    }
  };

  // ── Password change ────────────────────────────────────────────────────────
  const openPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setEditModal('password');
  };

  const handleSavePassword = async () => {
    if (!currentPassword) { Alert.alert('Error', 'Enter your current password.'); return; }
    if (newPassword.length < 8) { Alert.alert('Error', 'New password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Error', 'New passwords do not match.'); return; }
    setSavingModal(true);
    try {
      await api.patch('/auth/me', { currentPassword, newPassword }, token);
      setEditModal(null);
      showToast('Password changed');
    } catch (e) {
      Alert.alert('Error', e.message ?? 'Could not change password.');
    } finally {
      setSavingModal(false);
    }
  };

  const closeModal = () => {
    if (!savingModal) setEditModal(null);
  };

  const inits = name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <ScreenSurface>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        onScrollEndDrag={() => isStudent && saveGoal(weeklyGoal)}
      >
        {/* ── Hero Header ── */}
        <LinearGradient
          colors={[colors.purple800, colors.purple600]}
          start={{ x: 0.1, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Svg viewBox="0 0 200 200" style={styles.atomDecor}>
            <Ellipse cx="100" cy="100" rx="80" ry="30"
              fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2"/>
            <Ellipse cx="100" cy="100" rx="80" ry="30"
              fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2"
              transform="rotate(60, 100, 100)"/>
            <Ellipse cx="100" cy="100" rx="80" ry="30"
              fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2"
              transform="rotate(120, 100, 100)"/>
            <Circle cx="100" cy="100" r="8" fill="rgba(255,255,255,0.6)"/>
          </Svg>

          <View style={styles.heroTop}>
            <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backChevron}>‹</Text>
            </Pressable>
            <Text style={styles.heroTitle}>Settings</Text>
            <View style={{ width: 34 }}/>
          </View>
        </LinearGradient>

        {/* ── Profile card (overlaps hero) ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{inits}</Text>
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.profileName} numberOfLines={1}>{name || '—'}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{email || '—'}</Text>
            {className ? (
              <View style={styles.classRow}>
                <Text style={styles.classRowText}>🏆 {className}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Sections ── */}
        <View style={styles.body}>

          {/* ACCOUNT */}
          <SettingsCard title="Account" accent={colors.purple600}>
            <Row emoji="👤" iconBg={colors.purple50} label="Display name" sublabel={name}
              onPress={openNameModal}/>
            <Row emoji="✉️" iconBg={colors.purple50} label="Email" sublabel={email}/>
            <Row emoji="🔑" iconBg={colors.purple50} label="Change password"
              onPress={openPasswordModal} last/>
          </SettingsCard>

          {/* NOTIFICATIONS */}
          <SettingsCard title="Notifications" accent={colors.gold600}>
            <Row emoji="🔔" iconBg={colors.gold50} label="Push notifications"
              sublabel="Streak alerts, badge unlocks, weekly recap"
              right={<Toggle value={false} onChange={() => {}}/>} disabled/>
            <Row emoji="🕐" iconBg={colors.gold50} label="Study reminder"
              sublabel="Daily reminder"
              right={<Toggle value={false} onChange={() => {}}/>} disabled last/>
          </SettingsCard>

          {/* LEARNING — students only */}
          {isStudent && (
            <SettingsCard title="Learning" accent={colors.teal600}>
              <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.neutral100 }]}>
                <View style={[styles.rowIcon, { backgroundColor: colors.teal50 }]}>
                  <Text style={styles.rowIconEmoji}>🎯</Text>
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowLabel}>Weekly goal</Text>
                  <Text style={styles.rowSublabel}>Minutes of study per week</Text>
                </View>
                <GoalStepper
                  value={weeklyGoal}
                  onChange={(val) => { setWeeklyGoal(val); saveGoal(val); }}
                />
              </View>
              <Row emoji="⚡" iconBg={colors.teal50} label="Sound effects"
                sublabel="XP chimes, correct answer sounds"
                right={<Toggle value={false} onChange={() => {}}/>} disabled/>
              <Row emoji="🔥" iconBg={colors.teal50} label="Haptic feedback"
                sublabel="Vibrations on taps and streaks"
                right={<Toggle value={false} onChange={() => {}}/>} disabled last/>
            </SettingsCard>
          )}

          {/* APPEARANCE */}
          <SettingsCard title="Appearance" accent={colors.coral600}>
            <View style={[styles.row, styles.rowDisabled, { borderBottomWidth: 1, borderBottomColor: colors.neutral100 }]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.neutral100 }]}>
                <Text style={[styles.rowIconEmoji, { opacity: 0.4 }]}>☀️</Text>
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowLabelRow}>
                  <Text style={[styles.rowLabel, styles.rowLabelDisabled]}>Theme</Text>
                  <View style={styles.comingSoonPill}>
                    <Text style={styles.comingSoonText}>coming soon</Text>
                  </View>
                </View>
              </View>
              <View style={{ opacity: 0.3 }}>
                <SegControl value={theme} onChange={() => {}}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark',  label: 'Dark' },
                    { value: 'auto',  label: 'Auto' },
                  ]}
                />
              </View>
            </View>
            <View style={[styles.row, styles.rowDisabled]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.neutral100 }]}>
                <Text style={[styles.rowIconEmoji, { fontSize: 14, fontFamily: 'Nunito_900Black', opacity: 0.4 }]}>Aa</Text>
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowLabelRow}>
                  <Text style={[styles.rowLabel, styles.rowLabelDisabled]}>Text size</Text>
                  <View style={styles.comingSoonPill}>
                    <Text style={styles.comingSoonText}>coming soon</Text>
                  </View>
                </View>
              </View>
              <View style={{ opacity: 0.3 }}>
                <SegControl value={textSize} onChange={() => {}}
                  options={[
                    { value: 'small',   label: 'S' },
                    { value: 'regular', label: 'M' },
                    { value: 'large',   label: 'L' },
                  ]}
                />
              </View>
            </View>
          </SettingsCard>

          {/* SIGN OUT */}
          <Pressable style={styles.signOutBtn} onPress={() => setShowLogout(true)}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>

          <Text style={styles.versionText}>Chem App · v1.0.0</Text>
        </View>
      </ScrollView>

      {/* ── Edit name modal ── */}
      <Modal visible={editModal === 'name'} transparent animationType="fade" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={styles.sheetOverlay} onPress={closeModal}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.sheetHandle}/>
              <View style={styles.sheetIcon}>
                <Text style={{ fontSize: 26 }}>👤</Text>
              </View>
              <Text style={styles.sheetTitle}>Display name</Text>
              <Text style={styles.sheetBody}>This is how your name appears to teachers and classmates.</Text>
              <TextInput
                style={styles.modalInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Your name"
                placeholderTextColor={colors.neutral400}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
              />
              <Pressable style={[styles.sheetConfirmBtn, savingModal && { opacity: 0.6 }]}
                onPress={handleSaveName} disabled={savingModal}>
                <Text style={styles.sheetConfirmText}>{savingModal ? 'Saving…' : 'Save name'}</Text>
              </Pressable>
              <Pressable style={styles.sheetCancelBtn} onPress={closeModal} disabled={savingModal}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Change password modal ── */}
      <Modal visible={editModal === 'password'} transparent animationType="fade" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={styles.sheetOverlay} onPress={closeModal}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.sheetHandle}/>
              <View style={styles.sheetIcon}>
                <Text style={{ fontSize: 26 }}>🔑</Text>
              </View>
              <Text style={styles.sheetTitle}>Change password</Text>
              <TextInput
                style={styles.modalInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Current password"
                placeholderTextColor={colors.neutral400}
                secureTextEntry
                autoFocus
                returnKeyType="next"
              />
              <TextInput
                style={[styles.modalInput, { marginTop: 8 }]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New password (min 8 characters)"
                placeholderTextColor={colors.neutral400}
                secureTextEntry
                returnKeyType="next"
              />
              <TextInput
                style={[styles.modalInput, { marginTop: 8 }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={colors.neutral400}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSavePassword}
              />
              <Pressable style={[styles.sheetConfirmBtn, savingModal && { opacity: 0.6 }]}
                onPress={handleSavePassword} disabled={savingModal}>
                <Text style={styles.sheetConfirmText}>{savingModal ? 'Saving…' : 'Change password'}</Text>
              </Pressable>
              <Pressable style={styles.sheetCancelBtn} onPress={closeModal} disabled={savingModal}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Sign-out confirmation sheet ── */}
      <Modal
        visible={showLogout}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLogout(false)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setShowLogout(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle}/>
            <View style={styles.sheetIcon}>
              <Text style={{ fontSize: 26 }}>🚪</Text>
            </View>
            <Text style={styles.sheetTitle}>Sign out?</Text>
            <Text style={styles.sheetBody}>
              {"You'll lose your streak progress for today\nif you don't come back before midnight."}
            </Text>
            <Pressable style={styles.sheetConfirmBtn} onPress={() => { setShowLogout(false); logout(); }}>
              <Text style={styles.sheetConfirmText}>Yes, sign out</Text>
            </Pressable>
            <Pressable style={styles.sheetCancelBtn} onPress={() => setShowLogout(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Toast ── */}
      {toast ? <Toast text={toast}/> : null}
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },

  // Hero
  hero: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 64,
    overflow: 'hidden',
  },
  atomDecor: {
    position: 'absolute',
    right: -40,
    top: -30,
    width: 180,
    height: 180,
    opacity: 0.10,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChevron: {
    fontFamily: 'Nunito_900Black',
    fontSize: 22,
    color: '#fff',
    lineHeight: 24,
  },
  heroTitle: {
    fontFamily: 'Nunito_900Black',
    fontSize: 18,
    color: '#fff',
    letterSpacing: 0.2,
  },

  // Profile card
  profileCard: {
    marginHorizontal: 14,
    marginTop: -48,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.neutral100,
    padding: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
    zIndex: 1,
  },
  avatarWrap: { position: 'relative', flex: 'none' },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gold400,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold600,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 3,
  },
  avatarText: {
    fontFamily: 'Nunito_900Black',
    fontSize: 24,
    color: '#fff',
  },
  profileName: {
    fontFamily: 'Nunito_900Black',
    fontSize: 17,
    color: colors.neutral900,
    marginBottom: 2,
  },
  profileEmail: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.neutral600,
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  classRowText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10.5,
    color: colors.purple600,
    letterSpacing: 0.4,
  },

  // Body
  body: {
    padding: 14,
    paddingTop: 18,
    gap: 18,
  },

  // Card
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    marginBottom: 8,
  },
  cardAccentBar: {
    width: 4,
    height: 14,
    borderRadius: 2,
  },
  cardTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: colors.neutral600,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.neutral100,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral100,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowIconEmoji: { fontSize: 16 },
  rowBody: { flex: 1, minWidth: 0 },
  rowLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowLabel: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13.5,
    color: colors.neutral900,
  },
  rowLabelDisabled: { color: colors.neutral400 },
  rowDisabled: { opacity: 0.75 },
  rowSublabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11.5,
    color: colors.neutral600,
    marginTop: 1,
  },
  comingSoonPill: {
    backgroundColor: colors.neutral100,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: colors.neutral200,
  },
  comingSoonText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 9,
    color: colors.neutral400,
    letterSpacing: 0.3,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  rowChevron: {
    fontSize: 20,
    color: colors.neutral400,
    lineHeight: 22,
  },

  // Stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.purple50,
    borderWidth: 1.5,
    borderColor: colors.purple100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.purple200,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 1,
  },
  stepBtnText: {
    fontFamily: 'Nunito_900Black',
    fontSize: 18,
    color: colors.purple600,
    lineHeight: 20,
  },
  stepValueBox: {
    minWidth: 68,
    alignItems: 'center',
    backgroundColor: colors.gold50,
    borderWidth: 1.5,
    borderColor: colors.gold200,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
    shadowColor: colors.gold200,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 1,
  },
  stepValueNum: {
    fontFamily: 'Nunito_900Black',
    fontSize: 16,
    color: colors.gold800,
  },
  stepValueUnit: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    color: colors.gold800,
    letterSpacing: 0.6,
    alignSelf: 'flex-end',
    paddingBottom: 1,
  },

  // Segment control
  seg: {
    flexDirection: 'row',
    backgroundColor: colors.neutral100,
    borderRadius: 999,
    padding: 3,
    gap: 2,
    flexShrink: 0,
  },
  segItem: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  segItemOn: {
    backgroundColor: '#fff',
    shadowColor: colors.neutral900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segItemText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11.5,
    color: colors.neutral600,
  },
  segItemTextOn: { color: colors.purple800 },

  // Sign out button
  signOutBtn: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.coral400,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: colors.coral600,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  signOutText: {
    fontFamily: 'Nunito_900Black',
    fontSize: 14,
    color: colors.coral600,
    letterSpacing: 0.2,
  },

  // Version
  versionText: {
    textAlign: 'center',
    fontFamily: 'Outfit_500Medium',
    fontSize: 11,
    color: colors.neutral400,
    marginTop: -8,
  },

  // Modal input
  modalInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: colors.neutral900,
    backgroundColor: colors.neutral50,
    marginBottom: 4,
  },

  // Sheet / Modal
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(33,8,79,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingBottom: 28,
    paddingTop: 12,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 20,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 99,
    backgroundColor: colors.neutral200,
    marginBottom: 14,
  },
  sheetIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.purple50,
    borderWidth: 2,
    borderColor: colors.purple100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  sheetTitle: {
    fontFamily: 'Nunito_900Black',
    fontSize: 20,
    color: colors.neutral900,
    marginBottom: 6,
  },
  sheetBody: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.neutral600,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 14,
  },
  sheetConfirmBtn: {
    width: '100%',
    backgroundColor: colors.purple600,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  sheetConfirmText: {
    fontFamily: 'Nunito_900Black',
    fontSize: 14,
    color: '#fff',
    letterSpacing: 0.2,
  },
  sheetCancelBtn: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  sheetCancelText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    color: colors.neutral800,
  },

  // Toast
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 32,
    backgroundColor: colors.teal400,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    shadowColor: colors.teal600,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: colors.neutral900,
  },
});
