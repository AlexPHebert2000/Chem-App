import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, Pressable
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { ScreenSurface, SectionDivider } from '../../components/base';
import StudentRow from '../../components/StudentRow';
import { colors, typeScale, screenPadding, radius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

export default function ClassDetailScreen({ navigation, route }) {
  const { user, token } = useAuth();
  const { classId, courseName, courseId } = route.params;

  const [leaderboard, setLeaderboard] = useState([]);
  const [courseClass, setCourseClass] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      // Get course info to find courseId if needed
      let cid = courseId;
      if (!cid) {
        const courses = await api.get('/courses', token);
        for (const c of courses ?? []) {
          const classes = await api.get(`/courses/${c.id}/classes`, token).catch(() => []);
          if ((classes ?? []).find(cl => cl.id === classId)) {
            cid = c.id;
            setCourseClass(classes.find(cl => cl.id === classId));
            break;
          }
        }
      }
      if (cid) {
        const lb = await api.get(`/courses/${cid}/classes/${classId}/leaderboard`, token);
        setLeaderboard(lb ?? []);
      }
    } catch (e) {
      console.warn('ClassDetailScreen load error:', e.message);
    } finally {
      setRefreshing(false);
    }
  }, [token, classId, courseId]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const exportCsv = async () => {
    // CSV export — backend endpoint
    try {
      const cid = courseId;
      if (cid) await api.get(`/courses/${cid}/export?classId=${classId}`, token);
    } catch (e) {
      console.warn('Export error:', e.message);
    }
  };

  return (
    <ScreenSurface>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.neutral900} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.courseName}>{courseName ?? 'Class'}</Text>
          {courseClass && (
            <Text style={styles.sectionNum}>Section {courseClass.sectionNumber}</Text>
          )}
        </View>
        <Pressable onPress={exportCsv} style={styles.exportBtn}>
          <Ionicons name="download-outline" size={16} color={colors.neutral600} />
          <Text style={styles.exportText}>Export CSV</Text>
        </Pressable>
      </View>

      <FlatList
        data={leaderboard}
        keyExtractor={item => item.studentId}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={() => (
          <SectionDivider label="Leaderboard" style={{ marginBottom: 8 }} />
        )}
        renderItem={({ item }) => (
          <StudentRow
            rank={item.rank}
            student={{ name: item.name }}
            currentPoints={item.currentPoints}
            lifetimePoints={item.lifetimePoints}
            streak={item.streak}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No students enrolled yet.</Text>
          </View>
        }
      />
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  headerInfo: {
    flex: 1,
  },
  courseName: {
    ...typeScale.h3,
    color: colors.neutral900,
  },
  sectionNum: {
    ...typeScale.caption,
    color: colors.neutral600,
    marginTop: 1,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
  },
  exportText: {
    ...typeScale.caption,
    color: colors.neutral600,
  },
  list: {
    padding: screenPadding.horizontal,
    paddingBottom: 40,
  },
  empty: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    ...typeScale.body,
    color: colors.neutral600,
  },
});
