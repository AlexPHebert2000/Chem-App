import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import TagChip from './TagChip';
import { colors, typeScale, spacing, radius } from '../theme';

export default function TagFilterHeader({
  tagInput,
  onTagInput,
  suggestions,
  filterTags,
  onAddTag,
  onRemoveTag,
  noMatchMessage,
  loading,
}) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Filter by tag…"
        placeholderTextColor={colors.neutral400}
        value={tagInput}
        onChangeText={onTagInput}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {suggestions.map(tag => (
        <TouchableOpacity
          key={tag.id}
          style={styles.suggestion}
          onPress={() => onAddTag(tag)}
          activeOpacity={0.7}
        >
          <TagChip label={tag.name} color={tag.color} />
        </TouchableOpacity>
      ))}
      {filterTags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
          contentContainerStyle={styles.chipRowContent}
        >
          {filterTags.map(tag => (
            <TagChip
              key={tag.id}
              label={tag.name}
              color={tag.color}
              onRemove={() => onRemoveTag(tag.id)}
            />
          ))}
        </ScrollView>
      )}
      {noMatchMessage && !loading && filterTags.length > 0 && (
        <Text style={styles.noMatch}>{noMatchMessage}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing[3] },
  searchInput: {
    ...typeScale.body,
    color: colors.purple900,
    borderWidth: 1.5,
    borderColor: colors.purple200,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: 10,
    marginBottom: 4,
  },
  suggestion: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.purple50,
  },
  chipRow: { marginTop: spacing[2] },
  chipRowContent: { gap: spacing[2], paddingVertical: 2 },
  noMatch: { ...typeScale.small, color: colors.neutral400, marginTop: spacing[3], textAlign: 'center' },
});
