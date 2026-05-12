const {
  parseBrackets,
  resolveAll,
  renderContent,
  evaluateAnswer,
  generateDistractors,
  buildDynamicChoices,
  validateTemplate,
} = require('../questionTemplate');

// ─── parseBrackets ────────────────────────────────────────────────────────────

describe('parseBrackets', () => {
  test('parses el bracket with comma syntax', () => {
    const result = parseBrackets('How many protons are in [el(1,18).name]?');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ position: 1, type: 'el', min: 1, max: 18, property: 'name' });
  });

  test('parses num bracket', () => {
    const result = parseBrackets('Add [num(1,100)] grams.');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ position: 1, type: 'num', min: 1, max: 100, precision: 0, property: null });
  });

  test('parses decimal num bracket and extracts precision', () => {
    const result = parseBrackets('[num(1.00,5.00)]');
    expect(result[0]).toMatchObject({ type: 'num', min: 1, max: 5, precision: 2 });
  });

  test('decimal num precision is the max of both bounds', () => {
    const result = parseBrackets('[num(1.0,5.00)]');
    expect(result[0].precision).toBe(2);
  });

  test('parses compound bracket', () => {
    const result = parseBrackets('The formula of [compound(acids).formula] is?');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ position: 1, type: 'compound', category: 'acids', property: 'formula' });
  });

  test('parses multiple brackets with correct positions', () => {
    const result = parseBrackets('[el(1,18).name] has [el(1,18).number] protons.');
    expect(result).toHaveLength(2);
    expect(result[0].position).toBe(1);
    expect(result[1].position).toBe(2);
  });

  test('returns empty array for content with no brackets', () => {
    expect(parseBrackets('No brackets here.')).toEqual([]);
  });

  test('sets parseError for malformed el bracket', () => {
    const result = parseBrackets('[el(1-18).name]');
    expect(result[0].parseError).toBeTruthy();
  });

  test('sets type unknown for unrecognized bracket', () => {
    const result = parseBrackets('[ion(1,5).charge]');
    expect(result[0].type).toBe('unknown');
  });

  test('parses ref bracket [1.symbol]', () => {
    const result = parseBrackets('[el(1,18).name] and [1.symbol]');
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ position: 2, type: 'ref', refPosition: 1, property: 'symbol' });
  });

  test('parses expr bracket with slot ref + num range', () => {
    const result = parseBrackets('[el(1,18).number] has [1.number + num(-2,2)] electrons.');
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ position: 2, type: 'expr' });
    expect(result[1].numRanges).toHaveLength(1);
    expect(result[1].numRanges[0]).toMatchObject({ min: -2, max: 2 });
    expect(result[1].slotRefs).toHaveLength(1);
    expect(result[1].slotRefs[0]).toMatchObject({ refPosition: 1, property: 'number' });
  });

  test('parses standalone expr with only num ranges', () => {
    const result = parseBrackets('The value is [num(1,5) + num(1,5)].');
    expect(result[0]).toMatchObject({ type: 'expr' });
    expect(result[0].numRanges).toHaveLength(2);
  });
});

// ─── resolveAll ───────────────────────────────────────────────────────────────

