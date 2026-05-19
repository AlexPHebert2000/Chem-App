import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable, TextInput, RefreshControl
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { ScreenSurface, Chip } from '../../components/base';
import QuestionBankItem from '../../components/QuestionBankItem';
import { colors, typeScale, screenPadding, radius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

const TYPE_FILTERS = ['ALL', 'MULTIPLE_CHOICE', 'FILL_IN_BLANK', 'DYNAMIC'];

export default function QuestionBankScreen({ navigation, route }) {
  const { token } = useAuth();
  const courseId = route?.params?.courseId;

  const [questions, setQuestions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(courseId ?? null);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const coursesData = await api.get('/courses', token);
      setCourses(coursesData ?? []);
      const cid = selectedCourse ?? coursesData?.[0]?.id;
      if (cid) {
        setSelectedCourse(cid);
        const qs = await api.get(`/courses/${cid}/questions`, token);
        setQuestions(qs ?? []);
      }
    } catch (e) {
      console.warn('QuestionBankScreen load error:', e.message);
    } finally {
      setRefreshing(false);
    }
  }, [token, selectedCourse]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const filtered = questions.filter(q => {
    if (typeFilter !== 'ALL' && q.type !== typeFilter) return false;
    if (search && !q.text?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <ScreenSurface>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.neutral900} />
        </Pressable>
        <Text style={styles.title}>Question Bank</Text>
        <Pressable
          style={styles.addBtn}
          onPress={() => navigation.navigate('QuestionEditor', { courseId: selectedCourse })}
        >
          <Ionicons name="add" size={20} color={colors.purple600} />
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.neutral600} style={{ marginLeft: 12 }} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search questions…"
          placeholderTextColor={colors.neutral400}
        />
      </View>

      {/* Type filter chips */}
      <View style={styles.filterRow}>
        {TYPE_FILTERS.map(t => (
          <Chip
            key={t}
            label={t === 'ALL' ? 'All' : t.replace('_', ' ').toLowerCase()}
            color={typeFilter === t ? 'purple' : 'neutral'}
            variant={typeFilter === t ? 'filled' : 'outline'}
            onPress={() => setTypeFilter(t)}
            style={{ marginRight: 6 }}
          />
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <QuestionBankItem
            question={item}
            onPress={q => navigation.navigate('QuestionEditor', { questionId: q.id, courseId: selectedCourse })}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No questions found.</Text>
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
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral200,
    gap: 10,
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
    ...typeScale.h2,
    color: colors.neutral900,
    flex: 1,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.purple50,
    borderWidth: 1.5,
    borderColor: colors.purple200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral100,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: colors.neutral900,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral100,
    flexWrap: 'wrap',
  },
  list: {
    paddingBottom: 40,
  },
  empty: {
    paddingTop: 48,
    alignItems: 'center',
  },
  emptyText: {
    ...typeScale.body,
    color: colors.neutral600,
  },
});
