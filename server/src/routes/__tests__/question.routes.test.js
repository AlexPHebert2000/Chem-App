const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');

jest.mock('../../lib/prisma', () => ({
  question:          { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  section:           { findMany: jest.fn() },
  session:           { findUnique: jest.fn(), update: jest.fn() },
  course:            { findMany: jest.fn() },
  chapter:           { findMany: jest.fn() },
  studentEnrollment: { findFirst: jest.fn() },
  questionAttempt:   { create: jest.fn() },
  questionResolution:{ findUnique: jest.fn() },
  choice:            { deleteMany: jest.fn(), create: jest.fn() },
}));

jest.mock('../../services/badge.service', () => ({ awardBadges: jest.fn().mockResolvedValue(undefined) }));

jest.mock('../../lib/questionTemplate', () => ({
  parseBrackets:       jest.fn().mockReturnValue([]),
  resolveAll:          jest.fn().mockReturnValue([]),
  renderContent:       jest.fn().mockReturnValue('Rendered content'),
  evaluateAnswer:      jest.fn().mockReturnValue('6'),
  generateDistractors: jest.fn().mockReturnValue(['7', '8', '5']),
  buildDynamicChoices: jest.fn().mockReturnValue([
    { id: 'dyn-1', content: '6', isCorrect: true  },
    { id: 'dyn-2', content: '7', isCorrect: false },
    { id: 'dyn-3', content: '8', isCorrect: false },
  ]),
  validateTemplate: jest.fn().mockReturnValue(null),
}));

const prisma = require('../../lib/prisma');

process.env.JWT_SECRET = 'test_secret';

const STUDENT_ID       = 'student-id-1';
const OTHER_STUDENT_ID = 'student-id-2';
const TEACHER_ID       = 'teacher-id-1';
const OTHER_TEACHER_ID = 'teacher-id-2';

function token(role, id) {
  return jwt.sign({ sub: id, role }, process.env.JWT_SECRET);
}

const COURSE  = { id: 'course-id-1', teacherId: TEACHER_ID };
const CHAPTER = { id: 'chapter-id-1', courseId: COURSE.id };
const SECTION = { id: 'section-id-1', chapterId: CHAPTER.id, questionIds: [] };

const MC_CHOICES = [
  { id: 'choice-id-1', content: '6',  isCorrect: true,  blankIndex: 0 },
  { id: 'choice-id-2', content: '12', isCorrect: false, blankIndex: 0 },
  { id: 'choice-id-3', content: '4',  isCorrect: false, blankIndex: 0 },
];

const FIB_CHOICES = [
  { id: 'choice-id-1', content: '6',  isCorrect: true,  blankIndex: 0 },
  { id: 'choice-id-2', content: '12', isCorrect: false, blankIndex: 0 },
  { id: 'choice-id-3', content: 'c',  isCorrect: true,  blankIndex: 1 },  // stored lowercase by buildChoices
  { id: 'choice-id-4', content: 'ca', isCorrect: false, blankIndex: 1 },
];

const MC_QUESTION  = { id: 'question-id-1', teacherId: TEACHER_ID, sectionIds: [SECTION.id], type: 'MULTIPLE_CHOICE', difficulty: 3, correctExplanation: 'Carbon has 6 electrons.', incorrectExplanation: 'Review atomic numbers.', choices: MC_CHOICES };
const FIB_QUESTION = { id: 'question-id-2', teacherId: TEACHER_ID, sectionIds: [SECTION.id], type: 'FILL_IN_BLANK',   difficulty: 2, correctExplanation: 'Both blanks correct!',   incorrectExplanation: 'Review the blanks.',    choices: FIB_CHOICES };
const DYN_QUESTION = { id: 'question-id-3', teacherId: TEACHER_ID, sectionIds: [SECTION.id], type: 'DYNAMIC', difficulty: 4, content: 'How many protons are in [el(1,18).number]?', answerExpression: '[1.number]', distractorCount: 3, correctExplanation: 'Correct!', incorrectExplanation: 'Review.', choices: [] };

const SESSION    = { id: 'session-id-1', studentId: STUDENT_ID, courseId: COURSE.id, endedAt: null };
const ENROLLMENT = { studentId: STUDENT_ID, courseId: COURSE.id };
const ATTEMPT    = { id: 'attempt-id-1', studentId: STUDENT_ID, questionId: MC_QUESTION.id, sessionId: SESSION.id, score: 1, answers: [] };

const attemptUrl = (qid = MC_QUESTION.id) => `/api/questions/${qid}/attempt`;

function mockChain(question = MC_QUESTION) {
  prisma.question.findUnique.mockResolvedValue(question);
  prisma.session.findUnique.mockResolvedValue(SESSION);
  prisma.section.findMany.mockResolvedValue([{ ...SECTION, chapter: CHAPTER }]);
  prisma.studentEnrollment.findFirst.mockResolvedValue(ENROLLMENT);
  prisma.course.findMany.mockResolvedValue([]);
  prisma.chapter.findMany.mockResolvedValue([]);
  prisma.questionAttempt.create.mockResolvedValue(ATTEMPT);
  prisma.session.update.mockResolvedValue({});
}

beforeEach(() => jest.clearAllMocks());

// ─── GET /api/questions ───────────────────────────────────────────────────────

describe('GET /api/questions — guards and basic behavior', () => {
  test('401 if no token', async () => {
    const res = await request(app).get('/api/questions');
    expect(res.status).toBe(401);
  });

  test('403 if STUDENT', async () => {
    const res = await request(app).get('/api/questions').set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(403);
  });

  test('200 returns teacher questions with usedIn count', async () => {
    prisma.question.findMany.mockResolvedValue([MC_QUESTION]);
    prisma.course.findMany.mockResolvedValue([COURSE]);
    prisma.chapter.findMany.mockResolvedValue([CHAPTER]);
    prisma.section.findMany.mockResolvedValue([SECTION]);
    const res = await request(app).get('/api/questions').set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(MC_QUESTION.id);
    expect(res.body[0].usedIn).toBe(0);
  });

  test('calls findMany with teacherId filter', async () => {
    prisma.question.findMany.mockResolvedValue([MC_QUESTION]);
    prisma.course.findMany.mockResolvedValue([COURSE]);
    prisma.chapter.findMany.mockResolvedValue([CHAPTER]);
    prisma.section.findMany.mockResolvedValue([SECTION]);
    await request(app).get('/api/questions').set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { teacherId: TEACHER_ID },
    }));
  });
});