describe('resolveAll', () => {
  test('el bracket resolves to element in range', () => {
    const brackets = parseBrackets('[el(1,10).name]');
    const resolutions = resolveAll(brackets);
    expect(resolutions).toHaveLength(1);
    const r = resolutions[0];
    expect(r.rawData.number).toBeGreaterThanOrEqual(1);
    expect(r.rawData.number).toBeLessThanOrEqual(10);
    expect(typeof r.displayValue).toBe('string');
    expect(r.displayValue.length).toBeGreaterThan(0);
  });

  test('num bracket resolves to integer in range', () => {
    const brackets = parseBrackets('[num(5,10)]');
    for (let i = 0; i < 20; i++) {
      const r = resolveAll(brackets)[0];
      expect(parseInt(r.displayValue, 10)).toBeGreaterThanOrEqual(5);
      expect(parseInt(r.displayValue, 10)).toBeLessThanOrEqual(10);
    }
  });

  test('decimal num bracket displayValue has correct number of decimal places', () => {
    const brackets = parseBrackets('[num(1.00,5.00)]');
    for (let i = 0; i < 20; i++) {
      const r = resolveAll(brackets)[0];
      expect(r.displayValue).toMatch(/^\d+\.\d{2}$/);
      expect(parseFloat(r.displayValue)).toBeGreaterThanOrEqual(1);
      expect(parseFloat(r.displayValue)).toBeLessThanOrEqual(5);
    }
  });

  test('decimal num rawData is numeric and precision is stored', () => {
    const brackets = parseBrackets('[num(1.00,5.00)]');
    const r = resolveAll(brackets)[0];
    expect(typeof r.rawData).toBe('number');
    expect(r.precision).toBe(2);
  });

  test('compound bracket resolves to compound from correct category', () => {
    const brackets = parseBrackets('[compound(acids).formula]');
    const r = resolveAll(brackets)[0];
    expect(typeof r.displayValue).toBe('string');
    expect(r.rawData).toHaveProperty('formula');
    expect(r.rawData).toHaveProperty('molarMass');
  });

  test('displayValue is always a string', () => {
    const brackets = parseBrackets('[el(1,18).number]');
    const r = resolveAll(brackets)[0];
    expect(typeof r.displayValue).toBe('string');
  });

  test('ref bracket displays correct property of source bracket', () => {
    const brackets = parseBrackets('[el(1,18).name] and [1.symbol]');
    const resolutions = resolveAll(brackets);
    expect(resolutions).toHaveLength(2);
    // The ref resolution's displayValue must equal the source element's symbol
    const sourceName = resolutions[0].displayValue;
    const sourceSymbol = resolutions[0].rawData.symbol;
    expect(resolutions[1].displayValue).toBe(String(sourceSymbol));
  });

  test('ref bracket shares rawData of source resolution', () => {
    const brackets = parseBrackets('[el(1,18).name] and [1.symbol]');
    const resolutions = resolveAll(brackets);
    // Both slots come from the same element
    expect(resolutions[0].rawData).toBe(resolutions[1].rawData);
  });

  test('expr bracket resolves to a numeric displayValue', () => {
    const brackets = parseBrackets('[el(1,18).number] has [1.number + num(-2,2)] electrons.');
    for (let i = 0; i < 20; i++) {
      const resolutions = resolveAll(brackets);
      const atomicNum = resolutions[0].rawData.number;
      const electronCount = parseInt(resolutions[1].displayValue, 10);
      // electron count must be atomic number ±2
      expect(electronCount).toBeGreaterThanOrEqual(atomicNum - 2);
      expect(electronCount).toBeLessThanOrEqual(atomicNum + 2);
    }
  });

  test('expr bracket rawData is the numeric result', () => {
    const brackets = parseBrackets('[el(1,18).number] and [1.number + num(0,0)]');
    const resolutions = resolveAll(brackets);
    // num(0,0) always gives 0, so expr = atomicNum + 0 = atomicNum
    expect(resolutions[1].rawData).toBe(resolutions[0].rawData.number);
  });
});

// ─── renderContent ────────────────────────────────────────────────────────────

describe('renderContent', () => {
  test('replaces single bracket with displayValue', () => {
    const brackets = parseBrackets('[el(1,18).name]');
    const resolutions = [{ position: 1, displayValue: 'Carbon', rawData: { number: 6, name: 'Carbon', symbol: 'C', mass: 12.011 } }];
    const result = renderContent('[el(1,18).name]', resolutions);
    expect(result).toBe('Carbon');
  });

  test('replaces brackets in full sentence', () => {
    const content = 'How many protons are in [el(1,18).name]?';
    const resolutions = [{ position: 1, displayValue: 'Carbon', rawData: {} }];
    expect(renderContent(content, resolutions)).toBe('How many protons are in Carbon?');
  });

  test('replaces two brackets in order', () => {
    const content = '[el(1,18).name] has atomic number [el(1,18).number].';
    const resolutions = [
      { position: 1, displayValue: 'Carbon', rawData: {} },
      { position: 2, displayValue: '6', rawData: {} },
    ];
    expect(renderContent(content, resolutions)).toBe('Carbon has atomic number 6.');
  });

  test('content with no brackets returns unchanged', () => {
    expect(renderContent('No brackets.', [])).toBe('No brackets.');
  });
});

