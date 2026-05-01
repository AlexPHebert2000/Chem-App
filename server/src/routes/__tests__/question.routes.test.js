const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');

jest.mock('../../lib/prisma', () => ({
  question: { findUnique: jest.fn() },
  session: { findUnique: jest.fn(), update: jest.fn() },
  section: { findUnique: jest.fn() },
  chapter: { findUnique: jest.fn() },
  course: { findUnique: jest.fn() },
  studentCourse: { findUnique: jest.fn() },
  questionAttempt: { create: jest.fn() },
}));

const prisma = require('../../lib/prisma');

process.env.JWT_SECRET = 'test_secret';

const STUDENT_ID = 'student-id-1';
const OTHER_STUDENT_ID = 'student-id-2';
const TEACHER_ID = 'teacher-id-1';

function token(role, id) {
  return jwt.sign({ sub: id, role }, process.env.JWT_SECRET);
}

const COURSE   = { id: 'course-id-1', teacherId: TEACHER_ID };
const CHAPTER  = { id: 'chapter-id-1', courseId: COURSE.id };
const SECTION  = { id: 'section-id-1', chapterId: CHAPTER.id };

const MC_CHOICES = [
  { id: 'choice-id-1', content: '6',  isCorrect: true,  blankIndex: 0 },
  { id: 'choice-id-2', content: '12', isCorrect: false, blankIndex: 0 },
  { id: 'choice-id-3', content: '4',  isCorrect: false, blankIndex: 0 },
];

const FIB_CHOICES = [
  { id: 'choice-id-1', content: '6',  isCorrect: true,  blankIndex: 0 },
  { id: 'choice-id-2', content: '12', isCorrect: false, blankIndex: 0 },
  { id: 'choice-id-3', content: 'C',  isCorrect: true,  blankIndex: 1 },
  { id: 'choice-id-4', content: 'Ca', isCorrect: false, blankIndex: 1 },
];

const MC_QUESTION  = { id: 'question-id-1', sectionId: SECTION.id, type: 'MULTIPLE_CHOICE', difficulty: 3, correctExplanation: 'Carbon has 6 electrons.', incorrectExplanation: 'Review atomic numbers.', choices: MC_CHOICES };
const FIB_QUESTION = { id: 'question-id-2', sectionId: SECTION.id, type: 'FILL_IN_BLANK',   difficulty: 2, correctExplanation: 'Both blanks correct!',   incorrectExplanation: 'Review the blanks.',    choices: FIB_CHOICES };

const SESSION = { id: 'session-id-1', studentId: STUDENT_ID, courseId: COURSE.id, endedAt: null };
const ENROLLMENT = { studentId: STUDENT_ID, courseId: COURSE.id };
const ATTEMPT = { id: 'attempt-id-1', studentId: STUDENT_ID, questionId: MC_QUESTION.id, sessionId: SESSION.id, score: 1, answers: [] };

const url = (qid = MC_QUESTION.id) => `/api/questions/${qid}/attempt`;

function mockChain(question = MC_QUESTION) {
  prisma.question.findUnique.mockResolvedValue(question);
  prisma.session.findUnique.mockResolvedValue(SESSION);
  prisma.section.findUnique.mockResolvedValue(SECTION);
  prisma.chapter.findUnique.mockResolvedValue(CHAPTER);
  prisma.course.findUnique.mockResolvedValue(COURSE);
  prisma.studentCourse.findUnique.mockResolvedValue(ENROLLMENT);
  prisma.questionAttempt.create.mockResolvedValue(ATTEMPT);
  prisma.session.update.mockResolvedValue({});
}

// ─── Auth & role guards ───────────────────────────────────────────────────────

