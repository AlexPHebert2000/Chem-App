import React from 'react';
import {
  Modal, View, Text, Pressable, ScrollView, StyleSheet, Platform,
} from 'react-native';
import { colors, radius } from '../../theme';

const PRESETS = [
  {
    category: 'Element',
    items: [
      { label: 'Element Name',  hint: 'Z 1–18',  expr: '[el(1,18).name]' },
      { label: 'Element Symbol', hint: 'Z 1–118', expr: '[el(1,118).symbol]' },
      { label: 'Atomic Number',  hint: 'Z 1–118', expr: '[el(1,118).number]' },
      { label: 'Atomic Mass',    hint: 'Z 1–118', expr: '[el(1,118).mass]' },
    ],
  },
  {
    category: 'Number',
    items: [
      { label: 'Random Integer', hint: '1–100',  expr: '[num(1,100)]' },
      { label: 'Random Integer', hint: '1–10',   expr: '[num(1,10)]' },
    ],
  },
  {
    category: 'Compound',
    items: [
      { label: 'Acid Formula', hint: 'e.g. HCl',  expr: '[compound(acids).formula]' },
      { label: 'Base Formula', hint: 'e.g. NaOH', expr: '[compound(bases).formula]' },
      { label: 'Salt Formula', hint: 'e.g. NaCl', expr: '[compound(salts).formula]' },
    ],
  },
  {
    category: 'Constant',
    items: [
      { label: "Avogadro's Number", hint: '6.022 × 10²³', expr: '[NA]' },
    ],
  },
];

export default function SlotPickerSheet({ visible, onClose, onSelect }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Add Dynamic Element</Text>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {PRESETS.map(group => (
            <View key={group.category}>
              <Text style={styles.category}>{group.category.toUpperCase()}</Text>
              {group.items.map(item => (
                <Pressable
                  key={item.expr}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => { onSelect(item.expr); onClose(); }}
                >
                  <View style={styles.rowLabel}>
                    <Text style={styles.rowTitle}>{item.label}</Text>
                    <Text style={styles.rowHint}>{item.hint}</Text>
                  </View>
                  <View style={styles.exprPill}>
                    <Text style={styles.exprText}>{item.expr}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18,11,53,0.35)',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: '75%',
  },
  handle: {
    alignSelf: 'center',
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral200,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 18,
    color: colors.neutral900,
    marginBottom: 4,
  },
  scroll: { paddingBottom: 8 },
  category: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.purple600,
    marginTop: 16,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: colors.neutral50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    marginBottom: 8,
    gap: 10,
  },
  rowPressed: {
    backgroundColor: colors.purple50,
    borderColor: colors.purple200,
  },
  rowLabel: { flex: 1 },
  rowTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.neutral900,
  },
  rowHint: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.neutral600,
    marginTop: 2,
  },
  exprPill: {
    backgroundColor: colors.purple50,
    borderWidth: 1,
    borderColor: colors.purple200,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexShrink: 1,
  },
  exprText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: colors.purple600,
  },
});