// ─── evaluateAnswer ───────────────────────────────────────────────────────────

describe('evaluateAnswer', () => {
  const carbonResolution = [{ position: 1, displayValue: 'Carbon', rawData: { number: 6, name: 'Carbon', symbol: 'C', mass: 12.011 } }];

  test('"1.number" returns element atomic number as string', () => {
    expect(evaluateAnswer('1.number', carbonResolution)).toBe('6');
  });

  test('"1.mass" returns mass as string', () => {
    expect(evaluateAnswer('1.mass', carbonResolution)).toBe('12.011');
  });

  test('"1.name" returns name string', () => {
    expect(evaluateAnswer('1.name', carbonResolution)).toBe('Carbon');
  });

  test('arithmetic expression "2 * 1.number" computes correctly', () => {
    expect(evaluateAnswer('2 * 1.number', carbonResolution)).toBe('12');
  });

  test('two-slot addition', () => {
    const resolutions = [
      { position: 1, displayValue: '3', rawData: 3 },
      { position: 2, displayValue: '4', rawData: 4 },
    ];
    expect(evaluateAnswer('1 + 2', resolutions)).toBe('7');
  });

  test('num slot bare reference returns the number', () => {
    const resolutions = [{ position: 1, displayValue: '42', rawData: 42, precision: 0 }];
    expect(evaluateAnswer('1', resolutions)).toBe('42');
  });

  test('decimal num bare reference preserves trailing zeros', () => {
    // rawData 3.5 with precision 2 → answer must be "3.50" not "3.5"
    const resolutions = [{ position: 1, displayValue: '3.50', rawData: 3.5, precision: 2 }];
    expect(evaluateAnswer('1', resolutions)).toBe('3.50');
  });

  test('decimal num bare reference at a round value', () => {
    const resolutions = [{ position: 1, displayValue: '5.00', rawData: 5.0, precision: 2 }];
    expect(evaluateAnswer('1', resolutions)).toBe('5.00');
  });

  test('result is integer string when result is whole', () => {
    expect(evaluateAnswer('1.number', carbonResolution)).toBe('6');
    expect(evaluateAnswer('1.number', carbonResolution)).not.toContain('.');
  });

  test('^ computes exponentiation: 2^3 = 8', () => {
    const res = [{ position: 1, displayValue: '2', rawData: 2 }, { position: 2, displayValue: '3', rawData: 3 }];
    expect(evaluateAnswer('1 ^ 2', res)).toBe('8');
  });

  test('^ is right-associative: 2^3^2 = 2^9 = 512', () => {
    const res = [
      { position: 1, displayValue: '2', rawData: 2 },
      { position: 2, displayValue: '3', rawData: 3 },
      { position: 3, displayValue: '2', rawData: 2 },
    ];
    expect(evaluateAnswer('1 ^ 2 ^ 3', res)).toBe('512');
  });

  test('^ with * for scientific notation: coefficient * 10^exponent', () => {
    const res = [{ position: 1, displayValue: '5', rawData: 5 }, { position: 2, displayValue: '3', rawData: 3 }];
    expect(evaluateAnswer('1 * 10 ^ 2', res)).toBe('5000');
  });

  test('^ has higher precedence than *: coefficient * 10^exponent', () => {
    // slot 1 = coefficient (3), slot 2 = exponent (4); "10" is a literal constant
    const res = [{ position: 1, displayValue: '3', rawData: 3 }, { position: 2, displayValue: '4', rawData: 4 }];
    // evaluates as 3 * (10^4) = 30000, not (3*10)^4
    expect(evaluateAnswer('1 * 10 ^ 2', res)).toBe('30000');
  });
});

// ─── generateDistractors ──────────────────────────────────────────────────────

