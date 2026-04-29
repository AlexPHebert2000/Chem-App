const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');

jest.mock('../../lib/prisma', () => ({
  section: { findUnique: jest.fn() },
  chapter: { findUnique: jest.fn() },
  course: { findUnique: jest.fn() },
  question: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  choice: { deleteMany: jest.fn(), create: jest.fn() },
}));

const prisma = require('../../lib/prisma');

process.env.JWT_SECRET = 'test_secret';

const TEACHER_ID = 'teacher-id-1';
const OTHER_TEACHER_ID = 'teacher-id-2';
const STUDENT_ID = 'student-id-1';

function token(role, id) {
  return jwt.sign({ sub: id, role }, process.env.JWT_SECRET);
}

const COURSE   = { id: 'course-id-1', teacherId: TEACHER_ID };
const CHAPTER  = { id: 'chapter-id-1', courseId: COURSE.id };
const SECTION  = { id: 'section-id-1', chapterId: CHAPTER.id };

const MC_CHOICES = [
  { content: '6',  isCorrect: true  },
  { content: '12', isCorrect: false },
  { content: '4',  isCorrect: false },
];

const FIB_CHOICES = [
  { blankIndex: 0, content: '6',  isCorrect: true  },
  { blankIndex: 0, content: '12', isCorrect: false },
  { blankIndex: 1, content: 'C',  isCorrect: true  },
  { blankIndex: 1, content: 'Ca', isCorrect: false },
];

const MC_BODY = {
  type: 'MULTIPLE_CHOICE',
  content: 'What is the atomic number of Carbon?',
  correctExplanation: 'Carbon has 6 protons.',
  incorrectExplanation: 'Review the periodic table — atomic number = number of protons.',
  difficulty: 2,
  choices: MC_CHOICES,
};

const FIB_BODY = {
  type: 'FILL_IN_BLANK',
  content: 'Carbon has atomic number ___ and symbol ___.',
  correctExplanation: 'Carbon: atomic number 6, symbol C.',
  incorrectExplanation: 'Look up Carbon on the periodic table.',
  difficulty: 3,
  choices: FIB_CHOICES,
};

const CREATED_QUESTION = { id: 'question-id-1', ...MC_BODY, sectionId: SECTION.id, choices: [] };

const url = `/api/sections/${SECTION.id}/questions`;

function mockOwnership() {
  prisma.section.findUnique.mockResolvedValue(SECTION);
  prisma.chapter.findUnique.mockResolvedValue(CHAPTER);
  prisma.course.findUnique.mockResolvedValue(COURSE);
}

// ─── Auth & role guards ───────────────────────────────────────────────────────

