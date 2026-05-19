import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, Pressable, ActivityIndicator
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { ScreenSurface, SectionDivider } from '../../components/base';
import ClassCard from '../../components/ClassCard';
import BottomSheet from '../../components/BottomSheet';
import ShadowButton from '../../components/base/ShadowButton';
import { colors, typeScale, screenPadding, radius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

export default function TeacherHomeScreen({ navigation }) {
  const { user, token } = useAuth();
  const [courses, setCourses] = useState([]);
  const [classMap, setClassMap] = useState({}); // courseId → classes[]
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const coursesData = await api.get('/courses', token);
      setCourses(coursesData ?? []);
      // Load classes for each course
      const entries = await Promise.all(
        (coursesData ?? []).map(async c => {
          try {
            const cls = await api.get(`/courses/${c.id}/classes`, token);
            return [c.id, cls ?? []];
          } catch {
            return [c.id, []];
          }
        })
      );
      setClassMap(Object.fromEntries(entries));
    } catch (e) {
      console.warn('TeacherHomeScreen load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  // Flatten all classes across courses for display
  const allClasses = courses.flatMap(c =>
    (classMap[c.id] ?? []).map(cls => ({ ...cls, courseName: c.name }))
  );

  const renderItem = ({ item }) => (
    <ClassCard
      courseClass={item}
      courseName={item.courseName}
      onPress={() => navigation.navigate('ClassDetail', { classId: item.id, courseName: item.courseName })}
    />
  );

  return (
    <ScreenSurface>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] ?? 'Professor'}</Text>
          <Text style={styles.sub}>Your classes</Text>
        </View>
        <Pressable
          style={styles.bankBtn}
          onPress={() => navigation.navigate('QuestionBank')}
        >
          <Ionicons name="library-outline" size={18} color={colors.purple600} />
          <Text style={styles.bankBtnText}>Question bank</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.purple400} size="large" />
        </View>
      ) : (
        <FlatList
          data={allClasses}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No classes yet. Create a course to get started.</Text>
            </View>
          }
        />
      )}
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
  greeting: {
    ...typeScale.h2,
    color: colors.neutral900,
  },
  sub: {
    ...typeScale.caption,
    color: colors.neutral600,
    marginTop: 2,
  },
  bankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.purple50,
    borderRadius: radius.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.purple200,
  },
  bankBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: colors.purple600,
  },
  list: {
    padding: screenPadding.horizontal,
    paddingBottom: 40,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    paddingTop: 48,
    alignItems: 'center',
  },
  emptyText: {
    ...typeScale.body,
    color: colors.neutral600,
    textAlign: 'center',
  },
});
