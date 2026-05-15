import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import FormSheet from '../../components/FormSheet';
import FormInput from '../../components/FormInput';
import EmptyState from '../../components/EmptyState';
import ShadowButton from '../../components/ShadowButton';
import TeacherCourseCard from '../../components/TeacherCourseCard';
import { colors, typeScale, spacing, radius, screenPadding } from '../../theme';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { user, token, logout } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [className, setClassName] = useState('');
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  async function handleExportCsv() {
    if (Platform.OS !== 'web') {
      Alert.alert('Not available', 'CSV export is only available on the web app.');
      return;
    }
    setExporting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/courses/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Alert.alert('Error', 'Could not download the report. Is the server running?');
    } finally {
      setExporting(false);
    }
  }

  function copyCode(code) {
    if (Platform.OS === 'web') { navigator.clipboard?.writeText(code); }
    Alert.alert('Copied!', `Class code ${code} copied.`);
  }

  function closeModal() { setModalVisible(false); setClassName(''); }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleExportCsv} disabled={exporting} activeOpacity={0.7}>
            <Text style={styles.exportBtn}>{exporting ? 'Exporting…' : 'Export CSV'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} activeOpacity={0.7}>
            <Text style={styles.signOut}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.bankCard}
        onPress={() => navigation.navigate('QuestionBank')}
        activeOpacity={0.8}
      >
        <Text style={styles.bankIcon}>📚</Text>
        <View style={styles.bankCardBody}>
          <Text style={styles.bankCardTitle}>Question Bank</Text>
          <Text style={styles.bankCardSubtitle}>Create and manage reusable questions</Text>
        </View>
        <Text style={styles.bankChevron}>›</Text>
      </TouchableOpacity>

      <Text style={styles.subtitle}>Your classes</Text>
      {loading ? (
        <ActivityIndicator color={colors.purple400} style={{ marginTop: spacing[6] }} />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TeacherCourseCard
              course={item}
              onPress={() => navigation.navigate('Class', { courseId: item.id, courseName: item.name })}
              onCopyCode={() => copyCode(item.code)}
            />
          )}
          ListEmptyComponent={<EmptyState title="No classes yet. Create your first one!" />}
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      )}

      <ShadowButton
        label="+ Create Class"
        onPress={() => setModalVisible(true)}
        style={styles.fab}
        paddingHorizontal={spacing[6]}
      />

      <FormSheet
        visible={modalVisible}
        title="New Class"
        onClose={closeModal}
        onSave={handleCreate}
        canSave={!!(className.trim() && !creating)}
        isSaving={creating}
        saveLabel="Create"
      >
        <FormInput
          placeholder="Class name"
          value={className}
          onChangeText={setClassName}
          autoFocus
        />
      </FormSheet>
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
  headerActions: { alignItems: 'flex-end', gap: spacing[2] },
  exportBtn: { ...typeScale.label, color: colors.teal600 },
  signOut: { ...typeScale.label, color: colors.purple400 },

  bankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.purple400,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  bankIcon: { fontSize: 24 },
  bankCardBody: { flex: 1 },
  bankCardTitle: { ...typeScale.h3, color: colors.neutral100 },
  bankCardSubtitle: { ...typeScale.caption, color: colors.neutral100, opacity: 0.75, marginTop: 2 },
  bankChevron: { ...typeScale.h2, color: colors.neutral100, opacity: 0.6 },

  fab: { position: 'absolute', bottom: 36, alignSelf: 'center' },
});
