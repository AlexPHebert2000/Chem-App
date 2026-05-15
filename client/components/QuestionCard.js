import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import TagChip from './TagChip';
import { colors, typeScale, spacing, radius } from '../theme';

const DIFFICULTY_LABEL = ['', '★', '★★', '★★★', '★★★★', '★★★★★'];
const TYPE_LABEL = { MULTIPLE_CHOICE: 'Multiple Choice', FILL_IN_BLANK: 'Fill in Blank', DYNAMIC: 'Dynamic' };

export default function QuestionCard({ question, index, onPress, isAdded = false, isSelected = false, disabled = false }) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        isAdded && styles.cardAdded,
        isSelected && styles.cardSelected,
      ]}
      onPress={onPress}
      activeOpacity={isAdded ? 1 : 0.8}
      disabled={disabled || isAdded}
    >
      <View style={styles.cardTop}>
        <View style={[styles.typePill, isAdded && styles.typePillAdded]}>
          <Text style={[styles.typeText, isAdded && styles.typeTextAdded]}>
            {TYPE_LABEL[question.type]}
          </Text>
        </View>
        <View style={styles.cardTopRight}>
          <Text style={[styles.difficulty, isAdded && styles.difficultyAdded]}>
            {DIFFICULTY_LABEL[question.difficulty]}
          </Text>
          {isAdded && (
            <View style={styles.addedBadge}>
              <Text style={styles.addedBadgeText}>✓ Added</Text>
            </View>
          )}
          {isSelected && !isAdded && (
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeText}>✓</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={[styles.content, isAdded && styles.contentAdded]} numberOfLines={2}>
        {index + 1}. {question.content}
      </Text>
      {question.tags?.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagRow}
          contentContainerStyle={styles.tagRowContent}
        >
          {question.tags.map(tag => <TagChip key={tag.id} label={tag.name} color={tag.color} />)}
        </ScrollView>
      )}
      <Text style={[styles.choiceCount, isAdded && styles.choiceCountAdded]}>
        {question.choices.length} choices
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.purple50,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.purple100,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  cardAdded: { backgroundColor: colors.neutral100, borderColor: colors.neutral200, opacity: 0.6 },
  cardSelected: { borderColor: colors.purple400, backgroundColor: colors.purple100 },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },

  typePill: {
    backgroundColor: colors.purple100,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  typePillAdded: { backgroundColor: colors.neutral200 },
  typeText: { ...typeScale.caption, color: colors.purple800 },
  typeTextAdded: { color: colors.neutral600 },

  difficulty: { ...typeScale.caption, color: colors.gold600 },
  difficultyAdded: { color: colors.neutral400 },

  addedBadge: {
    backgroundColor: colors.neutral200,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  addedBadgeText: { ...typeScale.caption, color: colors.neutral600 },

  selectedBadge: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.purple400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadgeText: { ...typeScale.caption, color: colors.neutral900, fontWeight: '700' },

  content: { ...typeScale.body, color: colors.purple900, marginBottom: spacing[2] },
  contentAdded: { color: colors.neutral600 },
  tagRow: { marginBottom: spacing[2] },
  tagRowContent: { gap: spacing[2], paddingVertical: 2 },
  choiceCount: { ...typeScale.caption, color: colors.neutral600 },
  choiceCountAdded: { color: colors.neutral400 },
});
