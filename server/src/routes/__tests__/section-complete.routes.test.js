const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');

jest.mock('../../lib/prisma', () => ({
  section:         { findUnique: jest.fn(), findFirst: jest.fn() },
  chapter:         { findUnique: jest.fn(), findFirst: jest.fn() },
  studentCourse:   { findUnique: jest.fn(), update: jest.fn() },
  studentSection:  { findUnique: jest.fn(), upsert: jest.fn() },
  question:        { findMany: jest.fn() },
  questionAttempt: { findMany: jest.fn() },
}));

const prisma = require('../../lib/prisma');

process.env.JWT_SECRET = 'test_secret';

const STUDENT_ID  = 'student-id-1';
const TEACHER_ID  = 'teacher-id-1';

function token(role, id) {
  return jwt.sign({ sub: id, role }, process.env.JWT_SECRET);
}

const COURSE      = { id: 'course-id-1' };
const CHAPTER     = { id: 'chapter-id-1', courseId: COURSE.id, orderIndex: 0 };
const SECTION     = { id: 'section-id-1', chapterId: CHAPTER.id, orderIndex: 0 };
const SECTION2    = { id: 'section-id-2', chapterId: CHAPTER.id, orderIndex: 1 };
const ENROLLMENT  = { studentId: STUDENT_ID, courseId: COURSE.id, currentPoints: 30, lifetimePoints: 30 };

const QUESTIONS = [
  { id: 'q-1', difficulty: 3, type: 'MULTIPLE_CHOICE', choices: [{ blankIndex: 0 }, { blankIndex: 0 }] },
  { id: 'q-2', difficulty: 2, type: 'FILL_IN_BLANK',   choices: [{ blankIndex: 0 }, { blankIndex: 0 }, { blankIndex: 1 }, { blankIndex: 1 }] },
];

const ATTEMPTS_ALL_CORRECT = [
  { questionId: 'q-1', score: 1, attemptedAt: new Date('2026-05-01T10:00:00Z') },
  { questionId: 'q-2', score: 2, attemptedAt: new Date('2026-05-01T10:05:00Z') },
];

const STUDENT_SECTION = { id: 'ss-1', studentId: STUDENT_ID, sectionId: SECTION.id, completedAt: new Date(), score: 100 };

const url = (sid = SECTION.id) => `/api/sections/${sid}/complete`;

function mockChain({ attempts = ATTEMPTS_ALL_CORRECT, existingStudentSection = null, nextSection = SECTION2 } = {}) {
  prisma.section.findUnique.mockResolvedValue(SECTION);
  prisma.chapter.findUnique.mockResolvedValue(CHAPTER);
  prisma.studentCourse.findUnique.mockResolvedValue(ENROLLMENT);
  prisma.studentSection.findUnique.mockResolvedValue(existingStudentSection);
  prisma.question.findMany.mockResolvedValue(QUESTIONS);
  prisma.questionAttempt.findMany.mockResolvedValue(attempts);
  prisma.studentSection.upsert.mockResolvedValue(STUDENT_SECTION);
  prisma.section.findFirst.mockResolvedValue(nextSection);
  prisma.chapter.findFirst.mockResolvedValue(null);
  prisma.studentCourse.update.mockResolvedValue({ ...ENROLLMENT, currentPoints: 80, lifetimePoints: 80 });
}

// ─── Auth & role guards ───────────────────────────────────────────────────────

describe('POST /api/sections/:sectionId/complete — guards', () => {
  test('401 if no token', async () => {
    const res = await request(app).post(url()).send();
    expect(res.status).toBe(401);
  });

  test('403 if requester is a TEACHER', async () => {
    const res = await request(app).post(url()).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send();
    expect(res.status).toBe(403);
  });
});

// ─── Resource checks ──────────────────────────────────────────────────────────

describe('POST /api/sections/:sectionId/complete — resource checks', () => {
  const auth = () => ({ Authorization: `Bearer ${token('STUDENT', STUDENT_ID)}` });

  test('404 if section not found', async () => {
    prisma.section.findUnique.mockResolvedValue(null);
    const res = await request(app).post(url()).set(auth()).send();
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Section not found/);
  });

  test('403 if not enrolled', async () => {
    prisma.section.findUnique.mockResolvedValue(SECTION);
    prisma.chapter.findUnique.mockResolvedValue(CHAPTER);
    prisma.studentCourse.findUnique.mockResolvedValue(null);
    const res = await request(app).post(url()).set(auth()).send();
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Not enrolled/);
  });

  test('409 if section already completed', async () => {
    mockChain({ existingStudentSection: { ...STUDENT_SECTION } });
    const res = await request(app).post(url()).set(auth()).send();
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already completed/);
  });
});

// ─── Success ─────────────────────────────────────────────────────────────────

describe('POST /api/sections/:sectionId/complete — success', () => {
  const auth = () => ({ Authorization: `Bearer ${token('STUDENT', STUDENT_ID)}` });

  test('200 with xpEarned, nextSectionId, currentPoints, studentSection', async () => {
    mockChain();
    const res = await request(app).post(url()).set(auth()).send();
    expect(res.status).toBe(200);
    expect(res.body.xpEarned).toBe(50);      // q-1: 3*10=30, q-2: 2*10=20
    expect(res.body.nextSectionId).toBe(SECTION2.id);
    expect(res.body.currentPoints).toBeDefined();
    expect(res.body.studentSection).toBeDefined();
  });

  test('xpEarned is 0 when no attempts exist', async () => {
    mockChain({ attempts: [] });
    const res = await request(app).post(url()).set(auth()).send();
    expect(res.status).toBe(200);
    expect(res.body.xpEarned).toBe(0);
  });

  test('nextSectionId is null when no next section exists', async () => {
    mockChain({ nextSection: null });
    const res = await request(app).post(url()).set(auth()).send();
    expect(res.status).toBe(200);
    expect(res.body.nextSectionId).toBeNull();
  });

  test('updates StudentCourse with xpEarned and nextSectionId', async () => {
    mockChain();
    await request(app).post(url()).set(auth()).send();
    expect(prisma.studentCourse.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        currentPoints: { increment: 50 },
        lifetimePoints: { increment: 50 },
        currentSectionId: SECTION2.id,
      }),
    }));
  });

  test('partial credit: only correct questions contribute XP', async () => {
    mockChain({ attempts: [
      { questionId: 'q-1', score: 1, attemptedAt: new Date() }, // correct
      { questionId: 'q-2', score: 1, attemptedAt: new Date() }, // wrong (maxScore=2, got 1)
    ]});
    const res = await request(app).post(url()).set(auth()).send();
    expect(res.status).toBe(200);
    expect(res.body.xpEarned).toBe(30); // only q-1: 3*10
  });
});