// ─── POST /api/questions — createQuestion ─────────────────────────────────────

const MC_BODY = {
  type: 'MULTIPLE_CHOICE',
  content: 'What is the atomic number of Carbon?',
  correctExplanation: 'Carbon has 6 protons.',
  incorrectExplanation: 'Review the periodic table.',
  difficulty: 2,
  choices: [
    { content: '6',  isCorrect: true  },
    { content: '12', isCorrect: false },
    { content: '4',  isCorrect: false },
  ],
};

const FIB_BODY = {
  type: 'FILL_IN_BLANK',
  content: 'Carbon has atomic number ___ and symbol ___.',
  correctExplanation: 'Carbon: atomic number 6, symbol C.',
  incorrectExplanation: 'Look up Carbon on the periodic table.',
  difficulty: 3,
  choices: [
    { blankIndex: 0, content: '6',  isCorrect: true  },
    { blankIndex: 0, content: '12', isCorrect: false },
    { blankIndex: 1, content: 'C',  isCorrect: true  },
    { blankIndex: 1, content: 'Ca', isCorrect: false },
  ],
};

describe('POST /api/questions — guards', () => {
  test('401 if no token', async () => {
    const res = await request(app).post('/api/questions').send(MC_BODY);
    expect(res.status).toBe(401);
  });

  test('403 if STUDENT', async () => {
    const res = await request(app).post('/api/questions').set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`).send(MC_BODY);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/questions — field validation', () => {
  const auth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });

  test('400 if type is missing', async () => {
    const { type: _, ...body } = MC_BODY;
    const res = await request(app).post('/api/questions').set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/);
  });

  test('400 if type is invalid', async () => {
    const res = await request(app).post('/api/questions').set(auth()).send({ ...MC_BODY, type: 'TRUE_FALSE' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/);
  });

  test('400 if content is missing', async () => {
    const { content: _, ...body } = MC_BODY;
    const res = await request(app).post('/api/questions').set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/content/);
  });

  test('400 if correctExplanation is missing', async () => {
    const { correctExplanation: _, ...body } = MC_BODY;
    const res = await request(app).post('/api/questions').set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/correctExplanation/);
  });

  test('400 if incorrectExplanation is missing', async () => {
    const { incorrectExplanation: _, ...body } = MC_BODY;
    const res = await request(app).post('/api/questions').set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/incorrectExplanation/);
  });

  test('400 if difficulty is missing', async () => {
    const { difficulty: _, ...body } = MC_BODY;
    const res = await request(app).post('/api/questions').set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/difficulty/);
  });

  test('400 if difficulty is out of range', async () => {
    const res = await request(app).post('/api/questions').set(auth()).send({ ...MC_BODY, difficulty: 6 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/difficulty/);
  });
});

describe('POST /api/questions — MULTIPLE_CHOICE validation', () => {
  const auth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });

  test('400 if fewer than 2 choices', async () => {
    const res = await request(app).post('/api/questions').set(auth()).send({ ...MC_BODY, choices: [MC_BODY.choices[0]] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 2/);
  });

  test('400 if no correct choice', async () => {
    const res = await request(app).post('/api/questions').set(auth()).send({
      ...MC_BODY,
      choices: MC_BODY.choices.map(c => ({ ...c, isCorrect: false })),
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exactly one/);
  });

  test('400 if more than one correct choice', async () => {
    const res = await request(app).post('/api/questions').set(auth()).send({
      ...MC_BODY,
      choices: MC_BODY.choices.map(c => ({ ...c, isCorrect: true })),
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exactly one/);
  });
});

describe('POST /api/questions — success', () => {
  const auth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });

  test('201 creates MC question (no sectionId in data)', async () => {
    prisma.question.create.mockResolvedValue(MC_QUESTION);
    const res = await request(app).post('/api/questions').set(auth()).send(MC_BODY);
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('MULTIPLE_CHOICE');
    expect(prisma.question.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ teacherId: TEACHER_ID, type: 'MULTIPLE_CHOICE' }),
    }));
    const callData = prisma.question.create.mock.calls[0][0].data;
    expect(callData).not.toHaveProperty('sectionId');
  });

  test('201 creates FIB question', async () => {
    prisma.question.create.mockResolvedValue(FIB_QUESTION);
    const res = await request(app).post('/api/questions').set(auth()).send(FIB_BODY);
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('FILL_IN_BLANK');
  });
});

// ─── GET /api/questions/:questionId ──────────────────────────────────────────

describe('GET /api/questions/:questionId — getOneQuestion', () => {
  const url = `/api/questions/${MC_QUESTION.id}`;

  test('401 if no token', async () => {
    const res = await request(app).get(url);
    expect(res.status).toBe(401);
  });

  test('403 if STUDENT', async () => {
    const res = await request(app).get(url).set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(403);
  });

  test('404 if question not found', async () => {
    prisma.question.findUnique.mockResolvedValue(null);
    const res = await request(app).get(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Question not found/);
  });

  test('403 if teacher does not own the question', async () => {
    prisma.question.findUnique.mockResolvedValue({ ...MC_QUESTION, teacherId: OTHER_TEACHER_ID });
    const res = await request(app).get(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/do not own/);
  });

  test('200 returns question for owner', async () => {
    prisma.question.findUnique.mockResolvedValue(MC_QUESTION);
    const res = await request(app).get(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(MC_QUESTION.id);
  });
});

// ─── PATCH /api/questions/:questionId ────────────────────────────────────────

describe('PATCH /api/questions/:questionId — guards', () => {
  const url = `/api/questions/${MC_QUESTION.id}`;

  test('401 if no token', async () => {
    const res = await request(app).patch(url).send(MC_BODY);
    expect(res.status).toBe(401);
  });

  test('403 if STUDENT', async () => {
    const res = await request(app).patch(url).set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`).send(MC_BODY);
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/questions/:questionId — field validation', () => {
  const url  = `/api/questions/${MC_QUESTION.id}`;
  const auth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });

  test('400 if type is missing', async () => {
    const { type: _, ...body } = MC_BODY;
    const res = await request(app).patch(url).set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/);
  });

  test('400 if type is invalid', async () => {
    const res = await request(app).patch(url).set(auth()).send({ ...MC_BODY, type: 'TRUE_FALSE' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/);
  });

  test('400 if content is missing', async () => {
    const { content: _, ...body } = MC_BODY;
    const res = await request(app).patch(url).set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/content/);
  });

  test('400 if correctExplanation is missing', async () => {
    const { correctExplanation: _, ...body } = MC_BODY;
    const res = await request(app).patch(url).set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/correctExplanation/);
  });

  test('400 if incorrectExplanation is missing', async () => {
    const { incorrectExplanation: _, ...body } = MC_BODY;
    const res = await request(app).patch(url).set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/incorrectExplanation/);
  });

  test('400 if difficulty is missing', async () => {
    const { difficulty: _, ...body } = MC_BODY;
    const res = await request(app).patch(url).set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/difficulty/);
  });

  test('400 if difficulty is out of range', async () => {
    const res = await request(app).patch(url).set(auth()).send({ ...MC_BODY, difficulty: 6 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/difficulty/);
  });
});

