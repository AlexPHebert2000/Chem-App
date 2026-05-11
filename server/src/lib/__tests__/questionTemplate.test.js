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
    expect(result[0]).toMatchObject({ position: 1, type: 'num', min: 1, max: 100, property: null });
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
    const resolutions = [{ position: 1, displayValue: '42', rawData: 42 }];
    expect(evaluateAnswer('1', resolutions)).toBe('42');
  });

  test('result is integer string when result is whole', () => {
    expect(evaluateAnswer('1.number', carbonResolution)).toBe('6');
    expect(evaluateAnswer('1.number', carbonResolution)).not.toContain('.');
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
    const numResolutions = [{ position: 1, displayValue: '50', rawData: 50 }];
    const d = generateDistractors('50', numResolutions, numBrackets, '1', 3);
    expect(d).toHaveLength(3);
    d.forEach(v => expect(v).not.toBe('50'));
  });

  test('handles small el range by expanding to full table', () => {
    const smallBrackets = parseBrackets('[el(1,2).name]');
    const smallResolutions = [{ position: 1, displayValue: 'Hydrogen', rawData: { number: 1, name: 'Hydrogen', symbol: 'H', mass: 1.008 } }];
    const d = generateDistractors('Hydrogen', smallResolutions, smallBrackets, '1.name', 3);
    expect(d).toHaveLength(3);
    expect(d).not.toContain('Hydrogen');
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
});
