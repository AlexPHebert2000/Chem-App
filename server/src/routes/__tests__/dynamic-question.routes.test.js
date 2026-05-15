const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');

jest.mock('../../lib/prisma', () => ({
  question:           { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  section:            { findUnique: jest.fn(), findMany: jest.fn() },
  chapter:            { findUnique: jest.fn() },
  course:             { findUnique: jest.fn() },
  studentCourse:      { findUnique: jest.fn() },
  session:            { findUnique: jest.fn(), update: jest.fn() },
  questionResolution: { upsert: jest.fn(), findUnique: jest.fn() },
  questionAttempt:    { create: jest.fn() },
  choice:             { deleteMany: jest.fn(), create: jest.fn() },
}));

jest.mock('../../lib/questionTemplate', () => ({
  parseBrackets:       jest.fn().mockReturnValue([{ position: 1, type: 'el', min: 1, max: 18, property: 'number', raw: '[el(1,18).number]' }]),
  resolveAll:          jest.fn().mockReturnValue([{ position: 1, displayValue: '6', rawData: { number: 6, name: 'Carbon', symbol: 'C', mass: 12.011 } }]),
  renderContent:       jest.fn().mockReturnValue('How many protons are in Carbon?'),
  evaluateAnswer:      jest.fn().mockReturnValue('6'),
  generateDistractors: jest.fn().mockReturnValue(['7', '8', '5']),
  buildDynamicChoices: jest.fn().mockReturnValue([
    { id: 'dyn-1', content: '6', isCorrect: true  },
    { id: 'dyn-2', content: '7', isCorrect: false },
    { id: 'dyn-3', content: '8', isCorrect: false },
    { id: 'dyn-4', content: '5', isCorrect: false },
  ]),
  validateTemplate: jest.fn().mockReturnValue(null),
}));

jest.mock('../../services/badge.service', () => ({ awardBadges: jest.fn().mockResolvedValue(undefined) }));

const prisma = require('../../lib/prisma');

process.env.JWT_SECRET = 'test_secret';

const TEACHER_ID = 'teacher-id-1';
const STUDENT_ID = 'student-id-1';

function token(role, id) {
  return jwt.sign({ sub: id, role }, process.env.JWT_SECRET);
}
const teacherAuth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });
const studentAuth = () => ({ Authorization: `Bearer ${token('STUDENT', STUDENT_ID)}` });

const COURSE  = { id: 'course-id-1', teacherId: TEACHER_ID };
const CHAPTER = { id: 'chapter-id-1', courseId: COURSE.id };
const SECTION = { id: 'section-id-1', chapterId: CHAPTER.id, questionIds: ['q-dyn-1'] };

const DYNAMIC_QUESTION = {
  id: 'q-dyn-1',
  teacherId: TEACHER_ID,
  sectionIds: [SECTION.id],
  type: 'DYNAMIC',
  content: 'How many protons are in [el(1,18).number]?',
  answerExpression: '[1.number]',
  distractorCount: 3,
  difficulty: 3,
  correctExplanation: 'Carbon has 6 protons.',
  incorrectExplanation: 'Review atomic numbers.',
  choices: [],
};

const SESSION    = { id: 'session-id-1', studentId: STUDENT_ID, courseId: COURSE.id, endedAt: null };
const ENROLLMENT = { studentId: STUDENT_ID, courseId: COURSE.id };

const DYNAMIC_CHOICES_JSON = JSON.stringify([
  { id: 'dyn-1', content: '6', isCorrect: true  },
  { id: 'dyn-2', content: '7', isCorrect: false },
  { id: 'dyn-3', content: '8', isCorrect: false },
  { id: 'dyn-4', content: '5', isCorrect: false },
]);

const RESOLUTION = { studentId: STUDENT_ID, questionId: DYNAMIC_QUESTION.id, choicesJson: DYNAMIC_CHOICES_JSON };

const ATTEMPT = { id: 'attempt-id-1', studentId: STUDENT_ID, questionId: DYNAMIC_QUESTION.id, sessionId: SESSION.id, score: 1, answers: [] };

beforeEach(() => jest.clearAllMocks());

// ─── Create DYNAMIC question ──────────────────────────────────────────────────

describe('POST /api/questions — DYNAMIC type', () => {
  const url = '/api/questions';
  const validBody = {
    type: 'DYNAMIC',
    content: 'How many protons are in [el(1,18).number]?',
    correctExplanation: 'Carbon has 6 protons.',
    incorrectExplanation: 'Review atomic numbers.',
    difficulty: 3,
    answerExpression: '[1.number]',
  };

  test('201 creates DYNAMIC question without choices', async () => {
    prisma.question.create.mockResolvedValue({ ...DYNAMIC_QUESTION });
    const res = await request(app).post(url).set(teacherAuth()).send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('DYNAMIC');
    expect(prisma.question.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'DYNAMIC', answerExpression: '[1.number]' }),
    }));
  });

  test('400 if answerExpression is missing for DYNAMIC', async () => {
    const res = await request(app).post(url).set(teacherAuth()).send({ ...validBody, answerExpression: undefined });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/answerExpression/);
  });

  test('400 if validateTemplate returns an error', async () => {
    const { validateTemplate } = require('../../lib/questionTemplate');
    validateTemplate.mockReturnValueOnce('Invalid bracket syntax');
    const res = await request(app).post(url).set(teacherAuth()).send(validBody);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid bracket syntax/);
  });

  test('400 if distractorCount is out of range', async () => {
    const res = await request(app).post(url).set(teacherAuth()).send({ ...validBody, distractorCount: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/distractorCount/);
  });
});