describe('PATCH /api/questions/:questionId — ownership', () => {
  const url  = `/api/questions/${MC_QUESTION.id}`;
  const auth = (id = TEACHER_ID) => ({ Authorization: `Bearer ${token('TEACHER', id)}` });

  test('404 if question not found', async () => {
    prisma.question.findUnique.mockResolvedValue(null);
    const res = await request(app).patch(url).set(auth()).send(MC_BODY);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Question not found/);
  });

  test('403 if teacher does not own the question', async () => {
    prisma.question.findUnique.mockResolvedValue({ ...MC_QUESTION, teacherId: OTHER_TEACHER_ID });
    const res = await request(app).patch(url).set(auth()).send(MC_BODY);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/do not own/);
  });
});

describe('PATCH /api/questions/:questionId — success', () => {
  const url  = `/api/questions/${MC_QUESTION.id}`;
  const auth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });

  const UPDATED_MC = { ...MC_QUESTION, content: MC_BODY.content, choices: [] };

  function mockUpdate(finalQuestion = UPDATED_MC) {
    // ownedQuestion calls findUnique once; after update, findUnique called again for response
    prisma.question.findUnique
      .mockResolvedValueOnce(MC_QUESTION)   // ownedQuestion check
      .mockResolvedValueOnce(finalQuestion); // final fetch
    prisma.choice.deleteMany.mockResolvedValue({});
    prisma.choice.create.mockResolvedValue({});
    prisma.question.update.mockResolvedValue({});
  }

  test('200 updates MC question successfully', async () => {
    mockUpdate();
    const res = await request(app).patch(url).set(auth()).send(MC_BODY);
    expect(res.status).toBe(200);
    expect(prisma.choice.deleteMany).toHaveBeenCalledWith({ where: { questionId: MC_QUESTION.id } });
    expect(prisma.question.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: MC_QUESTION.id },
      data: expect.objectContaining({ type: 'MULTIPLE_CHOICE', content: MC_BODY.content }),
    }));
  });

  test('recreates the correct number of choices', async () => {
    mockUpdate();
    await request(app).patch(url).set(auth()).send(MC_BODY);
    expect(prisma.choice.create).toHaveBeenCalledTimes(MC_BODY.choices.length);
  });

  test('500 if database throws during update', async () => {
    prisma.question.findUnique.mockResolvedValueOnce(MC_QUESTION);
    prisma.choice.deleteMany.mockRejectedValue(new Error('DB error'));
    const res = await request(app).patch(url).set(auth()).send(MC_BODY);
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Could not update question/);
  });
});

