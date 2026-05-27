import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, Pressable, TextInput, StyleSheet,
} from 'react-native';
import { colors, radius } from '../../theme';

// ─── Bracket expression parser / builder ─────────────────────────────────────

function parseExpr(expr) {
  const inner = expr.replace(/^\[|\]$/g, '');
  const el = inner.match(/^el\((\d+),(\d+)\)\.(\w+)$/);
  if (el) return { type: 'el', minZ: el[1], maxZ: el[2], prop: el[3] };
  const num = inner.match(/^num\((-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\)$/);
  if (num) return { type: 'num', min: num[1], max: num[2] };
  const comp = inner.match(/^compound\((\w+)\)\.(\w+)$/);
  if (comp) return { type: 'compound', cat: comp[1], prop: comp[2] };
  if (inner === 'NA') return { type: 'const' };
  return { type: 'unknown', raw: inner };
}

function buildExpr(config) {
  if (config.type === 'el') return `[el(${config.minZ},${config.maxZ}).${config.prop}]`;
  if (config.type === 'num') return `[num(${config.min},${config.max})]`;
  if (config.type === 'compound') return `[compound(${config.cat}).${config.prop}]`;
  if (config.type === 'const') return '[NA]';
  return `[${config.raw}]`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const EL_PROPS = [
  { value: 'name',   label: 'Name' },
  { value: 'symbol', label: 'Symbol' },
  { value: 'number', label: 'Atomic #' },
  { value: 'mass',   label: 'Mass' },
];
const COMP_CATS  = ['acids', 'bases', 'salts', 'oxides'];
const COMP_PROPS = ['formula', 'name'];

function OptionRow({ options, value, onSelect, getLabel }) {
  return (
    <View style={s.optRow}>
      {options.map(opt => {
        const v = typeof opt === 'string' ? opt : opt.value;
        const label = getLabel ? getLabel(opt) : (typeof opt === 'string' ? opt : opt.label);
        const active = value === v;
        return (
          <Pressable key={v} onPress={() => onSelect(v)}
            style={[s.optBtn, active && s.optBtnActive]}>
            <Text style={[s.optText, active && s.optTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SectionLabel({ text }) {
  return <Text style={s.label}>{text}</Text>;
}

function RangeRow({ minLabel, maxLabel, minValue, maxValue, onMinChange, onMaxChange }) {
  return (
    <View style={s.rangeRow}>
      <View style={s.rangeField}>
        <Text style={s.rangeHint}>{minLabel}</Text>
        <TextInput
          style={s.rangeInput}
          value={minValue}
          onChangeText={onMinChange}
          keyboardType="numeric"
          selectTextOnFocus
        />
      </View>
      <Text style={s.dash}>–</Text>
      <View style={s.rangeField}>
        <Text style={s.rangeHint}>{maxLabel}</Text>
        <TextInput
          style={s.rangeInput}
          value={maxValue}
          onChangeText={onMaxChange}
          keyboardType="numeric"
          selectTextOnFocus
        />
      </View>
    </View>
  );
}

// ─── Main overlay ─────────────────────────────────────────────────────────────

export default function SlotConfigOverlay({ visible, expr, onClose, onConfirm }) {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (visible && expr) setConfig(parseExpr(expr));
  }, [visible, expr]);

  if (!config) return null;

  const update = patch => setConfig(prev => ({ ...prev, ...patch }));

  const handleConfirm = () => {
    onConfirm(buildExpr(config));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.card}>
        <Text style={s.title}>Configure Slot</Text>

        {config.type === 'el' && (
          <>
            <SectionLabel text="PROPERTY" />
            <OptionRow
              options={EL_PROPS}
              value={config.prop}
              onSelect={v => update({ prop: v })}
            />
            <SectionLabel text="ATOMIC NUMBER RANGE" />
            <RangeRow
              minLabel="Min Z" maxLabel="Max Z"
              minValue={config.minZ} maxValue={config.maxZ}
              onMinChange={v => update({ minZ: v })}
              onMaxChange={v => update({ maxZ: v })}
            />
          </>
        )}

        {config.type === 'num' && (
          <>
            <SectionLabel text="NUMBER RANGE" />
            <RangeRow
              minLabel="Min" maxLabel="Max"
              minValue={config.min} maxValue={config.max}
              onMinChange={v => update({ min: v })}
              onMaxChange={v => update({ max: v })}
            />
          </>
        )}

        {config.type === 'compound' && (
          <>
            <SectionLabel text="CATEGORY" />
            <OptionRow
              options={COMP_CATS}
              value={config.cat}
              onSelect={v => update({ cat: v })}
              getLabel={v => v.charAt(0).toUpperCase() + v.slice(1)}
            />
            <SectionLabel text="PROPERTY" />
            <OptionRow
              options={COMP_PROPS}
              value={config.prop}
              onSelect={v => update({ prop: v })}
              getLabel={v => v.charAt(0).toUpperCase() + v.slice(1)}
            />
          </>
        )}

        {config.type === 'const' && (
          <View style={s.constBox}>
            <Text style={s.constText}>Avogadro's Number</Text>
            <Text style={s.constSub}>6.022 × 10²³ · No configurable parameters.</Text>
          </View>
        )}

        {config.type === 'unknown' && (
          <View style={s.constBox}>
            <Text style={s.constText}>Custom expression</Text>
            <Text style={s.constSub}>{expr}</Text>
            <Text style={s.constSub}>This slot type can only be edited in the text field.</Text>
          </View>
        )}

        <View style={s.actions}>
          <Pressable onPress={onClose} style={s.cancelBtn}>
            <Text style={s.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={handleConfirm} style={s.confirmBtn}>
            <Text style={s.confirmText}>Apply</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18,11,53,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    position: 'absolute',
    left: 20, right: 20,
    top: '50%',
    marginTop: -160,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 18,
    color: colors.neutral900,
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.purple600,
    marginTop: 12,
    marginBottom: 6,
  },
  optRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  optBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    backgroundColor: '#FFF',
  },
  optBtnActive: {
    backgroundColor: colors.purple600,
    borderColor: colors.purple800,
  },
  optText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: colors.neutral800,
  },
  optTextActive: { color: '#FFF' },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rangeField: { flex: 1 },
  rangeHint: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.neutral600,
    marginBottom: 4,
  },
  rangeInput: {
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    borderRadius: radius.md,
    paddingVertical: 9,
    paddingHorizontal: 12,
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: colors.neutral900,
    backgroundColor: '#FFF',
    textAlign: 'center',
  },
  dash: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: colors.neutral400,
    marginTop: 18,
  },
  constBox: {
    backgroundColor: colors.purple50,
    borderWidth: 1.5,
    borderColor: colors.purple100,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 4,
  },
  constText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.purple800,
  },
  constSub: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.purple600,
    marginTop: 4,
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.neutral800,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.purple600,
    alignItems: 'center',
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  confirmText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    color: '#FFF',
  },
});
