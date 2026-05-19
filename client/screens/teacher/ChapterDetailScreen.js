import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { ScreenSurface, SectionDivider, Card, Chip, ProgressBar } from '../../components/base';
import { colors, typeScale, screenPadding, radius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

function SectionStatRow({ section, questionStats }) {
  const stats = questionStats[section.id];
  return (
    <Card style={styles.sectionCard}>
      <Text style={styles.sectionName}>{section.name}</Text>
      {section.questionIds?.length > 0 && (
        <Text style={styles.sectionMeta}>
          {section.questionIds.length} questions · ~{section.questionIds.length * 2} min
        </Text>
      )}
      {stats ? (
        <View style={styles.statsRow}>
          <Text style={styles.statItem}>All-time: <Text style={styles.statVal}>{stats.allTimeSuccessRate ?? '—'}%</Text></Text>
          <Text style={styles.statItem}>Avg retries: <Text style={styles.statVal}>{stats.avgRetries ?? '—'}</Text></Text>
        </View>
      ) : null}
    </Card>
  );
}

export default function ChapterDetailScreen({ navigation, route }) {
  const { token } = useAuth();
  const { chapterId, courseId, chapterName } = route.params;

  const [chapter, setChapter] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const chapters = await api.get(`/courses/${courseId}/chapters`, token);
        const ch = (chapters ?? []).find(c => c.id === chapterId);
        if (ch) {
          setChapter(ch);
          setSections(ch.sections ?? []);
        }
      } catch (e) {
        console.warn('ChapterDetailScreen load error:', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [chapterId, courseId, token]);

  return (
    <ScreenSurface>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.neutral900} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.chapterName}>{chapterName ?? chapter?.name ?? 'Chapter'}</Text>
          <Text style={styles.sectionCount}>{sections.length} sections</Text>
        </View>
      </View>

      <FlatList
        data={sections}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={() => (
          <SectionDivider label="Sections" style={{ marginBottom: 8 }} />
        )}
        renderItem={({ item }) => (
          <SectionStatRow section={item} questionStats={{}} />
        )}
        ListEmptyComponent={!loading && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No sections in this chapter.</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
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
  chapterName: {
    ...typeScale.h3,
    color: colors.neutral900,
  },
  sectionCount: {
    ...typeScale.caption,
    color: colors.neutral600,
    marginTop: 2,
  },
  list: {
    padding: screenPadding.horizontal,
    paddingBottom: 40,
  },
  sectionCard: {
    gap: 4,
  },
  sectionName: {
    ...typeScale.h3,
    color: colors.neutral900,
  },
  sectionMeta: {
    ...typeScale.caption,
    color: colors.purple600,
    fontFamily: 'Nunito_700Bold',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  statItem: {
    ...typeScale.small,
    color: colors.neutral600,
  },
  statVal: {
    color: colors.neutral900,
    fontFamily: 'Nunito_700Bold',
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
