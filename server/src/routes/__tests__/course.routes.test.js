const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');

jest.mock('../../lib/prisma', () => ({
  course: { create: jest.fn(), findUnique: jest.fn() },
  studentCourse: { create: jest.fn(), findUnique: jest.fn() },
  joinRequest: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
}));

const prisma = require('../../lib/prisma');

process.env.JWT_SECRET = 'test_secret';

const TEACHER_ID = 'teacher-id-1';
const OTHER_TEACHER_ID = 'teacher-id-2';
const STUDENT_ID = 'student-id-1';

function token(role, id) {
  return jwt.sign({ sub: id, role }, process.env.JWT_SECRET);
}

const COURSE = { id: 'course-id-1', name: 'General Chemistry I', teacherId: TEACHER_ID };
const JOIN_REQUEST = { id: 'request-id-1', studentId: STUDENT_ID, courseId: COURSE.id, status: 'PENDING' };
const ENROLLMENT = { id: 'enrollment-id-1', studentId: STUDENT_ID, courseId: COURSE.id, currentPoints: 0, lifetimePoints: 0, streak: 0 };

// ─── Create course ────────────────────────────────────────────────────────────

describe('POST /api/courses', () => {
  test('401 if no token provided', async () => {
    const res = await request(app).post('/api/courses').send({ name: 'Gen Chem' });
    expect(res.status).toBe(401);
  });

  test('403 if requester is a STUDENT', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`)
      .send({ name: 'Gen Chem' });
    expect(res.status).toBe(403);
  });

  test('400 if name is missing', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/);
  });

  test('400 if name is blank', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`)
      .send({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/);
  });

  test('201 with created course on success', async () => {
    prisma.course.create.mockResolvedValue(COURSE);
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`)
      .send({ name: 'General Chemistry I' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: COURSE.name, teacherId: TEACHER_ID });
  });
});

// ─── Request to join ─────────────────────────────────────────────────────────

describe('POST /api/courses/:courseId/join-requests', () => {
  test('401 if no token', async () => {
    const res = await request(app).post(`/api/courses/${COURSE.id}/join-requests`);
    expect(res.status).toBe(401);
  });

  test('403 if requester is a TEACHER', async () => {
    const res = await request(app)
      .post(`/api/courses/${COURSE.id}/join-requests`)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(403);
  });

  test('404 if course not found', async () => {
    prisma.course.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post(`/api/courses/${COURSE.id}/join-requests`)
      .set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Course not found/);
  });

  test('409 if student is already enrolled', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.studentCourse.findUnique.mockResolvedValue(ENROLLMENT);
    const res = await request(app)
      .post(`/api/courses/${COURSE.id}/join-requests`)
      .set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Already enrolled/);
  });

  test('409 if join request already submitted', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.studentCourse.findUnique.mockResolvedValue(null);
    prisma.joinRequest.findUnique.mockResolvedValue(JOIN_REQUEST);
    const res = await request(app)
      .post(`/api/courses/${COURSE.id}/join-requests`)
      .set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already submitted/);
  });

  test('201 with join request on success', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.studentCourse.findUnique.mockResolvedValue(null);
    prisma.joinRequest.findUnique.mockResolvedValue(null);
    prisma.joinRequest.create.mockResolvedValue(JOIN_REQUEST);
    const res = await request(app)
      .post(`/api/courses/${COURSE.id}/join-requests`)
      .set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ studentId: STUDENT_ID, courseId: COURSE.id, status: 'PENDING' });
  });
});

// ─── Approve join request ─────────────────────────────────────────────────────

describe('POST /api/courses/:courseId/join-requests/:requestId/approve', () => {
  const url = `/api/courses/${COURSE.id}/join-requests/${JOIN_REQUEST.id}/approve`;

  test('401 if no token', async () => {
    const res = await request(app).post(url);
    expect(res.status).toBe(401);
  });

  test('403 if requester is a STUDENT', async () => {
    const res = await request(app)
      .post(url)
      .set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(403);
  });

  test('404 if course not found', async () => {
    prisma.course.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post(url)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Course not found/);
  });

  test('403 if teacher does not own the course', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    const res = await request(app)
      .post(url)
      .set('Authorization', `Bearer ${token('TEACHER', OTHER_TEACHER_ID)}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/do not own/);
  });

  test('404 if join request not found', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.joinRequest.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post(url)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Join request not found/);
  });

  test('409 if join request is already approved', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.joinRequest.findUnique.mockResolvedValue({ ...JOIN_REQUEST, status: 'APPROVED' });
    const res = await request(app)
      .post(url)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already approved/);
  });

  test('201 with enrollment on success', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.joinRequest.findUnique.mockResolvedValue(JOIN_REQUEST);
    prisma.joinRequest.update.mockResolvedValue({ ...JOIN_REQUEST, status: 'APPROVED' });
    prisma.studentCourse.create.mockResolvedValue(ENROLLMENT);
    const res = await request(app)
      .post(url)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ studentId: STUDENT_ID, courseId: COURSE.id });
    expect(prisma.joinRequest.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: JOIN_REQUEST.id },
      data: { status: 'APPROVED' },
    }));
    expect(prisma.studentCourse.create).toHaveBeenCalledWith({
      data: { studentId: STUDENT_ID, courseId: COURSE.id },
    });
  });
});

// ─── Get pending join requests ────────────────────────────────────────────────

describe('GET /api/courses/:courseId/join-requests', () => {
  const url = `/api/courses/${COURSE.id}/join-requests`;
  const STUDENT = { id: STUDENT_ID, name: 'Test Student', email: 'student@test.com' };
  const requestWithStudent = { ...JOIN_REQUEST, student: STUDENT };

  test('401 if no token', async () => {
    const res = await request(app).get(url);
    expect(res.status).toBe(401);
  });

  test('403 if requester is a STUDENT', async () => {
    const res = await request(app)
      .get(url)
      .set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(403);
  });

  test('404 if course not found', async () => {
    prisma.course.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .get(url)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Course not found/);
  });

  test('403 if teacher does not own the course', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    const res = await request(app)
      .get(url)
      .set('Authorization', `Bearer ${token('TEACHER', OTHER_TEACHER_ID)}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/do not own/);
  });

  test('200 with list of pending requests including student info', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.joinRequest.findMany.mockResolvedValue([requestWithStudent]);
    const res = await request(app)
      .get(url)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ status: 'PENDING', student: { id: STUDENT_ID } });
    expect(prisma.joinRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { courseId: COURSE.id, status: 'PENDING' },
    }));
  });

  test('200 with empty list when no pending requests', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.joinRequest.findMany.mockResolvedValue([]);
    const res = await request(app)
      .get(url)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