describe('POST /api/sections/:sectionId/questions — guards', () => {
  test('401 if no token', async () => {
    const res = await request(app).post(url).send(MC_BODY);
    expect(res.status).toBe(401);
  });

  test('403 if requester is a STUDENT', async () => {
    const res = await request(app).post(url).set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`).send(MC_BODY);
    expect(res.status).toBe(403);
  });
});

// ─── Common field validation ──────────────────────────────────────────────────

describe('POST /api/sections/:sectionId/questions — field validation', () => {
  const auth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });

  test('400 if type is missing', async () => {
    const { type: _, ...body } = MC_BODY;
    const res = await request(app).post(url).set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/);
  });

  test('400 if type is invalid', async () => {
    const res = await request(app).post(url).set(auth()).send({ ...MC_BODY, type: 'TRUE_FALSE' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/);
  });

  test('400 if content is missing', async () => {
    const { content: _, ...body } = MC_BODY;
    const res = await request(app).post(url).set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/content/);
  });

  test('400 if correctExplanation is missing', async () => {
    const { correctExplanation: _, ...body } = MC_BODY;
    const res = await request(app).post(url).set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/correctExplanation/);
  });

  test('400 if incorrectExplanation is missing', async () => {
    const { incorrectExplanation: _, ...body } = MC_BODY;
    const res = await request(app).post(url).set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/incorrectExplanation/);
  });

  test('400 if difficulty is missing', async () => {
    const { difficulty: _, ...body } = MC_BODY;
    const res = await request(app).post(url).set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/difficulty/);
  });

  test('400 if difficulty is out of range', async () => {
    const res = await request(app).post(url).set(auth()).send({ ...MC_BODY, difficulty: 6 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/difficulty/);
  });
});

// ─── Multiple choice validation ───────────────────────────────────────────────

describe('POST /api/sections/:sectionId/questions — MULTIPLE_CHOICE validation', () => {
  const auth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });

  test('400 if fewer than 2 choices', async () => {
    const res = await request(app).post(url).set(auth()).send({ ...MC_BODY, choices: [MC_CHOICES[0]] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 2/);
  });

  test('400 if a choice is missing content', async () => {
    const res = await request(app).post(url).set(auth()).send({
      ...MC_BODY,
      choices: [{ content: '', isCorrect: true }, { content: 'B', isCorrect: false }],
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing content/);
  });

  test('400 if no correct choice', async () => {
    const res = await request(app).post(url).set(auth()).send({
      ...MC_BODY,
      choices: MC_CHOICES.map(c => ({ ...c, isCorrect: false })),
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exactly one/);
  });

  test('400 if more than one correct choice', async () => {
    const res = await request(app).post(url).set(auth()).send({
      ...MC_BODY,
      choices: MC_CHOICES.map(c => ({ ...c, isCorrect: true })),
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exactly one/);
  });
});

// ─── Fill-in-the-blank validation ────────────────────────────────────────────

describe('POST /api/sections/:sectionId/questions — FILL_IN_BLANK validation', () => {
  const auth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });

  test('400 if choices array is empty', async () => {
    const res = await request(app).post(url).set(auth()).send({ ...FIB_BODY, choices: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/non-empty/);
  });

  test('400 if a choice is missing blankIndex', async () => {
    const badChoices = [
      { content: '6', isCorrect: true },
      { blankIndex: 0, content: '12', isCorrect: false },
    ];
    const res = await request(app).post(url).set(auth()).send({ ...FIB_BODY, choices: badChoices });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/blankIndex/);
  });

  test('400 if a blank has fewer than 2 choices', async () => {
    const badChoices = [
      { blankIndex: 0, content: '6', isCorrect: true },
      { blankIndex: 1, content: 'C',  isCorrect: true  },
      { blankIndex: 1, content: 'Ca', isCorrect: false },
    ];
    const res = await request(app).post(url).set(auth()).send({ ...FIB_BODY, choices: badChoices });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 2/);
  });

  test('400 if a blank has no correct choice', async () => {
    const badChoices = FIB_CHOICES.map(c => c.blankIndex === 0 ? { ...c, isCorrect: false } : c);
    const res = await request(app).post(url).set(auth()).send({ ...FIB_BODY, choices: badChoices });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exactly one correct/);
  });

  test('400 if a blank has more than one correct choice', async () => {
    const badChoices = FIB_CHOICES.map(c => c.blankIndex === 0 ? { ...c, isCorrect: true } : c);
    const res = await request(app).post(url).set(auth()).send({ ...FIB_BODY, choices: badChoices });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exactly one correct/);
  });
});

// ─── Ownership checks ─────────────────────────────────────────────────────────

describe('POST /api/sections/:sectionId/questions — ownership', () => {
  const auth = (id = TEACHER_ID) => ({ Authorization: `Bearer ${token('TEACHER', id)}` });

  test('404 if section not found', async () => {
    prisma.section.findUnique.mockResolvedValue(null);
    const res = await request(app).post(url).set(auth()).send(MC_BODY);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Section not found/);
  });

  test('403 if teacher does not own the course', async () => {
    mockOwnership();
    const res = await request(app).post(url).set(auth(OTHER_TEACHER_ID)).send(MC_BODY);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/do not own/);
  });
});

// ─── Success ──────────────────────────────────────────────────────────────────

describe('POST /api/sections/:sectionId/questions — success', () => {
  const auth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });

  test('201 with created multiple choice question', async () => {
    mockOwnership();
    prisma.question.create.mockResolvedValue(CREATED_QUESTION);
    const res = await request(app).post(url).set(auth()).send(MC_BODY);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ type: 'MULTIPLE_CHOICE', sectionId: SECTION.id });
    expect(prisma.question.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'MULTIPLE_CHOICE', sectionId: SECTION.id }),
    }));
  });

  test('201 with created fill-in-the-blank question', async () => {
    mockOwnership();
    const fibQuestion = { ...CREATED_QUESTION, type: 'FILL_IN_BLANK' };
    prisma.question.create.mockResolvedValue(fibQuestion);
    const res = await request(app).post(url).set(auth()).send(FIB_BODY);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ type: 'FILL_IN_BLANK', sectionId: SECTION.id });
    expect(prisma.question.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'FILL_IN_BLANK' }),
    }));
  });
});

// ─── updateQuestion ───────────────────────────────────────────────────────────

const QUESTION_ID = 'question-id-1';
const patchUrl = `/api/sections/${SECTION.id}/questions/${QUESTION_ID}`;
const EXISTING_QUESTION = { id: QUESTION_ID, sectionId: SECTION.id, type: 'MULTIPLE_CHOICE' };
const UPDATED_MC  = { id: QUESTION_ID, sectionId: SECTION.id, ...MC_BODY,  choices: [] };
const UPDATED_FIB = { id: QUESTION_ID, sectionId: SECTION.id, ...FIB_BODY, choices: [] };

function mockUpdate(finalQuestion = UPDATED_MC) {
  mockOwnership();
  prisma.question.findUnique
    .mockResolvedValueOnce(EXISTING_QUESTION)
    .mockResolvedValueOnce(finalQuestion);
  prisma.choice.deleteMany.mockResolvedValue({});
  prisma.question.update.mockResolvedValue({});
  prisma.choice.create.mockResolvedValue({});
}

describe('PATCH /api/sections/:sectionId/questions/:questionId — guards', () => {
  test('401 if no token', async () => {
    const res = await request(app).patch(patchUrl).send(MC_BODY);
    expect(res.status).toBe(401);
  });

  test('403 if requester is a STUDENT', async () => {
    const res = await request(app).patch(patchUrl).set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`).send(MC_BODY);
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/sections/:sectionId/questions/:questionId — field validation', () => {
  const auth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });

  test('400 if type is missing', async () => {
    const { type: _, ...body } = MC_BODY;
    const res = await request(app).patch(patchUrl).set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/);
  });

  test('400 if type is invalid', async () => {
    const res = await request(app).patch(patchUrl).set(auth()).send({ ...MC_BODY, type: 'TRUE_FALSE' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/);
  });

  test('400 if content is missing', async () => {
    const { content: _, ...body } = MC_BODY;
    const res = await request(app).patch(patchUrl).set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/content/);
  });

  test('400 if correctExplanation is missing', async () => {
    const { correctExplanation: _, ...body } = MC_BODY;
    const res = await request(app).patch(patchUrl).set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/correctExplanation/);
  });

  test('400 if incorrectExplanation is missing', async () => {
    const { incorrectExplanation: _, ...body } = MC_BODY;
    const res = await request(app).patch(patchUrl).set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/incorrectExplanation/);
  });

  test('400 if difficulty is missing', async () => {
    const { difficulty: _, ...body } = MC_BODY;
    const res = await request(app).patch(patchUrl).set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/difficulty/);
  });

  test('400 if difficulty is out of range', async () => {
    const res = await request(app).patch(patchUrl).set(auth()).send({ ...MC_BODY, difficulty: 6 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/difficulty/);
  });
});

