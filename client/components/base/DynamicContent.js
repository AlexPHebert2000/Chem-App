import React from 'react';
import { Text } from 'react-native';
import { colors } from '../../theme';

// Parses [bracket] slot tokens from a question content string.
// Returns an array of { type: 'text'|'slot', value?, expr?, label? } segments.
export function parseDynamic(str) {
  if (!str) return [];
  const re = /\[([^\]]+)\]/g;
  const segments = [];
  let last = 0;
  let match;
  while ((match = re.exec(str)) !== null) {
    if (match.index > last) {
      segments.push({ type: 'text', value: str.slice(last, match.index) });
    }
    segments.push({ type: 'slot', expr: match[0], inner: match[1], label: labelForInner(match[1]) });
    last = match.index + match[0].length;
  }
  if (last < str.length) {
    segments.push({ type: 'text', value: str.slice(last) });
  }
  return segments;
}

export function labelForInner(inner) {
  const el = inner.match(/^el\((\d+),(\d+)\)\.(\w+)$/);
  if (el) {
    const propMap = { name: 'Name', symbol: 'Symbol', number: 'Atomic #', mass: 'Mass' };
    return `El ${propMap[el[3]] ?? el[3]} (${el[1]}–${el[2]})`;
  }
  const num = inner.match(/^num\((-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\)$/);
  if (num) return `${num[1]}–${num[2]}`;
  const comp = inner.match(/^compound\((\w+)\)\.\w+$/);
  if (comp) {
    const cat = comp[1];
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  }
  if (inner === 'NA') return "Avog. #";
  if (inner.startsWith('gt(')) return '↑ Greater';
  if (inner.startsWith('lt(')) return '↓ Lesser';
  const ref = inner.match(/^(\d+)\.(\w+)/);
  if (ref) return `Slot ${ref[1]}`;
  return inner.length > 14 ? inner.slice(0, 12) + '…' : inner;
}

// Read-only inline renderer. Drop-in replacement for <Text> in list views.
// Renders slot tokens as inline bold purple spans within a <Text> component,
// preserving numberOfLines behaviour.
export default function DynamicContent({ content, numberOfLines, style }) {
  const segments = parseDynamic(content ?? '');
  const hasSlots = segments.some(s => s.type === 'slot');

  if (!hasSlots) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {content}
      </Text>
    );
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {segments.map((seg, i) =>
        seg.type === 'text'
          ? seg.value
          : <Text key={i} style={slotSpan}> {seg.label} </Text>
      )}
    </Text>
  );
}

const slotSpan = {
  fontFamily: 'Nunito_700Bold',
  fontSize: 12,
  color: colors.purple600,
};
