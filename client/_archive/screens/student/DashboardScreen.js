import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import StudentCourseCard from '../../components/StudentCourseCard';
import { colors, typeScale, spacing, radius, screenPadding } from '../../theme';

export default function DashboardScreen() {
  const { user, token, logout } = useAuth();
  const navigation = useNavigation();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    setError(null);
    api.get('/courses', token)
      .then(setCourses)
      .catch(e => setError(e.message || 'Could not load courses'))
      .finally(() => setLoading(false));
  }, [token]));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name} 👋</Text>
          <Text style={styles.subGreeting}>Ready to study?</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.purple400} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : courses.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No courses yet</Text>
          <Text style={styles.emptyBody}>Ask your teacher for a course code to join.</Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={c => c.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <StudentCourseCard
              course={item}
              onPress={() => navigation.navigate('StudentCourse', { courseId: item.id, courseName: item.name })}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral50 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: screenPadding.horizontal, paddingTop: 60, paddingBottom: spacing[5],
    backgroundColor: '#fff', borderBottomWidth: 1, borderColor: colors.purple100,
  },
  greeting:    { ...typeScale.h2, color: colors.purple900 },
  subGreeting: { ...typeScale.body, color: colors.neutral600, marginTop: 2 },
  logoutBtn: {
    borderWidth: 1.5, borderColor: colors.purple200, borderRadius: radius.full,
    paddingHorizontal: spacing[4], paddingVertical: 8, marginTop: 4,
  },
  logoutText: { ...typeScale.label, color: colors.purple600 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: screenPadding.horizontal },
  errorText:  { ...typeScale.body, color: colors.coral600, textAlign: 'center' },
  emptyTitle: { ...typeScale.h3, color: colors.purple800, marginBottom: spacing[2] },
  emptyBody:  { ...typeScale.body, color: colors.neutral600, textAlign: 'center' },

  list: { paddingHorizontal: screenPadding.horizontal, paddingTop: spacing[4], paddingBottom: 32 },
});