describe('generateDistractors', () => {
  const carbonResolution = [{ position: 1, displayValue: 'Carbon', rawData: { number: 6, name: 'Carbon', symbol: 'C', mass: 12.011 } }];
  const brackets = parseBrackets('[el(1,18).number]');

  test('returns exactly count distractors', () => {
    const d = generateDistractors('6', carbonResolution, brackets, '1.number', 3);
    expect(d).toHaveLength(3);
  });

  test('no distractor equals the correct value', () => {
    for (let i = 0; i < 10; i++) {
      const d = generateDistractors('6', carbonResolution, brackets, '1.number', 3);
      expect(d).not.toContain('6');
    }
  });

  test('all distractors are strings', () => {
    const d = generateDistractors('6', carbonResolution, brackets, '1.number', 3);
    d.forEach(v => expect(typeof v).toBe('string'));
  });

  test('no duplicates within distractor list', () => {
    const d = generateDistractors('6', carbonResolution, brackets, '1.number', 3);
    expect(new Set(d).size).toBe(d.length);
  });

  test('num distractors are adjacent integers', () => {
    const numBrackets = parseBrackets('[num(1,100)]');
    const numResolutions = [{ position: 1, displayValue: '50', rawData: 50, precision: 0 }];
    const d = generateDistractors('50', numResolutions, numBrackets, '1', 3);
    expect(d).toHaveLength(3);
    d.forEach(v => expect(v).not.toBe('50'));
  });

  test('decimal num distractors are formatted to the correct decimal places', () => {
    const numBrackets = parseBrackets('[num(1.00,5.00)]');
    const numResolutions = [{ position: 1, displayValue: '3.00', rawData: 3.0, precision: 2 }];
    const d = generateDistractors('3.00', numResolutions, numBrackets, '1', 3);
    expect(d).toHaveLength(3);
    d.forEach(v => {
      expect(v).toMatch(/^\d+\.\d{2}$/);
      expect(v).not.toBe('3.00');
    });
  });

  test('handles small el range by expanding to full table', () => {
    const smallBrackets = parseBrackets('[el(1,2).name]');
    const smallResolutions = [{ position: 1, displayValue: 'Hydrogen', rawData: { number: 1, name: 'Hydrogen', symbol: 'H', mass: 1.008 } }];
    const d = generateDistractors('Hydrogen', smallResolutions, smallBrackets, '1.name', 3);
    expect(d).toHaveLength(3);
    expect(d).not.toContain('Hydrogen');
  });

  test('distractors use answer property, not bracket display property', () => {
    // Question: "How many protons are in [el(1,18).name]?" — display prop is 'name'
    // Answer: "1.number" — answer prop is 'number'
    // Distractors must be numbers, not element names
    const nameBrackets = parseBrackets('[el(1,18).name]');
    const res = [{ position: 1, displayValue: 'Carbon', rawData: { number: 6, name: 'Carbon', symbol: 'C', mass: 12.011 } }];
    const d = generateDistractors('6', res, nameBrackets, '1.number', 3);
    expect(d).toHaveLength(3);
    d.forEach(v => expect(Number.isNaN(Number(v))).toBe(false));
    expect(d).not.toContain('6');
  });
});

// ─── buildDynamicChoices ──────────────────────────────────────────────────────

describe('buildDynamicChoices', () => {
  test('returns 1 + distractors.length choices', () => {
    const choices = buildDynamicChoices('6', ['7', '8', '5']);
    expect(choices).toHaveLength(4);
  });

  test('exactly one choice has isCorrect: true', () => {
    const choices = buildDynamicChoices('6', ['7', '8', '5']);
    const correct = choices.filter(c => c.isCorrect);
    expect(correct).toHaveLength(1);
    expect(correct[0].content).toBe('6');
  });

  test('all choices have a non-empty id string', () => {
    const choices = buildDynamicChoices('6', ['7', '8']);
    choices.forEach(c => {
      expect(typeof c.id).toBe('string');
      expect(c.id.length).toBeGreaterThan(0);
    });
  });

  test('choices are shuffled (correct is not always first)', () => {
    let correctFirstCount = 0;
    for (let i = 0; i < 40; i++) {
      const choices = buildDynamicChoices('6', ['7', '8', '5']);
      if (choices[0].isCorrect) correctFirstCount++;
    }
    // If truly shuffled, correct should be first ~25% of the time, not 100%
    expect(correctFirstCount).toBeLessThan(40);
  });
});