// ─── GET /api/questions/:questionId/preview ──────────────────────────────────

const previewUrl = (qid = DYN_QUESTION.id) => `/api/questions/${qid}/preview`;

describe('GET /api/questions/:questionId/preview — guards', () => {
  test('401 if no token', async () => {
    const res = await request(app).get(previewUrl());
    expect(res.status).toBe(401);
  });

  test('403 if STUDENT', async () => {
    const res = await request(app).get(previewUrl()).set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/questions/:questionId/preview — resource checks', () => {
  const auth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });

  test('404 if question not found', async () => {
    prisma.question.findUnique.mockResolvedValue(null);
    const res = await request(app).get(previewUrl()).set(auth());
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Question not found/);
  });

  test('400 if question is not DYNAMIC', async () => {
    prisma.question.findUnique.mockResolvedValue(MC_QUESTION);
    const res = await request(app).get(previewUrl(MC_QUESTION.id)).set(auth());
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not dynamic/i);
  });

  test('403 if teacher does not own the question', async () => {
    prisma.question.findUnique.mockResolvedValue({ ...DYN_QUESTION, teacherId: OTHER_TEACHER_ID });
    const res = await request(app).get(previewUrl()).set(auth());
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/do not own/);
  });
});

describe('GET /api/questions/:questionId/preview — success', () => {
  const auth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });

  test('200 returns rendered content and choices without isCorrect', async () => {
    prisma.question.findUnique.mockResolvedValue(DYN_QUESTION);
    const res = await request(app).get(previewUrl()).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(DYN_QUESTION.id);
    expect(res.body.type).toBe('DYNAMIC');
    expect(res.body.content).toBe('Rendered content');
    expect(res.body.difficulty).toBe(DYN_QUESTION.difficulty);
    expect(res.body.correctExplanation).toBe(DYN_QUESTION.correctExplanation);
    expect(res.body.incorrectExplanation).toBe(DYN_QUESTION.incorrectExplanation);
    expect(Array.isArray(res.body.choices)).toBe(true);
    expect(res.body.choices.length).toBeGreaterThan(0);
    res.body.choices.forEach(c => expect(c).toHaveProperty('content'));
  });
});