describe('POST /api/questions/:questionId/attempt — guards', () => {
  test('401 if no token', async () => {
    const res = await request(app).post(url()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(401);
  });

  test('403 if requester is a TEACHER', async () => {
    const res = await request(app).post(url()).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(403);
  });
});

// ─── Input validation ─────────────────────────────────────────────────────────

describe('POST /api/questions/:questionId/attempt — input validation', () => {
  const auth = () => ({ Authorization: `Bearer ${token('STUDENT', STUDENT_ID)}` });

  test('400 if sessionId is missing', async () => {
    const res = await request(app).post(url()).set(auth()).send({ choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sessionId/);
  });

  test('400 if choiceIds is missing', async () => {
    const res = await request(app).post(url()).set(auth()).send({ sessionId: SESSION.id });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/choiceIds/);
  });

  test('400 if choiceIds is empty', async () => {
    const res = await request(app).post(url()).set(auth()).send({ sessionId: SESSION.id, choiceIds: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/choiceIds/);
  });
});

// ─── Resource & ownership checks ─────────────────────────────────────────────

describe('POST /api/questions/:questionId/attempt — resource checks', () => {
  const auth = () => ({ Authorization: `Bearer ${token('STUDENT', STUDENT_ID)}` });

  test('404 if question not found', async () => {
    prisma.question.findUnique.mockResolvedValue(null);
    const res = await request(app).post(url()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Question not found/);
  });

  test('404 if session not found', async () => {
    prisma.question.findUnique.mockResolvedValue(MC_QUESTION);
    prisma.session.findUnique.mockResolvedValue(null);
    const res = await request(app).post(url()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Session not found/);
  });

  test('404 if session belongs to a different student', async () => {
    prisma.question.findUnique.mockResolvedValue(MC_QUESTION);
    prisma.session.findUnique.mockResolvedValue({ ...SESSION, studentId: OTHER_STUDENT_ID });
    const res = await request(app).post(url()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(404);
  });

  test('409 if session has already ended', async () => {
    prisma.question.findUnique.mockResolvedValue(MC_QUESTION);
    prisma.session.findUnique.mockResolvedValue({ ...SESSION, endedAt: new Date() });
    const res = await request(app).post(url()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/ended/);
  });

  test('403 if question does not belong to the session course', async () => {
    prisma.question.findUnique.mockResolvedValue(MC_QUESTION);
    prisma.session.findUnique.mockResolvedValue(SESSION);
    prisma.section.findUnique.mockResolvedValue(SECTION);
    prisma.chapter.findUnique.mockResolvedValue({ ...CHAPTER, courseId: 'other-course-id' });
    const res = await request(app).post(url()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/does not belong/);
  });

  test('403 if student is not enrolled in the course', async () => {
    prisma.question.findUnique.mockResolvedValue(MC_QUESTION);
    prisma.session.findUnique.mockResolvedValue(SESSION);
    prisma.section.findUnique.mockResolvedValue(SECTION);
    prisma.chapter.findUnique.mockResolvedValue(CHAPTER);
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.studentCourse.findUnique.mockResolvedValue(null);
    const res = await request(app).post(url()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Not enrolled/);
  });

  test('400 if a choiceId does not belong to the question', async () => {
    mockChain();
    const res = await request(app).post(url()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['wrong-choice-id'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/does not belong/);
  });
});

// ─── Multiple choice submission validation ────────────────────────────────────

describe('POST /api/questions/:questionId/attempt — MULTIPLE_CHOICE submission', () => {
  const auth = () => ({ Authorization: `Bearer ${token('STUDENT', STUDENT_ID)}` });

  test('400 if more than one choice is submitted', async () => {
    mockChain();
    const res = await request(app).post(url()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1', 'choice-id-2'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exactly one/);
  });

  test('201 with score 1 for correct answer', async () => {
    mockChain();
    const res = await request(app).post(url()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(201);
    expect(prisma.questionAttempt.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ score: 1 }),
    }));
  });

  test('201 with score 0 for wrong answer', async () => {
    mockChain();
    prisma.questionAttempt.create.mockResolvedValue({ ...ATTEMPT, score: 0 });
    const res = await request(app).post(url()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-2'] });
    expect(res.status).toBe(201);
    expect(prisma.questionAttempt.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ score: 0 }),
    }));
  });

  test('calls recordActivity with xpDelta on success', async () => {
    mockChain();
    await request(app).post(url()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(prisma.session.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: SESSION.id },
      data: expect.objectContaining({ questionsAnswered: { increment: 1 } }),
    }));
  });

  test('returns enriched response with isCorrect, explanation, and xpDelta', async () => {
    mockChain();
    const res = await request(app).post(url()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(201);
    expect(res.body.isCorrect).toBe(true);
    expect(res.body.explanation).toBe(MC_QUESTION.correctExplanation);
    expect(res.body.xpDelta).toBe(MC_QUESTION.difficulty * 10);
    expect(res.body.attempt).toBeDefined();
  });

  test('returns xpDelta 0 and incorrectExplanation for wrong answer', async () => {
    mockChain();
    prisma.questionAttempt.create.mockResolvedValue({ ...ATTEMPT, score: 0 });
    const res = await request(app).post(url()).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-2'] });
    expect(res.status).toBe(201);
    expect(res.body.isCorrect).toBe(false);
    expect(res.body.explanation).toBe(MC_QUESTION.incorrectExplanation);
    expect(res.body.xpDelta).toBe(0);
  });
});

// ─── Fill-in-the-blank submission validation ──────────────────────────────────

describe('POST /api/questions/:questionId/attempt — FILL_IN_BLANK submission', () => {
  const auth = () => ({ Authorization: `Bearer ${token('STUDENT', STUDENT_ID)}` });

  test('400 if not all blanks are answered', async () => {
    mockChain(FIB_QUESTION);
    const res = await request(app).post(url(FIB_QUESTION.id)).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/blanks/);
  });

  test('400 if more than one answer submitted for a blank', async () => {
    mockChain(FIB_QUESTION);
    const res = await request(app).post(url(FIB_QUESTION.id)).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1', 'choice-id-2', 'choice-id-3'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/duplicate/);
  });

  test('201 with score equal to number of correct blanks', async () => {
    mockChain(FIB_QUESTION);
    const fibAttempt = { ...ATTEMPT, score: 2 };
    prisma.questionAttempt.create.mockResolvedValue(fibAttempt);
    const res = await request(app).post(url(FIB_QUESTION.id)).set(auth()).send({ sessionId: SESSION.id, choiceIds: ['choice-id-1', 'choice-id-3'] });
    expect(res.status).toBe(201);
    expect(prisma.questionAttempt.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ score: 2 }),
    }));
  });
});