describe('PATCH /api/sections/:sectionId/questions/:questionId — MULTIPLE_CHOICE validation', () => {
  const auth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });

  test('400 if fewer than 2 choices', async () => {
    const res = await request(app).patch(patchUrl).set(auth()).send({ ...MC_BODY, choices: [MC_CHOICES[0]] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 2/);
  });

  test('400 if no correct choice', async () => {
    const res = await request(app).patch(patchUrl).set(auth()).send({
      ...MC_BODY,
      choices: MC_CHOICES.map(c => ({ ...c, isCorrect: false })),
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exactly one/);
  });

  test('400 if more than one correct choice', async () => {
    const res = await request(app).patch(patchUrl).set(auth()).send({
      ...MC_BODY,
      choices: MC_CHOICES.map(c => ({ ...c, isCorrect: true })),
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exactly one/);
  });
});

describe('PATCH /api/sections/:sectionId/questions/:questionId — FILL_IN_BLANK validation', () => {
  const auth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });

  test('400 if choices array is empty', async () => {
    const res = await request(app).patch(patchUrl).set(auth()).send({ ...FIB_BODY, choices: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/non-empty/);
  });

  test('400 if a blank has no correct choice', async () => {
    const badChoices = FIB_CHOICES.map(c => c.blankIndex === 0 ? { ...c, isCorrect: false } : c);
    const res = await request(app).patch(patchUrl).set(auth()).send({ ...FIB_BODY, choices: badChoices });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exactly one correct/);
  });
});

