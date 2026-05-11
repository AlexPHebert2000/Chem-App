const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');

jest.mock('../../lib/prisma', () => ({
  course: { findUnique: jest.fn() },
  reward: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
  studentCourse: { findUnique: jest.fn() },
  studentReward: { create: jest.fn(), findUnique: jest.fn(), count: jest.fn(), findMany: jest.fn(), update: jest.fn(), delete: jest.fn() },
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
const ENROLLMENT = { id: 'enroll-id-1', studentId: STUDENT_ID, courseId: COURSE.id };
const REDEMPTION = { id: 'redemption-id-1', studentId: STUDENT_ID, rewardId: REWARD.id, teacherConfirmation: false, redeemedAt: null };

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

// ─── GET /api/courses/:courseId/rewards (teacher) ─────────────────────────────

describe('GET /api/courses/:courseId/rewards (teacher)', () => {
  test('401 if no token', async () => {
    const res = await request(app).get(`/api/courses/${COURSE.id}/rewards`);
    expect(res.status).toBe(401);
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
    prisma.reward.findMany.mockResolvedValue([{ ...REWARD, _count: { students: 2 } }]);
    const res = await request(app)
      .get(`/api/courses/${COURSE.id}/rewards`)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(200);
    expect(res.body[0].redemptionCount).toBe(2);
    expect(res.body[0]._count).toBeUndefined();
  });
});

// ─── GET /api/courses/:courseId/rewards (student) ─────────────────────────────

describe('GET /api/courses/:courseId/rewards (student)', () => {
  test('403 if student not enrolled', async () => {
    prisma.studentCourse.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .get(`/api/courses/${COURSE.id}/rewards`)
      .set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(403);
  });

  test('200 returns rewards with myRedemption null if not redeemed', async () => {
    prisma.studentCourse.findUnique.mockResolvedValue(ENROLLMENT);
    prisma.reward.findMany.mockResolvedValue([{ ...REWARD, students: [] }]);
    const res = await request(app)
      .get(`/api/courses/${COURSE.id}/rewards`)
      .set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(200);
    expect(res.body[0].myRedemption).toBeNull();
  });

  test('200 returns rewards with myRedemption populated if redeemed', async () => {
    prisma.studentCourse.findUnique.mockResolvedValue(ENROLLMENT);
    prisma.reward.findMany.mockResolvedValue([{ ...REWARD, students: [REDEMPTION] }]);
    const res = await request(app)
      .get(`/api/courses/${COURSE.id}/rewards`)
      .set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(200);
    expect(res.body[0].myRedemption.id).toBe(REDEMPTION.id);
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

// ─── POST /api/rewards/:rewardId/redeem ───────────────────────────────────────

describe('POST /api/rewards/:rewardId/redeem', () => {
  test('401 if no token', async () => {
    const res = await request(app).post(`/api/rewards/${REWARD.id}/redeem`);
    expect(res.status).toBe(401);
  });

  test('403 if requester is a TEACHER', async () => {
    const res = await request(app)
      .post(`/api/rewards/${REWARD.id}/redeem`)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(403);
  });

  test('404 if reward not found', async () => {
    prisma.reward.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post(`/api/rewards/nonexistent/redeem`)
      .set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(404);
  });

  test('403 if student not enrolled', async () => {
    prisma.reward.findUnique.mockResolvedValue(REWARD);
    prisma.studentCourse.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post(`/api/rewards/${REWARD.id}/redeem`)
      .set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(403);
  });

  test('409 if already redeemed', async () => {
    prisma.reward.findUnique.mockResolvedValue(REWARD);
    prisma.studentCourse.findUnique.mockResolvedValue(ENROLLMENT);
    prisma.studentReward.findUnique.mockResolvedValue(REDEMPTION);
    const res = await request(app)
      .post(`/api/rewards/${REWARD.id}/redeem`)
      .set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already redeemed/i);
  });

  test('409 if redemption limit reached', async () => {
    prisma.reward.findUnique.mockResolvedValue(REWARD);
    prisma.studentCourse.findUnique.mockResolvedValue(ENROLLMENT);
    prisma.studentReward.findUnique.mockResolvedValue(null);
    prisma.studentReward.count.mockResolvedValue(5);
    const res = await request(app)
      .post(`/api/rewards/${REWARD.id}/redeem`)
      .set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/limit/i);
  });

  test('201 creates redemption', async () => {
    prisma.reward.findUnique.mockResolvedValue(REWARD);
    prisma.studentCourse.findUnique.mockResolvedValue(ENROLLMENT);
    prisma.studentReward.findUnique.mockResolvedValue(null);
    prisma.studentReward.count.mockResolvedValue(2);
    prisma.studentReward.create.mockResolvedValue(REDEMPTION);
    const res = await request(app)
      .post(`/api/rewards/${REWARD.id}/redeem`)
      .set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(201);
    expect(res.body.rewardId).toBe(REWARD.id);
  });
});

// ─── GET /api/courses/:courseId/redemptions ───────────────────────────────────

describe('GET /api/courses/:courseId/redemptions', () => {
  test('401 if no token', async () => {
    const res = await request(app).get(`/api/courses/${COURSE.id}/redemptions`);
    expect(res.status).toBe(401);
  });

  test('403 if requester is a STUDENT', async () => {
    const res = await request(app)
      .get(`/api/courses/${COURSE.id}/redemptions`)
      .set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(403);
  });

  test('404 if course not found', async () => {
    prisma.course.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .get(`/api/courses/nonexistent/redemptions`)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(404);
  });

  test('403 if teacher does not own course', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    const res = await request(app)
      .get(`/api/courses/${COURSE.id}/redemptions`)
      .set('Authorization', `Bearer ${token('TEACHER', OTHER_TEACHER_ID)}`);
    expect(res.status).toBe(403);
  });

  test('200 returns all redemptions', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.studentReward.findMany.mockResolvedValue([REDEMPTION]);
    const res = await request(app)
      .get(`/api/courses/${COURSE.id}/redemptions`)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('200 filters by ?status=PENDING', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.studentReward.findMany.mockResolvedValue([REDEMPTION]);
    const res = await request(app)
      .get(`/api/courses/${COURSE.id}/redemptions?status=PENDING`)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(200);
    const call = prisma.studentReward.findMany.mock.calls.at(-1)[0];
    expect(call.where.teacherConfirmation).toBe(false);
  });
});

// ─── PATCH /api/redemptions/:redemptionId ─────────────────────────────────────

describe('PATCH /api/redemptions/:redemptionId', () => {
  const REDEMPTION_WITH_REWARD = { ...REDEMPTION, reward: REWARD };

  test('401 if no token', async () => {
    const res = await request(app).patch(`/api/redemptions/${REDEMPTION.id}`).send({ action: 'approve' });
    expect(res.status).toBe(401);
  });

  test('403 if requester is a STUDENT', async () => {
    const res = await request(app)
      .patch(`/api/redemptions/${REDEMPTION.id}`)
      .set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`)
      .send({ action: 'approve' });
    expect(res.status).toBe(403);
  });

  test('400 if action is invalid', async () => {
    const res = await request(app)
      .patch(`/api/redemptions/${REDEMPTION.id}`)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`)
      .send({ action: 'bogus' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/action/);
  });

  test('404 if redemption not found', async () => {
    prisma.studentReward.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .patch(`/api/redemptions/nonexistent`)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`)
      .send({ action: 'approve' });
    expect(res.status).toBe(404);
  });

  test('403 if teacher does not own the course', async () => {
    prisma.studentReward.findUnique.mockResolvedValue(REDEMPTION_WITH_REWARD);
    prisma.course.findUnique.mockResolvedValue(COURSE);
    const res = await request(app)
      .patch(`/api/redemptions/${REDEMPTION.id}`)
      .set('Authorization', `Bearer ${token('TEACHER', OTHER_TEACHER_ID)}`)
      .send({ action: 'approve' });
    expect(res.status).toBe(403);
  });

  test('409 if redemption already approved', async () => {
    prisma.studentReward.findUnique.mockResolvedValue({ ...REDEMPTION_WITH_REWARD, teacherConfirmation: true });
    prisma.course.findUnique.mockResolvedValue(COURSE);
    const res = await request(app)
      .patch(`/api/redemptions/${REDEMPTION.id}`)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`)
      .send({ action: 'approve' });
    expect(res.status).toBe(409);
  });

  test('200 approves redemption', async () => {
    const approved = { ...REDEMPTION, teacherConfirmation: true, redeemedAt: new Date().toISOString() };
    prisma.studentReward.findUnique.mockResolvedValue(REDEMPTION_WITH_REWARD);
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.studentReward.update.mockResolvedValue(approved);
    const res = await request(app)
      .patch(`/api/redemptions/${REDEMPTION.id}`)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`)
      .send({ action: 'approve' });
    expect(res.status).toBe(200);
    expect(res.body.teacherConfirmation).toBe(true);
  });

  test('204 rejects redemption', async () => {
    prisma.studentReward.findUnique.mockResolvedValue(REDEMPTION_WITH_REWARD);
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.studentReward.delete.mockResolvedValue(REDEMPTION);
    const res = await request(app)
      .patch(`/api/redemptions/${REDEMPTION.id}`)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`)
      .send({ action: 'reject' });
    expect(res.status).toBe(204);
  });
});
