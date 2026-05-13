const crypto = require('crypto');
const periodicTable = require('./periodicTable');
const compounds = require('./compounds');

const BRACKET_RE = /\[([^\]]+)\]/g;

const EL_PROPS = ['name', 'symbol', 'number', 'mass'];
const COMPOUND_PROPS = ['name', 'formula', 'molarMass'];
const KNOWN_TYPES = ['el', 'num', 'compound', 'ref', 'expr', 'const'];

const CONSTANTS = {
  NA: { value: 6.02214076e23, displayValue: '6.022 × 10²³' },
};

// Number of decimal places encoded in a bound string ("1.00" → 2, "5" → 0).
function decimalPrecision(s) {
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}

// Random decimal in [min, max] formatted to `precision` decimal places.
function randNum(min, max, precision) {
  const scale = Math.pow(10, precision);
  const lo = Math.round(min * scale);
  const hi = Math.round(max * scale);
  const val = (Math.floor(Math.random() * (hi - lo + 1)) + lo) / scale;
  return val.toFixed(precision);
}

// Regex for a num(min,max) token where min/max may be negative decimals.
// Allows optional whitespace around the comma and inside the parens.
const NUM_RANGE_RE = /num\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g;

// ─── Parse ────────────────────────────────────────────────────────────────────

function parseBrackets(content) {
  const results = [];
  let match;
  let position = 0;
  BRACKET_RE.lastIndex = 0;
  while ((match = BRACKET_RE.exec(content)) !== null) {
    position++;
    const raw = match[0];
    const inner = match[1].trim();
    const descriptor = { position, raw };

    if (CONSTANTS[inner]) {
      Object.assign(descriptor, { type: 'const', constantName: inner, value: CONSTANTS[inner].value });
    } else if (inner.startsWith('el(')) {
      // el(min,max).property
      const m = inner.match(/^el\((\d+),(\d+)\)\.(\w+)$/);
      if (!m) { descriptor.type = 'el'; descriptor.parseError = `Invalid el syntax: ${raw}`; }
      else {
        Object.assign(descriptor, {
          type: 'el',
          min: parseInt(m[1], 10),
          max: parseInt(m[2], 10),
          property: m[3],
        });
      }
    } else if (inner.startsWith('num(')) {
      // num(min,max) — bounds may be negative or decimal e.g. num(-5,5) num(1.00,5.00)
      const m = inner.match(/^num\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)$/);
      if (m) {
        const precision = Math.max(decimalPrecision(m[1]), decimalPrecision(m[2]));
        Object.assign(descriptor, {
          type: 'num',
          min: parseFloat(m[1]),
          max: parseFloat(m[2]),
          precision,
          property: null,
        });
      } else if (/[+\-*/^]/.test(inner)) {
        // Complex expression starting with num(...), e.g. "num(1,5) + num(1,5)"
        const numRanges = [];
        NUM_RANGE_RE.lastIndex = 0;
        let nm2;
        while ((nm2 = NUM_RANGE_RE.exec(inner)) !== null) {
          const prec = Math.max(decimalPrecision(nm2[1]), decimalPrecision(nm2[2]));
          numRanges.push({ token: nm2[0], min: parseFloat(nm2[1]), max: parseFloat(nm2[2]), precision: prec });
        }
        const slotRefs2 = [];
        const srRe2 = /(\d+)\.([a-zA-Z]+)/g;
        let sr2;
        while ((sr2 = srRe2.exec(inner)) !== null) {
          slotRefs2.push({ token: sr2[0], refPosition: parseInt(sr2[1], 10), property: sr2[2] });
        }
        Object.assign(descriptor, { type: 'expr', expression: inner, numRanges, slotRefs: slotRefs2 });
      } else {
        descriptor.type = 'num';
        descriptor.parseError = `Invalid num syntax: ${raw}`;
      }
    } else if (inner.startsWith('compound(')) {
      // compound(category).property
      const m = inner.match(/^compound\((\w+)\)\.(\w+)$/);
      if (!m) { descriptor.type = 'compound'; descriptor.parseError = `Invalid compound syntax: ${raw}`; }
      else {
        Object.assign(descriptor, {
          type: 'compound',
          category: m[1],
          property: m[2],
        });
      }
    } else if (/^\d+\.\w+$/.test(inner)) {
      // Cross-bracket ref: [1.symbol] → display a property of an earlier resolved slot
      const m = inner.match(/^(\d+)\.(\w+)$/);
      Object.assign(descriptor, {
        type: 'ref',
        refPosition: parseInt(m[1], 10),
        property: m[2],
      });
    } else if ((/num\(-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?\)/.test(inner) && /[+\-*/^]/.test(inner)) ||
               (/\d+\.\w+/.test(inner) && /[+\-*/^]/.test(inner))) {
      // In-bracket arithmetic expression: [1.number + num(-2,2)]
      // Resolves to a computed numeric display value.
      const numRanges = [];
      NUM_RANGE_RE.lastIndex = 0;
      let nm;
      while ((nm = NUM_RANGE_RE.exec(inner)) !== null) {
        const prec = Math.max(decimalPrecision(nm[1]), decimalPrecision(nm[2]));
        numRanges.push({ token: nm[0], min: parseFloat(nm[1]), max: parseFloat(nm[2]), precision: prec });
      }
      const slotRefs = [];
      const srRe = /(\d+)\.([a-zA-Z]+)/g;
      let sr;
      while ((sr = srRe.exec(inner)) !== null) {
        slotRefs.push({ token: sr[0], refPosition: parseInt(sr[1], 10), property: sr[2] });
      }
      Object.assign(descriptor, { type: 'expr', expression: inner, numRanges, slotRefs });
    } else {
      descriptor.type = 'unknown';
      descriptor.parseError = `Unknown bracket type: ${raw}`;
    }

    results.push(descriptor);
  }
  return results;
}

