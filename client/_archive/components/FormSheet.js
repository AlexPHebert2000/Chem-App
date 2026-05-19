import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typeScale, spacing, radius, screenPadding, chunkyShadowColors } from '../theme';

export default function FormSheet({
  visible,
  title,
  onClose,
  onSave,
  canSave,
  isSaving,
  saveLabel = 'Save',
  children,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          {children}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <View style={[styles.saveShadow, !canSave && styles.saveShadowDisabled]}>
              <TouchableOpacity
                style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
                onPress={onSave}
                activeOpacity={0.85}
                disabled={!canSave}
              >
                <Text style={styles.saveText}>{isSaving ? 'Saving…' : saveLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(18,11,53,0.5)',
    justifyContent: 'center',
    paddingHorizontal: screenPadding.horizontal,
  },
  sheet: { backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing[5] },
  title: { ...typeScale.h2, color: colors.purple800, marginBottom: spacing[4] },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[3],
    alignItems: 'center',
    marginTop: spacing[1],
  },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: spacing[4] },
  cancelText: { ...typeScale.label, color: colors.neutral600 },
  saveShadow: {
    backgroundColor: chunkyShadowColors.purple,
    borderRadius: radius.full,
    transform: [{ translateY: 3 }],
  },
  saveShadowDisabled: { backgroundColor: colors.purple200 },
  saveBtn: {
    backgroundColor: colors.purple400,
    borderRadius: radius.full,
    paddingVertical: 12,
    paddingHorizontal: spacing[5],
    transform: [{ translateY: -3 }],
  },
  saveBtnDisabled: { backgroundColor: colors.purple100 },
  saveText: { ...typeScale.button, color: colors.neutral900 },
});
