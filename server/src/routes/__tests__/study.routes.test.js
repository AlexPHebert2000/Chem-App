const request = require('supertest');
const app = require('../../app');

jest.mock('../../lib/prisma', () => ({
  studentCourse: { findUnique: jest.fn() },
  session: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

const prisma = require('../../lib/prisma');

process.env.JWT_SECRET = 'test_secret';

function token(role, id) {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ sub: id, role }, process.env.JWT_SECRET);
}

const STUDENT_TOKEN = token('STUDENT', 'student-id-1');
const TEACHER_TOKEN = token('TEACHER', 'teacher-id-1');

const NOW = new Date();
const OPEN_SESSION = {
  id: 'session-id-1',
  studentId: 'student-id-1',
  courseId: 'course-id-1',
  startedAt: NOW,
  lastActivityAt: NOW,
  endedAt: null,
  questionsAnswered: 0,
  pointsEarned: 0,
};

// ─── POST /api/study/start ────────────────────────────────────────────────────

describe('POST /api/study/start', () => {
  beforeEach(() => jest.clearAllMocks());

  test('401 if no token', async () => {
    const res = await request(app).post('/api/study/start').send({ courseId: 'course-id-1' });
    expect(res.status).toBe(401);
  });

  test('403 if TEACHER tries to start a session', async () => {
    const res = await request(app).post('/api/study/start').set('Authorization', `Bearer ${TEACHER_TOKEN}`).send({ courseId: 'course-id-1' });
    expect(res.status).toBe(403);
  });

  test('400 if courseId is missing', async () => {
    const res = await request(app).post('/api/study/start').set('Authorization', `Bearer ${STUDENT_TOKEN}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/courseId/);
  });

  test('403 if student not enrolled', async () => {
    prisma.studentCourse.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/api/study/start').set('Authorization', `Bearer ${STUDENT_TOKEN}`).send({ courseId: 'course-id-1' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not enrolled/);
  });

  test('200 resumes existing active session', async () => {
    prisma.studentCourse.findUnique.mockResolvedValue({ studentId: 'student-id-1', courseId: 'course-id-1' });
    prisma.session.findFirst.mockResolvedValue(OPEN_SESSION);
    const res = await request(app).post('/api/study/start').set('Authorization', `Bearer ${STUDENT_TOKEN}`).send({ courseId: 'course-id-1' });
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe(OPEN_SESSION.id);
    expect(res.body.isNew).toBe(false);
    expect(prisma.session.create).not.toHaveBeenCalled();
  });

  test('200 creates new session when none exists', async () => {
    prisma.studentCourse.findUnique.mockResolvedValue({ studentId: 'student-id-1', courseId: 'course-id-1' });
    prisma.session.findFirst.mockResolvedValue(null);
    prisma.session.create.mockResolvedValue({ ...OPEN_SESSION, id: 'session-id-new' });
    const res = await request(app).post('/api/study/start').set('Authorization', `Bearer ${STUDENT_TOKEN}`).send({ courseId: 'course-id-1' });
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe('session-id-new');
    expect(res.body.isNew).toBe(true);
  });

  test('200 closes stale session and creates new one when inactive > 1 hour', async () => {
    const staleTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const staleSession = { ...OPEN_SESSION, lastActivityAt: staleTime };
    prisma.studentCourse.findUnique.mockResolvedValue({ studentId: 'student-id-1', courseId: 'course-id-1' });
    prisma.session.findFirst.mockResolvedValue(staleSession);
    prisma.session.update.mockResolvedValue({ ...staleSession, endedAt: new Date() });
    prisma.session.create.mockResolvedValue({ ...OPEN_SESSION, id: 'session-id-new' });
    const res = await request(app).post('/api/study/start').set('Authorization', `Bearer ${STUDENT_TOKEN}`).send({ courseId: 'course-id-1' });
    expect(res.status).toBe(200);
    expect(res.body.isNew).toBe(true);
    expect(prisma.session.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: staleSession.id },
      data: expect.objectContaining({ endedAt: expect.any(Date) }),
    }));
    expect(prisma.session.create).toHaveBeenCalled();
  });
});

// ─── POST /api/study/end ──────────────────────────────────────────────────────

describe('POST /api/study/end', () => {
  beforeEach(() => jest.clearAllMocks());

  test('401 if no token', async () => {
    const res = await request(app).post('/api/study/end').send({ sessionId: 'session-id-1' });
    expect(res.status).toBe(401);
  });

  test('403 if TEACHER tries to end a session', async () => {
    const res = await request(app).post('/api/study/end').set('Authorization', `Bearer ${TEACHER_TOKEN}`).send({ sessionId: 'session-id-1' });
    expect(res.status).toBe(403);
  });

  test('400 if sessionId is missing', async () => {
    const res = await request(app).post('/api/study/end').set('Authorization', `Bearer ${STUDENT_TOKEN}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sessionId/);
  });

  test('404 if session not found', async () => {
    prisma.session.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/api/study/end').set('Authorization', `Bearer ${STUDENT_TOKEN}`).send({ sessionId: 'bad-id' });
    expect(res.status).toBe(404);
  });

  test('404 if session belongs to different student', async () => {
    prisma.session.findUnique.mockResolvedValue({ ...OPEN_SESSION, studentId: 'other-student-id' });
    const res = await request(app).post('/api/study/end').set('Authorization', `Bearer ${STUDENT_TOKEN}`).send({ sessionId: OPEN_SESSION.id });
    expect(res.status).toBe(404);
  });

  test('400 if session already ended', async () => {
    prisma.session.findUnique.mockResolvedValue({ ...OPEN_SESSION, endedAt: new Date() });
    const res = await request(app).post('/api/study/end').set('Authorization', `Bearer ${STUDENT_TOKEN}`).send({ sessionId: OPEN_SESSION.id });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already ended/);
  });

  test('200 and sets endedAt on success', async () => {
    prisma.session.findUnique.mockResolvedValue(OPEN_SESSION);
    prisma.session.update.mockResolvedValue({ ...OPEN_SESSION, endedAt: new Date() });
    const res = await request(app).post('/api/study/end').set('Authorization', `Bearer ${STUDENT_TOKEN}`).send({ sessionId: OPEN_SESSION.id });
    expect(res.status).toBe(200);
    expect(prisma.session.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: OPEN_SESSION.id },
      data: expect.objectContaining({ endedAt: expect.any(Date) }),
    }));
  });
});
