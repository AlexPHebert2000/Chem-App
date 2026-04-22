const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');

jest.mock('../../lib/prisma', () => ({
  course: { create: jest.fn() },
}));

const prisma = require('../../lib/prisma');

process.env.JWT_SECRET = 'test_secret';

const TEACHER_ID = 'teacher-id-1';
const STUDENT_ID = 'student-id-1';

function token(role, id) {
  return jwt.sign({ sub: id, role }, process.env.JWT_SECRET);
}

const COURSE = { id: 'course-id-1', name: 'General Chemistry I', teacherId: TEACHER_ID };

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
    expect(prisma.course.create).toHaveBeenCalledWith({
      data: { name: 'General Chemistry I', teacherId: TEACHER_ID },
    });
  });
});
