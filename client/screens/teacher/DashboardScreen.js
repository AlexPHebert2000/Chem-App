import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  TextInput, StyleSheet, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { colors, typeScale, spacing, radius, screenPadding } from '../../theme';

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { user, token, logout } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [className, setClassName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      const data = await api.get('/courses', token);
      setCourses(data);
    } catch {
      Alert.alert('Error', 'Could not load your classes.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  async function handleCreate() {
    if (!className.trim()) return;
    setCreating(true);
    try {
      const course = await api.post('/courses', { name: className.trim() }, token);
      setCourses(prev => [...prev, course].sort((a, b) => a.name.localeCompare(b.name)));
      setClassName('');
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Could not create class. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  function copyCode(code) {
    if (Platform.OS === 'web') {
      navigator.clipboard?.writeText(code);
    }
    Alert.alert('Copied!', `Class code ${code} copied.`);
  }

  function renderCourse({ item }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('Class', { courseId: item.id, courseName: item.name })}
        activeOpacity={0.8}
      >
        <Text style={styles.courseName}>{item.name}</Text>
        <TouchableOpacity style={styles.codeRow} onPress={() => copyCode(item.code)} activeOpacity={0.7}>
          <Text style={styles.codeLabel}>Class code</Text>
          <View style={styles.codePill}>
            <Text style={styles.codeText}>{item.code}</Text>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name}</Text>
          <Text style={styles.subtitle}>Your classes</Text>
        </View>
        <TouchableOpacity onPress={logout} activeOpacity={0.7}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.purple400} style={{ marginTop: spacing[6] }} />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={item => item.id}
          renderItem={renderCourse}
          ListEmptyComponent={
            <Text style={styles.empty}>No classes yet. Create your first one!</Text>
          }
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      )}

      <View style={styles.fabShadow}>
        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
          <Text style={styles.fabText}>+ Create Class</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New Class</Text>
            <TextInput
              style={styles.input}
              placeholder="Class name"
              placeholderTextColor={colors.neutral400}
              value={className}
              onChangeText={setClassName}
              autoFocus
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalVisible(false); setClassName(''); }} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={styles.createShadow}>
                <TouchableOpacity
                  style={[styles.createBtn, (!className.trim() || creating) && styles.createBtnDisabled]}
                  onPress={handleCreate}
                  activeOpacity={0.85}
                  disabled={!className.trim() || creating}
                >
                  <Text style={styles.createText}>{creating ? 'Creating…' : 'Create'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral50,
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[5],
  },
  greeting: { ...typeScale.h1, color: colors.purple800 },
  subtitle: { ...typeScale.body, color: colors.neutral600, marginTop: spacing[1] },
  signOut: { ...typeScale.label, color: colors.purple400, marginTop: 6 },

  card: {
    backgroundColor: colors.purple50,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.purple100,
  },
  courseName: { ...typeScale.h3, color: colors.purple800, marginBottom: spacing[2] },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  codeLabel: { ...typeScale.label, color: colors.neutral600 },
  codePill: {
    backgroundColor: colors.gold100,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  codeText: { ...typeScale.label, color: colors.gold800, letterSpacing: 2 },

  empty: {
    ...typeScale.body,
    color: colors.neutral400,
    textAlign: 'center',
    marginTop: spacing[6],
  },

  fabShadow: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    backgroundColor: colors.purple800,
    borderRadius: radius.full,
    transform: [{ translateY: 4 }],
  },
  fab: {
    backgroundColor: colors.purple400,
    borderRadius: radius.full,
    paddingVertical: 14,
    paddingHorizontal: spacing[6],
    transform: [{ translateY: -4 }],
  },
  fabText: { ...typeScale.button, color: colors.neutral900 },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(18,11,53,0.5)',
    justifyContent: 'center',
    paddingHorizontal: screenPadding.horizontal,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing[5],
  },
  sheetTitle: { ...typeScale.h2, color: colors.purple800, marginBottom: spacing[4] },
  input: {
    ...typeScale.body,
    color: colors.purple900,
    borderWidth: 1.5,
    borderColor: colors.purple200,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: 12,
    marginBottom: spacing[4],
  },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[3], alignItems: 'center' },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: spacing[4] },
  cancelText: { ...typeScale.label, color: colors.neutral600 },
  createShadow: {
    backgroundColor: colors.purple800,
    borderRadius: radius.full,
    transform: [{ translateY: 3 }],
  },
  createBtn: {
    backgroundColor: colors.purple400,
    borderRadius: radius.full,
    paddingVertical: 12,
    paddingHorizontal: spacing[5],
    transform: [{ translateY: -3 }],
  },
  createBtnDisabled: { backgroundColor: colors.purple100 },
  createText: { ...typeScale.button, color: colors.neutral900 },
});
