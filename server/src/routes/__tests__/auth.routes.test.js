const request = require('supertest');
const app = require('../../app');

jest.mock('../../lib/prisma', () => ({
  teacher: { findUnique: jest.fn(), create: jest.fn() },
  student: { findUnique: jest.fn(), create: jest.fn() },
  studentCourse: { findUnique: jest.fn() },
  session: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}));

const prisma = require('../../lib/prisma');
const bcrypt = require('bcryptjs');

// Stable JWT secret for tests
process.env.JWT_SECRET = 'test_secret';
process.env.JWT_EXPIRES_IN = '15m';

const STUDENT = { id: 'student-id-1', email: 'student@test.com', name: 'Test Student', password: 'hashed_password' };
const TEACHER = { id: 'teacher-id-1', email: 'teacher@test.com', name: 'Test Teacher', password: 'hashed_password' };
const SESSION = { id: 'session-id-1', studentId: STUDENT.id, courseId: 'course-id-1', startedAt: new Date(), endedAt: null };

// ─── Signup ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/signup', () => {
  test('400 if role is missing', async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: 'A', email: 'a@b.com', password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/role/);
  });

  test('400 if role is invalid', async () => {
    const res = await request(app).post('/api/auth/signup').send({ role: 'ADMIN', name: 'A', email: 'a@b.com', password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/role/);
  });

  test('400 if name is missing', async () => {
    const res = await request(app).post('/api/auth/signup').send({ role: 'STUDENT', email: 'a@b.com', password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/);
  });

  test('400 if email is invalid', async () => {
    const res = await request(app).post('/api/auth/signup').send({ role: 'STUDENT', name: 'A', email: 'not-an-email', password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/);
  });

  test('400 if password is too short', async () => {
    const res = await request(app).post('/api/auth/signup').send({ role: 'STUDENT', name: 'A', email: 'a@b.com', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password/);
  });

  test('409 if email already in use', async () => {
    prisma.student.findUnique.mockResolvedValue(STUDENT);
    const res = await request(app).post('/api/auth/signup').send({ role: 'STUDENT', name: 'A', email: STUDENT.email, password: 'password123' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already in use/);
  });

  test('201 with token and user on success (STUDENT)', async () => {
    prisma.student.findUnique.mockResolvedValue(null);
    prisma.student.create.mockResolvedValue(STUDENT);
    const res = await request(app).post('/api/auth/signup').send({ role: 'STUDENT', name: STUDENT.name, email: STUDENT.email, password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({ email: STUDENT.email, role: 'STUDENT' });
    expect(res.body.user.password).toBeUndefined();
  });

  test('201 with token and user on success (TEACHER)', async () => {
    prisma.teacher.findUnique.mockResolvedValue(null);
    prisma.teacher.create.mockResolvedValue(TEACHER);
    const res = await request(app).post('/api/auth/signup').send({ role: 'TEACHER', name: TEACHER.name, email: TEACHER.email, password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({ email: TEACHER.email, role: 'TEACHER' });
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  test('400 if role is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/role/);
  });

  test('400 if courseId is missing for STUDENT', async () => {
    const res = await request(app).post('/api/auth/login').send({ role: 'STUDENT', email: STUDENT.email, password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/courseId/);
  });

  test('401 if user not found', async () => {
    prisma.student.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/api/auth/login').send({ role: 'STUDENT', email: 'nobody@test.com', password: 'password123', courseId: 'course-id-1' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid credentials/);
  });

  test('401 if password is wrong', async () => {
    prisma.student.findUnique.mockResolvedValue(STUDENT);
    bcrypt.compare.mockResolvedValue(false);
    const res = await request(app).post('/api/auth/login').send({ role: 'STUDENT', email: STUDENT.email, password: 'wrongpassword', courseId: 'course-id-1' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid credentials/);
  });

  test('403 if student is not enrolled in the course', async () => {
    prisma.student.findUnique.mockResolvedValue(STUDENT);
    bcrypt.compare.mockResolvedValue(true);
    prisma.studentCourse.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/api/auth/login').send({ role: 'STUDENT', email: STUDENT.email, password: 'password123', courseId: 'course-id-1' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not enrolled/);
  });

  test('200 with token, user, and sessionId on successful STUDENT login', async () => {
    prisma.student.findUnique.mockResolvedValue(STUDENT);
    bcrypt.compare.mockResolvedValue(true);
    prisma.studentCourse.findUnique.mockResolvedValue({ studentId: STUDENT.id, courseId: 'course-id-1' });
    prisma.session.create.mockResolvedValue(SESSION);
    const res = await request(app).post('/api/auth/login').send({ role: 'STUDENT', email: STUDENT.email, password: 'password123', courseId: 'course-id-1' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({ email: STUDENT.email, role: 'STUDENT' });
    expect(res.body.sessionId).toBe(SESSION.id);
  });

  test('200 with token and user on successful TEACHER login (no session)', async () => {
    prisma.teacher.findUnique.mockResolvedValue(TEACHER);
    bcrypt.compare.mockResolvedValue(true);
    const res = await request(app).post('/api/auth/login').send({ role: 'TEACHER', email: TEACHER.email, password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({ email: TEACHER.email, role: 'TEACHER' });
    expect(res.body.sessionId).toBeUndefined();
    expect(prisma.session.create).not.toHaveBeenCalled();
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  function loginAs(role, id) {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ sub: id, role }, process.env.JWT_SECRET);
  }

  test('401 if no token provided', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });

  test('400 if sessionId is missing for STUDENT', async () => {
    const token = loginAs('STUDENT', STUDENT.id);
    const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sessionId/);
  });

  test('404 if session not found', async () => {
    prisma.session.findUnique.mockResolvedValue(null);
    const token = loginAs('STUDENT', STUDENT.id);
    const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`).send({ sessionId: 'bad-id' });
    expect(res.status).toBe(404);
  });

  test('404 if session belongs to a different student', async () => {
    prisma.session.findUnique.mockResolvedValue({ ...SESSION, studentId: 'other-student-id' });
    const token = loginAs('STUDENT', STUDENT.id);
    const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`).send({ sessionId: SESSION.id });
    expect(res.status).toBe(404);
  });

  test('200 and sets endedAt on successful STUDENT logout', async () => {
    prisma.session.findUnique.mockResolvedValue(SESSION);
    prisma.session.update.mockResolvedValue({ ...SESSION, endedAt: new Date() });
    const token = loginAs('STUDENT', STUDENT.id);
    const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`).send({ sessionId: SESSION.id });
    expect(res.status).toBe(200);
    expect(prisma.session.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: SESSION.id },
      data: expect.objectContaining({ endedAt: expect.any(Date) }),
    }));
  });

  test('200 for TEACHER logout without session logic', async () => {
    const token = loginAs('TEACHER', TEACHER.id);
    const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(200);
    expect(prisma.session.update).not.toHaveBeenCalled();
  });
});

// ─── Me ───────────────────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  function loginAs(role, id) {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ sub: id, role }, process.env.JWT_SECRET);
  }

  test('401 if no token provided', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('401 if token is invalid', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer bad.token.here');
    expect(res.status).toBe(401);
  });

  test('404 if user no longer exists', async () => {
    prisma.student.findUnique.mockResolvedValue(null);
    const token = loginAs('STUDENT', STUDENT.id);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('200 with user data and role for STUDENT', async () => {
    const { password: _, ...studentWithoutPassword } = STUDENT;
    prisma.student.findUnique.mockResolvedValue(studentWithoutPassword);
    const token = loginAs('STUDENT', STUDENT.id);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: STUDENT.email, role: 'STUDENT' });
    expect(res.body.password).toBeUndefined();
  });

  test('200 with user data and role for TEACHER', async () => {
    const { password: _, ...teacherWithoutPassword } = TEACHER;
    prisma.teacher.findUnique.mockResolvedValue(teacherWithoutPassword);
    const token = loginAs('TEACHER', TEACHER.id);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: TEACHER.email, role: 'TEACHER' });
  });
});