// ─── Resolve ──────────────────────────────────────────────────────────────────

function resolveAll(brackets) {
  const resolvedMap = new Map();
  const results = [];

  for (const b of brackets) {
    let resolution;

    if (b.type === 'expr') {
      // Precision of the result = max precision across all num sub-ranges in this expression.
      const exprPrecision = b.numRanges.reduce((mx, nr) => Math.max(mx, nr.precision ?? 0), 0);
      let expr = b.expression;
      // 1. Replace num(min,max) sub-ranges with random values at their own precision
      NUM_RANGE_RE.lastIndex = 0;
      expr = expr.replace(NUM_RANGE_RE, (_, minS, maxS) => {
        const prec = Math.max(decimalPrecision(minS), decimalPrecision(maxS));
        return randNum(parseFloat(minS), parseFloat(maxS), prec);
      });
      // 2. Replace slot refs with values from already-resolved slots
      expr = expr.replace(/(\d+)\.([a-zA-Z]+)/g, (_, pos, prop) => {
        const source = resolvedMap.get(parseInt(pos, 10));
        const rd = source?.rawData ?? null;
        const val = rd != null ? (typeof rd === 'object' ? rd[prop] : rd) : null;
        return val != null ? String(val) : 'NaN';
      });
      // 3. Normalize double signs produced by negative num values: "6 + -1" → "6 - 1"
      expr = expr.replace(/\+\s*-/g, '- ').replace(/-\s*-/g, '+ ');
      const result = safeArithmetic(expr);
      const numericResult = isNaN(result) ? null : result;
      const displayValue = numericResult == null ? '?' : numericResult.toFixed(exprPrecision);
      resolution = { position: b.position, displayValue, rawData: numericResult, precision: exprPrecision };
    } else if (b.type === 'ref') {
      const source = resolvedMap.get(b.refPosition);
      const rawData = source?.rawData ?? null;
      const val = rawData != null
        ? (typeof rawData === 'object' ? rawData[b.property] : rawData)
        : null;
      resolution = { position: b.position, displayValue: val != null ? String(val) : '?', rawData };
    } else if (b.type === 'el') {
      const pool = periodicTable.filter(e => e.number >= b.min && e.number <= b.max);
      const el = pool[Math.floor(Math.random() * pool.length)];
      resolution = { position: b.position, displayValue: String(el[b.property]), rawData: el };
    } else if (b.type === 'num') {
      const formatted = randNum(b.min, b.max, b.precision);
      const val = parseFloat(formatted);
      resolution = { position: b.position, displayValue: formatted, rawData: val, precision: b.precision };
    } else if (b.type === 'compound') {
      const pool = compounds[b.category] || [];
      const compound = pool[Math.floor(Math.random() * pool.length)];
      resolution = { position: b.position, displayValue: String(compound[b.property]), rawData: compound };
    } else if (b.type === 'const') {
      const c = CONSTANTS[b.constantName];
      resolution = { position: b.position, displayValue: c.displayValue, rawData: c.value };
    } else {
      resolution = { position: b.position, displayValue: '?', rawData: null };
    }

    resolvedMap.set(b.position, resolution);
    results.push(resolution);
  }

  return results;
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderContent(content, resolutions) {
  let result = content;
  // Replace in reverse order to preserve indices when strings have different lengths
  const sorted = [...resolutions].sort((a, b) => b.position - a.position);
  let remaining = content;
  const parts = [];
  BRACKET_RE.lastIndex = 0;
  const matches = [];
  let m;
  while ((m = BRACKET_RE.exec(content)) !== null) {
    matches.push({ index: m.index, length: m[0].length, position: matches.length + 1 });
  }
  // Replace all matches using the resolution map
  const resMap = new Map(resolutions.map(r => [r.position, r.displayValue]));
  let out = '';
  let cursor = 0;
  for (const match of matches) {
    out += content.slice(cursor, match.index);
    out += resMap.get(match.position) ?? '?';
    cursor = match.index + match.length;
  }
  out += content.slice(cursor);
  return out;
}

// ─── Evaluate answer ──────────────────────────────────────────────────────────

// Safe arithmetic evaluator — no eval().
// Handles: integers, decimals, +, -, *, /, ^ (exponentiation, right-associative)
// Also handles unary minus: "8 - -2" and "8 + -2" are both valid.
function safeArithmetic(expr) {
  const raw = expr.match(/[\d.]+(?:[eE][+\-]?\d+)?|[+\-*/^]/g);
  if (!raw) return NaN;

  // Fold unary minus: a '-' that follows an operator (or starts the expression)
  // merges with the next number token so "-2" is one operand, not two tokens.
  const tokens = [];
  for (let i = 0; i < raw.length; i++) {
    const last = tokens[tokens.length - 1];
    const prevIsOpOrStart = last === undefined || last === '+' || last === '-' || last === '*' || last === '/' || last === '^';
    if (raw[i] === '-' && prevIsOpOrStart && i + 1 < raw.length && /^[\d.]/.test(raw[i + 1])) {
      tokens.push('-' + raw[i + 1]);
      i++;
    } else {
      tokens.push(raw[i]);
    }
  }

  const nums = [];
  const ops  = [];

  function applyOp() {
    const b  = nums.pop();
    const a  = nums.pop();
    const op = ops.pop();
    if      (op === '+') nums.push(a + b);
    else if (op === '-') nums.push(a - b);
    else if (op === '*') nums.push(a * b);
    else if (op === '/') nums.push(a / b);
    else if (op === '^') nums.push(Math.pow(a, b));
  }

  // ^ has higher precedence than * and /; it is right-associative so we use
  // strict > (not >=) when deciding whether to pop a pending ^ before pushing.
  const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
  const rightAssoc = new Set(['^']);

  for (const tok of tokens) {
    if (!/^[+\-*/^]$/.test(tok)) {
      nums.push(parseFloat(tok));
    } else {
      while (
        ops.length &&
        (rightAssoc.has(tok)
          ? precedence[ops[ops.length - 1]] > precedence[tok]
          : precedence[ops[ops.length - 1]] >= precedence[tok])
      ) {
        applyOp();
      }
      ops.push(tok);
    }
  }
  while (ops.length) applyOp();

  return nums[0] ?? NaN;
}

function evaluateAnswer(expression, resolutions) {
  const resMap = new Map(resolutions.map(r => [r.position, r]));

  let expr = expression.trim();

  // Replace [N.property] refs first (property access on a slot)
  expr = expr.replace(/\[(\d+)\.([a-zA-Z]+)\]/g, (_, pos, prop) => {
    const r = resMap.get(parseInt(pos, 10));
    if (!r) return 'NaN';
    const val = typeof r.rawData === 'object' ? r.rawData[prop] : r.rawData;
    return val != null ? String(val) : 'NaN';
  });

  // Replace named constant refs like [NA]
  expr = expr.replace(/\[([A-Za-z][A-Za-z0-9]*)\]/g, (_, name) => {
    const c = CONSTANTS[name];
    return c != null ? String(c.value) : 'NaN';
  });

  function fmtNum(r) {
    const rawData = r.rawData;
    if (typeof rawData !== 'number') return null;
    return r.precision != null ? rawData.toFixed(r.precision) : String(rawData);
  }

  // If no arithmetic remains, resolve bare [N] refs and return as string (e.g. element name)
  if (!/[+\-*/^]/.test(expr)) {
    expr = expr.replace(/\[(\d+)\]/g, (_, pos) => {
      const r = resMap.get(parseInt(pos, 10));
      if (!r) return pos;
      return fmtNum(r) ?? pos;
    });
    return expr.trim();
  }

  // Replace bare [N] refs before arithmetic evaluation
  expr = expr.replace(/\[(\d+)\]/g, (_, pos) => {
    const r = resMap.get(parseInt(pos, 10));
    if (!r) return pos;
    return fmtNum(r) ?? pos;
  });

  const result = safeArithmetic(expr);
  if (isNaN(result)) return expression;
  return Number.isInteger(result) ? String(result) : result.toFixed(3);
}

// ─── Distractors ──────────────────────────────────────────────────────────────

function getPrimarySlot(answerExpression, brackets) {
  const m = answerExpression.match(/^\[(\d+)/);
  if (!m) return null;
  const pos = parseInt(m[1], 10);
  const bracket = brackets.find(b => b.position === pos) ?? null;
  // Follow ref to the source so distractors use the real data pool
  if (bracket?.type === 'ref') {
    return brackets.find(b => b.position === bracket.refPosition) ?? null;
  }
  return bracket;
}

// Extract the answer property from a simple expression like "1.number" → "number".
// Returns null for arithmetic expressions or bare slot refs.
function getAnswerProperty(answerExpression) {
  const m = answerExpression.trim().match(/^\[(\d+)\.([a-zA-Z]+)\]$/);
  return m ? m[2] : null;
}

function hasArithmetic(answerExpression) {
  return /[+\-*/]/.test(answerExpression);
}

function generateDistractors(correctValue, resolutions, brackets, answerExpression, count) {
  const distractors = new Set();
  const primaryBracket = getPrimarySlot(answerExpression, brackets);
  const isArithmetic = hasArithmetic(answerExpression);

  if (isArithmetic || !primaryBracket || primaryBracket.type === 'expr' || primaryBracket.type === 'const') {
    // Numeric variants: ±5%, ±10%, ±15%, ±20%, ±25%
    const correct = parseFloat(correctValue);
    if (!isNaN(correct)) {
      const pcts = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.50];
      for (const pct of pcts) {
        if (distractors.size >= count) break;
        for (const sign of [-1, 1]) {
          const candidate = correct + sign * correct * pct;
          const formatted = Number.isInteger(correct)
            ? String(Math.round(candidate))
            : candidate.toFixed(3);
          if (formatted !== correctValue && !distractors.has(formatted)) {
            distractors.add(formatted);
            if (distractors.size >= count) break;
          }
        }
      }
      // Fallback: simple ±1, ±2, ...
      for (let k = 1; distractors.size < count && k <= 20; k++) {
        for (const sign of [-1, 1]) {
          const candidate = Number.isInteger(correct)
            ? String(correct + sign * k)
            : (correct + sign * k * 0.001).toFixed(3);
          if (candidate !== correctValue && !distractors.has(candidate)) {
            distractors.add(candidate);
            if (distractors.size >= count) break;
          }
        }
      }
    }
    return [...distractors].slice(0, count);
  }

  const resolution = resolutions.find(r => r.position === primaryBracket.position);

  if (primaryBracket.type === 'el') {
    // Use the property named in the answer expression (e.g. "number" from "1.number"),
    // not the bracket's display property (e.g. "name" from [el(1,18).name]).
    const prop = getAnswerProperty(answerExpression) ?? primaryBracket.property;
    const inRange = periodicTable.filter(e =>
      e.number >= primaryBracket.min &&
      e.number <= primaryBracket.max &&
      String(e[prop]) !== correctValue
    );
    // Shuffle in-range pool first
    const shuffled = inRange.sort(() => Math.random() - 0.5);
    for (const el of shuffled) {
      if (distractors.size >= count) break;
      const val = String(el[prop]);
      if (!distractors.has(val)) distractors.add(val);
    }
    // If pool exhausted, expand to full table
    if (distractors.size < count) {
      const expanded = periodicTable
        .filter(e => String(e[prop]) !== correctValue && !inRange.find(r => r.number === e.number))
        .sort(() => Math.random() - 0.5);
      for (const el of expanded) {
        if (distractors.size >= count) break;
        const val = String(el[prop]);
        if (!distractors.has(val)) distractors.add(val);
      }
    }
  } else if (primaryBracket.type === 'compound') {
    const prop = getAnswerProperty(answerExpression) ?? primaryBracket.property;
    const category = primaryBracket.category;
    const sameCategory = (compounds[category] || []).filter(c => String(c[prop]) !== correctValue);
    const shuffled = sameCategory.sort(() => Math.random() - 0.5);
    for (const c of shuffled) {
      if (distractors.size >= count) break;
      const val = String(c[prop]);
      if (!distractors.has(val)) distractors.add(val);
    }
    // Spill to other categories
    if (distractors.size < count) {
      const other = Object.entries(compounds)
        .filter(([cat]) => cat !== category)
        .flatMap(([, list]) => list)
        .filter(c => String(c[prop]) !== correctValue)
        .sort(() => Math.random() - 0.5);
      for (const c of other) {
        if (distractors.size >= count) break;
        const val = String(c[prop]);
        if (!distractors.has(val)) distractors.add(val);
      }
    }
  } else if (primaryBracket.type === 'num') {
    const precision = primaryBracket.precision ?? 0;
    const step = precision > 0 ? Math.pow(10, -precision) : 1;
    const correct = parseFloat(correctValue);
    const rangeSteps = Math.round((primaryBracket.max - primaryBracket.min) / step);
    for (let k = 1; distractors.size < count && k <= rangeSteps + 10; k++) {
      for (const sign of [-1, 1]) {
        const raw = correct + sign * k * step;
        if (raw >= primaryBracket.min && raw <= primaryBracket.max) {
          const val = raw.toFixed(precision);
          if (val !== correctValue && !distractors.has(val)) {
            distractors.add(val);
            if (distractors.size >= count) break;
          }
        }
      }
    }
    // If range is too tight, go outside
    for (let k = 1; distractors.size < count && k <= 20; k++) {
      for (const sign of [-1, 1]) {
        const val = (correct + sign * k * step).toFixed(precision);
        if (val !== correctValue && !distractors.has(val)) {
          distractors.add(val);
          if (distractors.size >= count) break;
        }
      }
    }
  }

  return [...distractors].slice(0, count);
}

// ─── Build choices ────────────────────────────────────────────────────────────

function buildDynamicChoices(correctValue, distractors) {
  const all = [
    { id: crypto.randomUUID(), content: correctValue, isCorrect: true },
    ...distractors.map(d => ({ id: crypto.randomUUID(), content: d, isCorrect: false })),
  ];
  // Fisher-Yates shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

// ─── Validate template ────────────────────────────────────────────────────────

function validateTemplate(content, answerExpression) {
  const brackets = parseBrackets(content);

  if (brackets.length === 0) return 'content must contain at least one bracket expression';

  for (const b of brackets) {
    if (b.parseError) return b.parseError;
    if (!KNOWN_TYPES.includes(b.type)) return `Unknown bracket type: ${b.raw}`;

    if (b.type === 'expr') {
      for (const sr of b.slotRefs) {
        if (sr.refPosition >= b.position) {
          return `Expression [${b.expression}] references slot ${sr.refPosition} which must come before this bracket`;
        }
        const source = brackets.find(s => s.position === sr.refPosition);
        if (!source) return `Expression [${b.expression}] references slot ${sr.refPosition} which does not exist`;
        if (source.type === 'num') return `Cannot reference a num bracket property inside an expression bracket`;
        if (source.type === 'el' && !EL_PROPS.includes(sr.property)) {
          return `Invalid el property "${sr.property}" in expression. Valid: ${EL_PROPS.join(', ')}`;
        }
        if (source.type === 'compound' && !COMPOUND_PROPS.includes(sr.property)) {
          return `Invalid compound property "${sr.property}" in expression. Valid: ${COMPOUND_PROPS.join(', ')}`;
        }
      }
      for (const nr of b.numRanges) {
        if (nr.min > nr.max) return `num range in expression must have min ≤ max: ${nr.token}`;
      }
    }

    if (b.type === 'ref') {
      if (b.refPosition >= b.position) {
        return `[${b.refPosition}.${b.property}] must reference an earlier bracket position (forward refs are not allowed)`;
      }
      const source = brackets.find(s => s.position === b.refPosition);
      if (!source) {
        return `[${b.refPosition}.${b.property}] references slot ${b.refPosition} which does not exist`;
      }
      if (source.type === 'num') {
        return `Cannot use a ref bracket to reference a num bracket`;
      }
      if (source.type === 'el' && !EL_PROPS.includes(b.property)) {
        return `Invalid el property "${b.property}" in ref bracket. Valid: ${EL_PROPS.join(', ')}`;
      }
      if (source.type === 'compound' && !COMPOUND_PROPS.includes(b.property)) {
        return `Invalid compound property "${b.property}" in ref bracket. Valid: ${COMPOUND_PROPS.join(', ')}`;
      }
    }

    if (b.type === 'el') {
      if (b.min < 1 || b.max > 118 || b.min > b.max) {
        return `el range must be between 1 and 118 with min ≤ max: ${b.raw}`;
      }
      if (!EL_PROPS.includes(b.property)) {
        return `Invalid el property "${b.property}". Valid: ${EL_PROPS.join(', ')}`;
      }
    }

    if (b.type === 'num') {
      if (b.min > b.max) return `num range: min must be ≤ max: ${b.raw}`;
    }

    if (b.type === 'compound') {
      if (!compounds[b.category]) {
        return `Unknown compound category "${b.category}". Valid: ${Object.keys(compounds).join(', ')}`;
      }
      if (!COMPOUND_PROPS.includes(b.property)) {
        return `Invalid compound property "${b.property}". Valid: ${COMPOUND_PROPS.join(', ')}`;
      }
    }

    if (b.type === 'const') {
      if (!CONSTANTS[b.constantName]) {
        return `Unknown constant "${b.constantName}". Valid: ${Object.keys(CONSTANTS).join(', ')}`;
      }
    }
  }

  // Validate answerExpression
  if (!answerExpression || !answerExpression.trim()) {
    return 'answerExpression is required';
  }

  // Only allow: digits, letters, spaces, operators, decimal point, parens, and square brackets
  if (/[^0-9a-zA-Z\s+\-*/^.()\[\]]/.test(answerExpression)) {
    return 'answerExpression contains invalid characters. Use [N] or [N.property] for slot references and +−*/^ for operators';
  }

  // Validate bracket slot references: [N] or [N.property]
  const maxPosition = brackets.length;
  const slotRefs = [...answerExpression.matchAll(/\[(\d+)(?:\.([a-zA-Z]+))?\]/g)];
  for (const [, pos] of slotRefs) {
    const posNum = parseInt(pos, 10);
    if (posNum < 1 || posNum > maxPosition) {
      return `answerExpression references slot ${posNum} but content only has ${maxPosition} bracket(s)`;
    }
  }

  // Validate named constant refs like [NA]
  const constRefs = [...answerExpression.matchAll(/\[([A-Za-z][A-Za-z0-9]*)\]/g)];
  for (const [, name] of constRefs) {
    if (!CONSTANTS[name]) {
      return `answerExpression references unknown constant [${name}]. Valid: ${Object.keys(CONSTANTS).map(k => `[${k}]`).join(', ')}`;
    }
  }

  return null;
}

module.exports = {
  parseBrackets,
  resolveAll,
  renderContent,
  evaluateAnswer,
  generateDistractors,
  buildDynamicChoices,
  validateTemplate,
};
