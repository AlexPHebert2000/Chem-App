const request = require('supertest');
const app = require('../../app');

jest.mock('../../lib/prisma', () => ({
  teacher: { findUnique: jest.fn(), create: jest.fn() },
  student: { findUnique: jest.fn(), create: jest.fn() },
  studentCourse: { findUnique: jest.fn() },
  authSession: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}));

// Mock crypto so we can predict the generated session token
jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    randomBytes: jest.fn(() => Buffer.from('a'.repeat(32))),
  };
});

const prisma = require('../../lib/prisma');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = 'test_secret';
process.env.JWT_EXPIRES_IN = '15m';

const STUDENT = { id: 'student-id-1', email: 'student@test.com', name: 'Test Student', password: 'hashed_password' };
const TEACHER = { id: 'teacher-id-1', email: 'teacher@test.com', name: 'Test Teacher', password: 'hashed_password' };

const FUTURE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const AUTH_SESSION = { id: 'auth-session-id-1', token: 'hashed_token', userId: STUDENT.id, userRole: 'STUDENT', expiresAt: FUTURE };

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

  test('200 without sessionToken when stayLoggedIn is false', async () => {
    prisma.student.findUnique.mockResolvedValue(STUDENT);
    bcrypt.compare.mockResolvedValue(true);
    prisma.studentCourse.findUnique.mockResolvedValue({ studentId: STUDENT.id, courseId: 'course-id-1' });
    const res = await request(app).post('/api/auth/login').send({ role: 'STUDENT', email: STUDENT.email, password: 'password123', courseId: 'course-id-1', stayLoggedIn: false });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.sessionToken).toBeUndefined();
    expect(prisma.authSession.create).not.toHaveBeenCalled();
  });

  test('200 with sessionToken when stayLoggedIn is true (STUDENT)', async () => {
    prisma.student.findUnique.mockResolvedValue(STUDENT);
    bcrypt.compare.mockResolvedValue(true);
    prisma.studentCourse.findUnique.mockResolvedValue({ studentId: STUDENT.id, courseId: 'course-id-1' });
    prisma.authSession.create.mockResolvedValue(AUTH_SESSION);
    const res = await request(app).post('/api/auth/login').send({ role: 'STUDENT', email: STUDENT.email, password: 'password123', courseId: 'course-id-1', stayLoggedIn: true });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.sessionToken).toBeDefined();
    expect(prisma.authSession.create).toHaveBeenCalled();
  });

  test('200 with sessionToken when stayLoggedIn is true (TEACHER)', async () => {
    prisma.teacher.findUnique.mockResolvedValue(TEACHER);
    bcrypt.compare.mockResolvedValue(true);
    prisma.authSession.create.mockResolvedValue({ ...AUTH_SESSION, userId: TEACHER.id, userRole: 'TEACHER' });
    const res = await request(app).post('/api/auth/login').send({ role: 'TEACHER', email: TEACHER.email, password: 'password123', stayLoggedIn: true });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.sessionToken).toBeDefined();
    expect(prisma.authSession.create).toHaveBeenCalled();
  });

  test('200 without sessionToken when stayLoggedIn is omitted (TEACHER)', async () => {
    prisma.teacher.findUnique.mockResolvedValue(TEACHER);
    bcrypt.compare.mockResolvedValue(true);
    const res = await request(app).post('/api/auth/login').send({ role: 'TEACHER', email: TEACHER.email, password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.sessionToken).toBeUndefined();
    expect(prisma.authSession.create).not.toHaveBeenCalled();
  });
});

// ─── Refresh ──────────────────────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
  test('400 if sessionToken is missing', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sessionToken/);
  });

  test('401 if auth session not found', async () => {
    prisma.authSession.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/api/auth/refresh').send({ sessionToken: 'invalid_token' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('SESSION_EXPIRED');
  });

  test('401 if auth session is expired', async () => {
    prisma.authSession.findUnique.mockResolvedValue({ ...AUTH_SESSION, expiresAt: new Date(Date.now() - 1000) });
    prisma.authSession.delete.mockResolvedValue({});
    const res = await request(app).post('/api/auth/refresh').send({ sessionToken: 'expired_token' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('SESSION_EXPIRED');
  });

  test('401 if user no longer exists', async () => {
    prisma.authSession.findUnique.mockResolvedValue(AUTH_SESSION);
    prisma.authSession.update.mockResolvedValue(AUTH_SESSION);
    prisma.student.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/api/auth/refresh').send({ sessionToken: 'valid_token' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('SESSION_EXPIRED');
  });

  test('200 returns new JWT and user for valid STUDENT session', async () => {
    const { password: _, ...studentNoPass } = STUDENT;
    prisma.authSession.findUnique.mockResolvedValue(AUTH_SESSION);
    prisma.authSession.update.mockResolvedValue(AUTH_SESSION);
    prisma.student.findUnique.mockResolvedValue(studentNoPass);
    const res = await request(app).post('/api/auth/refresh').send({ sessionToken: 'valid_token' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({ email: STUDENT.email, role: 'STUDENT' });
    expect(res.body.user.password).toBeUndefined();
  });

  test('200 returns new JWT and user for valid TEACHER session', async () => {
    const { password: _, ...teacherNoPass } = TEACHER;
    const teacherSession = { ...AUTH_SESSION, userId: TEACHER.id, userRole: 'TEACHER' };
    prisma.authSession.findUnique.mockResolvedValue(teacherSession);
    prisma.authSession.update.mockResolvedValue(teacherSession);
    prisma.teacher.findUnique.mockResolvedValue(teacherNoPass);
    const res = await request(app).post('/api/auth/refresh').send({ sessionToken: 'valid_teacher_token' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({ email: TEACHER.email, role: 'TEACHER' });
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

  test('200 without sessionToken — JWT-only session logout', async () => {
    const token = loginAs('TEACHER', TEACHER.id);
    const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(200);
    expect(prisma.authSession.deleteMany).not.toHaveBeenCalled();
  });

  test('200 and deletes auth session when sessionToken provided (TEACHER)', async () => {
    prisma.authSession.deleteMany.mockResolvedValue({ count: 1 });
    const token = loginAs('TEACHER', TEACHER.id);
    const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`).send({ sessionToken: 'some_session_token' });
    expect(res.status).toBe(200);
    expect(prisma.authSession.deleteMany).toHaveBeenCalled();
  });

  test('200 and deletes auth session when sessionToken provided (STUDENT)', async () => {
    prisma.authSession.deleteMany.mockResolvedValue({ count: 1 });
    const token = loginAs('STUDENT', STUDENT.id);
    const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`).send({ sessionToken: 'some_session_token' });
    expect(res.status).toBe(200);
    expect(prisma.authSession.deleteMany).toHaveBeenCalled();
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