describe('PATCH /api/sections/:sectionId/questions/:questionId — ownership', () => {
  const auth = (id = TEACHER_ID) => ({ Authorization: `Bearer ${token('TEACHER', id)}` });

  test('404 if section not found', async () => {
    prisma.section.findUnique.mockResolvedValue(null);
    const res = await request(app).patch(patchUrl).set(auth()).send(MC_BODY);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Section not found/);
  });

  test('403 if teacher does not own the course', async () => {
    mockOwnership();
    const res = await request(app).patch(patchUrl).set(auth(OTHER_TEACHER_ID)).send(MC_BODY);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/do not own/);
  });
});

describe('PATCH /api/sections/:sectionId/questions/:questionId — question existence', () => {
  const auth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });

  test('404 if question not found', async () => {
    mockOwnership();
    prisma.question.findUnique.mockResolvedValue(null);
    const res = await request(app).patch(patchUrl).set(auth()).send(MC_BODY);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Question not found/);
  });

  test('404 if question belongs to a different section', async () => {
    mockOwnership();
    prisma.question.findUnique.mockResolvedValue({ id: QUESTION_ID, sectionId: 'other-section-id' });
    const res = await request(app).patch(patchUrl).set(auth()).send(MC_BODY);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Question not found/);
  });
});

describe('PATCH /api/sections/:sectionId/questions/:questionId — success', () => {
  const auth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });

  beforeEach(() => jest.clearAllMocks());

  test('200 with updated MULTIPLE_CHOICE question', async () => {
    mockUpdate();
    const res = await request(app).patch(patchUrl).set(auth()).send(MC_BODY);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ type: 'MULTIPLE_CHOICE', sectionId: SECTION.id });
    expect(prisma.choice.deleteMany).toHaveBeenCalledWith({ where: { questionId: QUESTION_ID } });
    expect(prisma.question.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: QUESTION_ID },
      data: expect.objectContaining({ type: 'MULTIPLE_CHOICE', content: MC_BODY.content }),
    }));
  });

  test('200 with updated FILL_IN_BLANK question', async () => {
    mockUpdate(UPDATED_FIB);
    const res = await request(app).patch(patchUrl).set(auth()).send(FIB_BODY);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ type: 'FILL_IN_BLANK', sectionId: SECTION.id });
    expect(prisma.choice.deleteMany).toHaveBeenCalledWith({ where: { questionId: QUESTION_ID } });
  });

  test('recreates the correct number of choices', async () => {
    mockUpdate();
    await request(app).patch(patchUrl).set(auth()).send(MC_BODY);
    expect(prisma.choice.create).toHaveBeenCalledTimes(MC_CHOICES.length);
  });
});

describe('PATCH /api/sections/:sectionId/questions/:questionId — error path', () => {
  const auth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });

  test('500 if database throws during update', async () => {
    mockOwnership();
    prisma.question.findUnique.mockResolvedValueOnce(EXISTING_QUESTION);
    prisma.choice.deleteMany.mockRejectedValue(new Error('DB error'));
    const res = await request(app).patch(patchUrl).set(auth()).send(MC_BODY);
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Could not update question/);
  });
});