// ─── GET section questions with DYNAMIC ──────────────────────────────────────

describe('GET /api/sections/:sectionId/questions — DYNAMIC questions', () => {
  const url = `/api/sections/${SECTION.id}/questions`;

  function mockChain() {
    prisma.section.findUnique.mockResolvedValue(SECTION);
    prisma.chapter.findUnique.mockResolvedValue(CHAPTER);
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.studentCourse.findUnique.mockResolvedValue(ENROLLMENT);
    prisma.question.findMany.mockResolvedValue([DYNAMIC_QUESTION]);
    prisma.questionResolution.upsert.mockResolvedValue({});
  }

  test('200 returns resolved content for DYNAMIC question', async () => {
    mockChain();
    const res = await request(app).get(url).set(studentAuth());
    expect(res.status).toBe(200);
    expect(res.body[0].content).toBe('How many protons are in Carbon?');
  });

  test('DYNAMIC choices do not include isCorrect field', async () => {
    mockChain();
    const res = await request(app).get(url).set(studentAuth());
    expect(res.status).toBe(200);
    const choices = res.body[0].choices;
    expect(choices.length).toBeGreaterThan(0);
    choices.forEach(c => expect(c).not.toHaveProperty('isCorrect'));
  });

  test('upserts a QuestionResolution for each DYNAMIC question', async () => {
    mockChain();
    await request(app).get(url).set(studentAuth());
    expect(prisma.questionResolution.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId_questionId: { studentId: STUDENT_ID, questionId: DYNAMIC_QUESTION.id } },
    }));
  });
});

// ─── POST attempt — DYNAMIC ───────────────────────────────────────────────────

describe('POST /api/questions/:questionId/attempt — DYNAMIC', () => {
  const url = `/api/questions/${DYNAMIC_QUESTION.id}/attempt`;

  function mockChain(overrides = {}) {
    prisma.question.findUnique.mockResolvedValue(DYNAMIC_QUESTION);
    prisma.session.findUnique.mockResolvedValue(SESSION);
    prisma.section.findMany.mockResolvedValue([{ ...SECTION, chapter: CHAPTER }]);
    prisma.studentCourse.findUnique.mockResolvedValue(ENROLLMENT);
    prisma.questionResolution.findUnique.mockResolvedValue(overrides.resolution !== undefined ? overrides.resolution : RESOLUTION);
    prisma.questionAttempt.create.mockResolvedValue(overrides.attempt ?? ATTEMPT);
    prisma.session.update.mockResolvedValue({});
  }

  test('201 with isCorrect true when correct choiceId submitted', async () => {
    mockChain();
    const res = await request(app).post(url).set(studentAuth()).send({ sessionId: SESSION.id, choiceIds: ['dyn-1'] });
    expect(res.status).toBe(201);
    expect(res.body.isCorrect).toBe(true);
    expect(res.body.xpDelta).toBe(DYNAMIC_QUESTION.difficulty * 10);
    expect(res.body.explanation).toBe(DYNAMIC_QUESTION.correctExplanation);
  });

  test('201 with isCorrect false when wrong choiceId submitted', async () => {
    mockChain({ attempt: { ...ATTEMPT, score: 0 } });
    const res = await request(app).post(url).set(studentAuth()).send({ sessionId: SESSION.id, choiceIds: ['dyn-2'] });
    expect(res.status).toBe(201);
    expect(res.body.isCorrect).toBe(false);
    expect(res.body.xpDelta).toBe(0);
    expect(res.body.explanation).toBe(DYNAMIC_QUESTION.incorrectExplanation);
  });

  test('creates QuestionAttempt with correct score', async () => {
    mockChain();
    await request(app).post(url).set(studentAuth()).send({ sessionId: SESSION.id, choiceIds: ['dyn-1'] });
    expect(prisma.questionAttempt.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ score: 1, studentId: STUDENT_ID, questionId: DYNAMIC_QUESTION.id }),
    }));
  });

  test('does not create AttemptAnswer records for DYNAMIC questions', async () => {
    mockChain();
    await request(app).post(url).set(studentAuth()).send({ sessionId: SESSION.id, choiceIds: ['dyn-1'] });
    const createCall = prisma.questionAttempt.create.mock.calls[0][0];
    expect(createCall.data).not.toHaveProperty('answers');
  });

  test('400 if no QuestionResolution exists for this student+question', async () => {
    mockChain({ resolution: null });
    const res = await request(app).post(url).set(studentAuth()).send({ sessionId: SESSION.id, choiceIds: ['dyn-1'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/resolution/i);
  });

  test('400 if choiceId is not in the resolution choices', async () => {
    mockChain();
    const res = await request(app).post(url).set(studentAuth()).send({ sessionId: SESSION.id, choiceIds: ['unknown-choice'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/does not belong/);
  });

  test('400 if more than one choiceId is submitted for DYNAMIC question', async () => {
    mockChain();
    const res = await request(app).post(url).set(studentAuth()).send({ sessionId: SESSION.id, choiceIds: ['dyn-1', 'dyn-2'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exactly one/);
  });
});