// ─── POST /api/questions/:questionId/attempt — guards ────────────────────────

describe('POST /api/questions/:questionId/attempt — guards', () => {
  test('401 if no token', async () => {
    const res = await request(app).post(attemptUrl()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(401);
  });

  test('403 if requester is a TEACHER', async () => {
    const res = await request(app).post(attemptUrl()).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/questions/:questionId/attempt — input validation ───────────────

describe('POST /api/questions/:questionId/attempt — input validation', () => {
  const auth = () => ({ Authorization: `Bearer ${token('STUDENT', STUDENT_ID)}` });

  test('400 if sessionId is missing', async () => {
    const res = await request(app).post(attemptUrl()).set(auth()).send({ choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sessionId/);
  });

  test('400 if choiceIds is missing', async () => {
    mockChain();
    const res = await request(app).post(attemptUrl()).set(auth()).send({ sessionId: SESSION.id });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/choiceIds/);
  });

  test('400 if choiceIds is empty', async () => {
    mockChain();
    const res = await request(app).post(attemptUrl()).set(auth()).send({ sessionId: SESSION.id, choiceIds: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/choiceIds/);
  });
});

// ─── POST /api/questions/:questionId/attempt — resource checks ────────────────

describe('POST /api/questions/:questionId/attempt — resource checks', () => {
  const auth = () => ({ Authorization: `Bearer ${token('STUDENT', STUDENT_ID)}` });

  test('404 if question not found', async () => {
    prisma.question.findUnique.mockResolvedValue(null);
    const res = await request(app).post(attemptUrl()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Question not found/);
  });

  test('404 if session not found', async () => {
    prisma.question.findUnique.mockResolvedValue(MC_QUESTION);
    prisma.session.findUnique.mockResolvedValue(null);
    const res = await request(app).post(attemptUrl()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Session not found/);
  });

  test('404 if session belongs to a different student', async () => {
    prisma.question.findUnique.mockResolvedValue(MC_QUESTION);
    prisma.session.findUnique.mockResolvedValue({ ...SESSION, studentId: OTHER_STUDENT_ID });
    const res = await request(app).post(attemptUrl()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(404);
  });

  test('409 if session has already ended', async () => {
    prisma.question.findUnique.mockResolvedValue(MC_QUESTION);
    prisma.session.findUnique.mockResolvedValue({ ...SESSION, endedAt: new Date() });
    const res = await request(app).post(attemptUrl()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/ended/);
  });

  test('403 if question does not belong to the session course', async () => {
    prisma.question.findUnique.mockResolvedValue(MC_QUESTION);
    prisma.session.findUnique.mockResolvedValue(SESSION);
    // section's chapter belongs to a different course
    prisma.section.findMany.mockResolvedValue([{ ...SECTION, chapter: { ...CHAPTER, courseId: 'other-course-id' } }]);
    const res = await request(app).post(attemptUrl()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/does not belong/);
  });

  test('403 if student is not enrolled in the course', async () => {
    prisma.question.findUnique.mockResolvedValue(MC_QUESTION);
    prisma.session.findUnique.mockResolvedValue(SESSION);
    prisma.section.findMany.mockResolvedValue([{ ...SECTION, chapter: CHAPTER }]);
    prisma.studentEnrollment.findFirst.mockResolvedValue(null);
    const res = await request(app).post(attemptUrl()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Not enrolled/);
  });

  test('400 if a choiceId does not belong to the question', async () => {
    mockChain();
    const res = await request(app).post(attemptUrl()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['wrong-choice-id'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/does not belong/);
  });
});

// ─── POST /api/questions/:questionId/attempt — MULTIPLE_CHOICE submission ─────

describe('POST /api/questions/:questionId/attempt — MULTIPLE_CHOICE submission', () => {
  const auth = () => ({ Authorization: `Bearer ${token('STUDENT', STUDENT_ID)}` });

  test('400 if more than one choice is submitted', async () => {
    mockChain();
    const res = await request(app).post(attemptUrl()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1', 'choice-id-2'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exactly one/);
  });

  test('201 with score 1 for correct answer', async () => {
    mockChain();
    const res = await request(app).post(attemptUrl()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(201);
    expect(prisma.questionAttempt.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ score: 1 }),
    }));
  });

  test('201 with score 0 for wrong answer', async () => {
    mockChain();
    prisma.questionAttempt.create.mockResolvedValue({ ...ATTEMPT, score: 0 });
    const res = await request(app).post(attemptUrl()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-2'] });
    expect(res.status).toBe(201);
    expect(prisma.questionAttempt.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ score: 0 }),
    }));
  });

  test('calls recordActivity with xpDelta on success', async () => {
    mockChain();
    await request(app).post(attemptUrl()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(prisma.session.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: SESSION.id },
      data: expect.objectContaining({ questionsAnswered: { increment: 1 } }),
    }));
  });

  test('returns enriched response with isCorrect, explanation, and xpDelta', async () => {
    mockChain();
    const res = await request(app).post(attemptUrl()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(201);
    expect(res.body.isCorrect).toBe(true);
    expect(res.body.explanation).toBe(MC_QUESTION.correctExplanation);
    expect(res.body.xpDelta).toBe(MC_QUESTION.difficulty * 10);
    expect(res.body.attempt).toBeDefined();
  });

  test('returns xpDelta 0 and incorrectExplanation for wrong answer', async () => {
    mockChain();
    prisma.questionAttempt.create.mockResolvedValue({ ...ATTEMPT, score: 0 });
    const res = await request(app).post(attemptUrl()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-2'] });
    expect(res.status).toBe(201);
    expect(res.body.isCorrect).toBe(false);
    expect(res.body.explanation).toBe(MC_QUESTION.incorrectExplanation);
    expect(res.body.xpDelta).toBe(0);
  });
});

// ─── POST /api/questions/:questionId/attempt — FILL_IN_BLANK submission ───────
// FIB_QUESTION has 2 blanks: blank 0 correct='6', blank 1 correct='c' (lowercased by controller)

describe('POST /api/questions/:questionId/attempt — FILL_IN_BLANK submission', () => {
  const auth = () => ({ Authorization: `Bearer ${token('STUDENT', STUDENT_ID)}` });

  test('400 if fibAnswers not provided', async () => {
    mockChain(FIB_QUESTION);
    const res = await request(app).post(attemptUrl(FIB_QUESTION.id)).set(auth()).send({ sessionId: SESSION.id });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/fibAnswers/);
  });

  test('400 if wrong number of fibAnswers (too few)', async () => {
    mockChain(FIB_QUESTION);
    const res = await request(app).post(attemptUrl(FIB_QUESTION.id)).set(auth()).send({ sessionId: SESSION.id, fibAnswers: ['6'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/2 answer/);
  });

  test('201 with score 2 when all blanks correct', async () => {
    mockChain(FIB_QUESTION);
    const fibAttempt = { ...ATTEMPT, score: 2 };
    prisma.questionAttempt.create.mockResolvedValue(fibAttempt);
    const res = await request(app).post(attemptUrl(FIB_QUESTION.id)).set(auth()).send({ sessionId: SESSION.id, fibAnswers: ['6', 'c'] });
    expect(res.status).toBe(201);
    expect(res.body.isCorrect).toBe(true);
    expect(prisma.questionAttempt.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ score: 2 }),
    }));
  });

  test('201 with score 1 when one blank is wrong', async () => {
    mockChain(FIB_QUESTION);
    const fibAttempt = { ...ATTEMPT, score: 1 };
    prisma.questionAttempt.create.mockResolvedValue(fibAttempt);
    const res = await request(app).post(attemptUrl(FIB_QUESTION.id)).set(auth()).send({ sessionId: SESSION.id, fibAnswers: ['6', 'wrong'] });
    expect(res.status).toBe(201);
    expect(res.body.isCorrect).toBe(false);
    expect(res.body.xpDelta).toBe(0);
    expect(prisma.questionAttempt.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ score: 1 }),
    }));
  });

  test('201 with score 2 when answer has extra spaces (non metal → nonmetal)', async () => {
    mockChain(FIB_QUESTION);
    const fibAttempt = { ...ATTEMPT, score: 2 };
    prisma.questionAttempt.create.mockResolvedValue(fibAttempt);
    // blank 0 correct='6', blank 1 correct='c' — submit with spaces stripped
    const res = await request(app).post(attemptUrl(FIB_QUESTION.id)).set(auth()).send({ sessionId: SESSION.id, fibAnswers: [' 6 ', ' C '] });
    expect(res.status).toBe(201);
    expect(res.body.isCorrect).toBe(true);
  });
});