// ─── validateTemplate ─────────────────────────────────────────────────────────

describe('validateTemplate', () => {
  test('returns null for a valid el template', () => {
    expect(validateTemplate('How many protons are in [el(1,18).name]?', '1.number')).toBeNull();
  });

  test('returns null for valid num template', () => {
    expect(validateTemplate('Add [num(1,100)] grams.', '1')).toBeNull();
  });

  test('returns null for decimal num template', () => {
    expect(validateTemplate('The value is [num(1.00,5.00)].', '1')).toBeNull();
  });

  test('returns null for valid compound template', () => {
    expect(validateTemplate('The formula is [compound(acids).formula].', '1.molarMass')).toBeNull();
  });

  test('returns error if no brackets in content', () => {
    expect(validateTemplate('No brackets here.', '1.number')).toMatch(/bracket/i);
  });

  test('returns error for malformed el bracket (dash instead of comma)', () => {
    expect(validateTemplate('[el(1-18).name]', '1.number')).toBeTruthy();
  });

  test('returns error for unknown bracket type', () => {
    expect(validateTemplate('[ion(1,5).charge]', '1.charge')).toMatch(/unknown/i);
  });

  test('returns error for invalid el property', () => {
    expect(validateTemplate('[el(1,18).color]', '1.color')).toMatch(/property/i);
  });

  test('returns error for invalid compound category', () => {
    expect(validateTemplate('[compound(gases).formula]', '1.formula')).toMatch(/category/i);
  });

  test('returns error if answerExpression references out-of-range slot', () => {
    expect(validateTemplate('[el(1,18).name]', '2.number')).toMatch(/slot 2/);
  });

  test('returns error if el range is out of bounds', () => {
    expect(validateTemplate('[el(0,18).name]', '1.number')).toMatch(/range/i);
  });

  test('returns error for invalid characters in answerExpression', () => {
    expect(validateTemplate('[el(1,18).name]', '1.number; DROP TABLE')).toBeTruthy();
  });

  test('returns null for valid answerExpression using ^', () => {
    // slot 1 = coefficient, slot 2 = exponent; "10" is a literal constant not a slot ref
    expect(validateTemplate('[num(1,9)][num(1,6)]', '1 * 10 ^ 2')).toBeNull();
  });

  test('returns null for valid ref bracket', () => {
    expect(validateTemplate('[el(1,18).name] and [1.symbol]', '1.number')).toBeNull();
  });

  test('returns error for forward ref bracket', () => {
    expect(validateTemplate('[2.symbol] and [el(1,18).name]', '2.number')).toBeTruthy();
  });

  test('returns error for ref to num bracket', () => {
    expect(validateTemplate('[num(1,10)] and [1.number]', '1')).toMatch(/num/i);
  });

  test('returns error for ref bracket with invalid el property', () => {
    expect(validateTemplate('[el(1,18).name] and [1.color]', '1.number')).toMatch(/property/i);
  });

  test('returns null for valid expr bracket', () => {
    expect(validateTemplate('[el(1,18).number] has [1.number + num(-2,2)] electrons.', '2')).toBeNull();
  });

  test('returns null for expr bracket with only num ranges', () => {
    expect(validateTemplate('Add [num(1,5) + num(1,5)] grams.', '1')).toBeNull();
  });

  test('returns error for expr bracket referencing a forward slot', () => {
    expect(validateTemplate('[2.number + num(-2,2)] and [el(1,18).number]', '1')).toBeTruthy();
  });

  test('returns error for expr bracket referencing a num bracket property', () => {
    expect(validateTemplate('[num(1,10)] and [1.number + num(-1,1)]', '2')).toMatch(/num/i);
  });

  test('returns error for expr bracket with invalid el property', () => {
    expect(validateTemplate('[el(1,18).number] and [1.color + num(-1,1)]', '2')).toMatch(/property/i);
  });

  test('returns error for expr num range with min > max', () => {
    expect(validateTemplate('[el(1,18).number] has [1.number + num(2,-2)] electrons.', '2')).toBeTruthy();
  });
});
