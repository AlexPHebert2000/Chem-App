import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Modal, Animated,
  StatusBar, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Ellipse } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { colors } from '../../theme';

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
function Row({ emoji, iconBg, label, sublabel, right, onPress, last }) {
  const content = (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Text style={styles.rowIconEmoji}>{emoji}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel} numberOfLines={1}>{sublabel}</Text> : null}
      </View>
      <View style={styles.rowRight}>
        {right}
        {onPress ? <Text style={styles.rowChevron}>›</Text> : null}
      </View>
    </View>
  );
  if (onPress) return <Pressable onPress={onPress}>{content}</Pressable>;
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
  const { token, logout } = useAuth();

  // account state (loaded from API)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [className, setClassName] = useState('');

  // learning
  const [weeklyGoal, setWeeklyGoal] = useState(60);
  const [originalGoal, setOriginalGoal] = useState(60);

  // local-only prefs
  const [pushOn, setPushOn] = useState(true);
  const [remindersOn, setRemindersOn] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [hapticsOn, setHapticsOn] = useState(true);
  const [theme, setTheme] = useState('light');
  const [textSize, setTextSize] = useState('regular');

  // UI state
  const [showLogout, setShowLogout] = useState(false);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const toastTimer = useRef(null);

  const showToast = useCallback((text) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1600);
  }, []);

  const load = useCallback(async () => {
    try {
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
    } catch (e) {
      console.warn('SettingsScreen load error:', e.message);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const saveGoal = useCallback(async (val) => {
    if (val === originalGoal) return;
    setSaving(true);
    try {
      await api.patch('/students/me/goal', { weeklyMinuteGoal: val }, token);
      setOriginalGoal(val);
      showToast('Weekly goal saved');
    } catch (e) {
      showToast('Could not save goal');
    } finally {
      setSaving(false);
    }
  }, [originalGoal, token, showToast]);

  const handleGoalChange = (val) => {
    setWeeklyGoal(val);
  };

  const handleGoalBlur = () => {
    saveGoal(weeklyGoal);
  };

  const inits = name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.purple800}/>
      <View style={styles.statusBarFill}/>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        onScrollEndDrag={() => saveGoal(weeklyGoal)}
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
            <View style={styles.editBadge}>
              <Text style={{ fontSize: 10, color: '#fff' }}>✎</Text>
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
              onPress={() => showToast('Coming soon')}/>
            <Row emoji="✉️" iconBg={colors.purple50} label="Email" sublabel={email}
              onPress={() => showToast('Coming soon')}/>
            <Row emoji="🔑" iconBg={colors.purple50} label="Change password"
              onPress={() => showToast('Coming soon')} last/>
          </SettingsCard>

          {/* NOTIFICATIONS */}
          <SettingsCard title="Notifications" accent={colors.gold600}>
            <Row emoji="🔔" iconBg={colors.gold50} label="Push notifications"
              sublabel="Streak alerts, badge unlocks, weekly recap"
              right={<Toggle value={pushOn} onChange={setPushOn}/>}/>
            <Row emoji="🕐" iconBg={colors.gold50} label="Study reminder"
              sublabel={remindersOn ? 'Daily at 7:00 PM' : 'Off'}
              right={<Toggle value={remindersOn} onChange={setRemindersOn}/>} last/>
          </SettingsCard>

          {/* LEARNING */}
          <SettingsCard title="Learning" accent={colors.teal600}>
            {/* Weekly goal stepper row */}
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
                onChange={(val) => { handleGoalChange(val); saveGoal(val); }}
              />
            </View>
            <Row emoji="⚡" iconBg={colors.teal50} label="Sound effects"
              sublabel="XP chimes, correct answer sounds"
              right={<Toggle value={soundOn} onChange={setSoundOn}/>}/>
            <Row emoji="🔥" iconBg={colors.teal50} label="Haptic feedback"
              sublabel="Vibrations on taps and streaks"
              right={<Toggle value={hapticsOn} onChange={setHapticsOn}/>} last/>
          </SettingsCard>

          {/* APPEARANCE */}
          <SettingsCard title="Appearance" accent={colors.coral600}>
            <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.neutral100 }]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.coral50 }]}>
                <Text style={styles.rowIconEmoji}>☀️</Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>Theme</Text>
              </View>
              <SegControl
                value={theme}
                onChange={setTheme}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark',  label: 'Dark' },
                  { value: 'auto',  label: 'Auto' },
                ]}
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: colors.coral50 }]}>
                <Text style={[styles.rowIconEmoji, { fontSize: 14, fontFamily: 'Nunito_900Black' }]}>Aa</Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>Text size</Text>
              </View>
              <SegControl
                value={textSize}
                onChange={setTextSize}
                options={[
                  { value: 'small',   label: 'S' },
                  { value: 'regular', label: 'M' },
                  { value: 'large',   label: 'L' },
                ]}
              />
            </View>
          </SettingsCard>

          {/* SIGN OUT */}
          <Pressable style={styles.signOutBtn} onPress={() => setShowLogout(true)}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>

          <Text style={styles.versionText}>Chem App · v1.0.0</Text>
        </View>
      </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutral50 },
  statusBarFill: { height: 50, backgroundColor: colors.purple800 },
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
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.purple600,
    borderWidth: 2.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 2,
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
  },
  rowLast: {
    borderBottomWidth: 0,
  },
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
  rowLabel: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13.5,
    color: colors.neutral900,
  },
  rowSublabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11.5,
    color: colors.neutral600,
    marginTop: 1,
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
  segItemTextOn: {
    color: colors.purple800,
  },

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
    backgroundColor: colors.coral50,
    borderWidth: 2,
    borderColor: colors.coral400,
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
    marginBottom: 18,
  },
  sheetConfirmBtn: {
    width: '100%',
    backgroundColor: colors.coral400,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: colors.coral600,
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
