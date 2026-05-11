const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');

jest.mock('../../lib/prisma', () => ({
  course: { findUnique: jest.fn() },
  reward: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
}));

const prisma = require('../../lib/prisma');

process.env.JWT_SECRET = 'test_secret';

const TEACHER_ID = 'teacher-id-1';
const OTHER_TEACHER_ID = 'teacher-id-2';
const STUDENT_ID = 'student-id-1';

function token(role, id) {
  return jwt.sign({ sub: id, role }, process.env.JWT_SECRET);
}

const COURSE = { id: 'course-id-1', name: 'Gen Chem I', teacherId: TEACHER_ID };
const REWARD = { id: 'reward-id-1', courseId: COURSE.id, name: 'Free Homework Pass', redemptionLimit: 5 };

// ─── POST /api/courses/:courseId/rewards ──────────────────────────────────────

describe('POST /api/courses/:courseId/rewards', () => {
  test('401 if no token', async () => {
    const res = await request(app).post(`/api/courses/${COURSE.id}/rewards`).send({ name: 'Pass', redemptionLimit: 3 });
    expect(res.status).toBe(401);
  });

  test('403 if requester is a STUDENT', async () => {
    const res = await request(app)
      .post(`/api/courses/${COURSE.id}/rewards`)
      .set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`)
      .send({ name: 'Pass', redemptionLimit: 3 });
    expect(res.status).toBe(403);
  });

  test('400 if name is missing', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    const res = await request(app)
      .post(`/api/courses/${COURSE.id}/rewards`)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`)
      .send({ redemptionLimit: 3 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/);
  });

  test('400 if redemptionLimit is missing', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    const res = await request(app)
      .post(`/api/courses/${COURSE.id}/rewards`)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`)
      .send({ name: 'Pass' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/redemptionLimit/);
  });

  test('400 if redemptionLimit is zero', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    const res = await request(app)
      .post(`/api/courses/${COURSE.id}/rewards`)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`)
      .send({ name: 'Pass', redemptionLimit: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/redemptionLimit/);
  });

  test('404 if course not found', async () => {
    prisma.course.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post(`/api/courses/nonexistent/rewards`)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`)
      .send({ name: 'Pass', redemptionLimit: 3 });
    expect(res.status).toBe(404);
  });

  test('403 if teacher does not own course', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    const res = await request(app)
      .post(`/api/courses/${COURSE.id}/rewards`)
      .set('Authorization', `Bearer ${token('TEACHER', OTHER_TEACHER_ID)}`)
      .send({ name: 'Pass', redemptionLimit: 3 });
    expect(res.status).toBe(403);
  });

  test('201 creates reward', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.reward.create.mockResolvedValue(REWARD);
    const res = await request(app)
      .post(`/api/courses/${COURSE.id}/rewards`)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`)
      .send({ name: 'Free Homework Pass', redemptionLimit: 5 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Free Homework Pass');
  });
});

// ─── GET /api/courses/:courseId/rewards ───────────────────────────────────────

describe('GET /api/courses/:courseId/rewards', () => {
  test('401 if no token', async () => {
    const res = await request(app).get(`/api/courses/${COURSE.id}/rewards`);
    expect(res.status).toBe(401);
  });

  test('403 if requester is a STUDENT', async () => {
    const res = await request(app)
      .get(`/api/courses/${COURSE.id}/rewards`)
      .set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(403);
  });

  test('404 if course not found', async () => {
    prisma.course.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .get(`/api/courses/nonexistent/rewards`)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(404);
  });

  test('403 if teacher does not own course', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    const res = await request(app)
      .get(`/api/courses/${COURSE.id}/rewards`)
      .set('Authorization', `Bearer ${token('TEACHER', OTHER_TEACHER_ID)}`);
    expect(res.status).toBe(403);
  });

  test('200 returns rewards with redemptionCount', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.reward.findMany.mockResolvedValue([
      { ...REWARD, _count: { students: 2 } },
    ]);
    const res = await request(app)
      .get(`/api/courses/${COURSE.id}/rewards`)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(200);
    expect(res.body[0].redemptionCount).toBe(2);
    expect(res.body[0]._count).toBeUndefined();
  });
});

// ─── DELETE /api/rewards/:rewardId ────────────────────────────────────────────

describe('DELETE /api/rewards/:rewardId', () => {
  test('401 if no token', async () => {
    const res = await request(app).delete(`/api/rewards/${REWARD.id}`);
    expect(res.status).toBe(401);
  });

  test('403 if requester is a STUDENT', async () => {
    const res = await request(app)
      .delete(`/api/rewards/${REWARD.id}`)
      .set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(403);
  });

  test('404 if reward not found', async () => {
    prisma.reward.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .delete(`/api/rewards/nonexistent`)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(404);
  });

  test('403 if teacher does not own the course', async () => {
    prisma.reward.findUnique.mockResolvedValue(REWARD);
    prisma.course.findUnique.mockResolvedValue(COURSE);
    const res = await request(app)
      .delete(`/api/rewards/${REWARD.id}`)
      .set('Authorization', `Bearer ${token('TEACHER', OTHER_TEACHER_ID)}`);
    expect(res.status).toBe(403);
  });

  test('204 deletes reward', async () => {
    prisma.reward.findUnique.mockResolvedValue(REWARD);
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.reward.delete.mockResolvedValue(REWARD);
    const res = await request(app)
      .delete(`/api/rewards/${REWARD.id}`)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(204);
  });
});
