const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');

jest.mock('../../lib/prisma', () => ({
  course: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
  chapter: { findMany: jest.fn() },
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

  test('500 if no unique course code can be generated after 10 attempts', async () => {
    prisma.course.findUnique.mockResolvedValue({ id: 'existing', code: 'TAKEN001' });
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`)
      .send({ name: 'General Chemistry I' });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/unique course code/);
  });

  test('201 with created course on success', async () => {
    prisma.course.findUnique.mockResolvedValue(null);
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

  test('409 if join request is already rejected', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.joinRequest.findUnique.mockResolvedValue({ ...JOIN_REQUEST, status: 'REJECTED' });
    const res = await request(app)
      .post(url)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already rejected/);
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

// ─── Clone course ─────────────────────────────────────────────────────────────

const ORIGINAL = {
  id: 'course-id-1',
  name: 'Gen Chem I',
  code: 'ORIG0001',
  teacherId: TEACHER_ID,
  chapters: [],
};

const RICH_ORIGINAL = {
  ...ORIGINAL,
  chapters: [{
    id: 'chapter-id-1',
    name: 'Atomic Structure',
    description: 'Intro to atoms',
    orderIndex: 0,
    sections: [{
      id: 'section-id-1',
      name: 'The Nucleus',
      description: 'Protons and neutrons',
      orderIndex: 0,
      questions: [{
        id: 'question-id-1',
        type: 'MULTIPLE_CHOICE',
        content: 'What is the atomic number of Carbon?',
        correctExplanation: 'Carbon has 6 protons.',
        incorrectExplanation: 'Review the periodic table.',
        difficulty: 2,
        choices: [
          { id: 'choice-id-1', content: '6',  isCorrect: true,  blankIndex: 0 },
          { id: 'choice-id-2', content: '12', isCorrect: false, blankIndex: 0 },
        ],
      }],
    }],
  }],
};

const CLONE = { id: 'clone-id-1', name: 'Gen Chem I (Copy)', teacherId: TEACHER_ID, code: 'NEW10001' };

function mockClone(original = ORIGINAL) {
  prisma.course.findUnique.mockImplementation(({ where }) => {
    if (where.id) return Promise.resolve(original);
    if (where.code) return Promise.resolve(null); // code is available
    return Promise.resolve(null);
  });
  prisma.course.create.mockResolvedValue(CLONE);
}

describe('POST /api/courses/:courseId/clone', () => {
  const cloneUrl = `/api/courses/${ORIGINAL.id}/clone`;

  test('401 if no token', async () => {
    const res = await request(app).post(cloneUrl);
    expect(res.status).toBe(401);
  });

  test('403 if requester is a STUDENT', async () => {
    const res = await request(app)
      .post(cloneUrl)
      .set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(403);
  });

  test('404 if course not found', async () => {
    prisma.course.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post(cloneUrl)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Course not found/);
  });

  test('403 if teacher does not own the course', async () => {
    prisma.course.findUnique.mockResolvedValue(ORIGINAL);
    const res = await request(app)
      .post(cloneUrl)
      .set('Authorization', `Bearer ${token('TEACHER', OTHER_TEACHER_ID)}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/do not own/);
  });

  test('500 if no unique code can be generated after 10 attempts', async () => {
    prisma.course.findUnique.mockImplementation(({ where }) => {
      if (where.id) return Promise.resolve(ORIGINAL);
      if (where.code) return Promise.resolve({ id: 'existing', code: where.code });
      return Promise.resolve(null);
    });
    const res = await request(app)
      .post(cloneUrl)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/unique course code/);
  });

  test('201 with cloned course name suffixed with (Copy)', async () => {
    mockClone();
    const res = await request(app)
      .post(cloneUrl)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(201);
    expect(prisma.course.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ name: `${ORIGINAL.name} (Copy)`, teacherId: TEACHER_ID }),
    }));
  });

  test('201 with empty chapters array for a course with no chapters', async () => {
    mockClone();
    const res = await request(app)
      .post(cloneUrl)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: CLONE.id, name: CLONE.name });
    expect(prisma.course.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ chapters: { create: [] } }),
    }));
  });

  test('201 and passes full nested chapter→section→question→choice structure to create', async () => {
    mockClone(RICH_ORIGINAL);
    const res = await request(app)
      .post(cloneUrl)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(201);

    const createCall = prisma.course.create.mock.calls[0][0].data;
    const clonedChapter = createCall.chapters.create[0];
    expect(clonedChapter).toMatchObject({ name: 'Atomic Structure', orderIndex: 0 });
    expect(clonedChapter.sections.create[0]).toMatchObject({ name: 'The Nucleus', orderIndex: 0 });

    const clonedQuestion = clonedChapter.sections.create[0].questions.create[0];
    expect(clonedQuestion).toMatchObject({
      type: 'MULTIPLE_CHOICE',
      content: 'What is the atomic number of Carbon?',
      difficulty: 2,
    });
    expect(clonedQuestion.choices.create).toHaveLength(2);
    expect(clonedQuestion.choices.create[0]).toEqual({ content: '6', isCorrect: true, blankIndex: 0 });
  });

  test('cloned question does not carry over the original question id', async () => {
    mockClone(RICH_ORIGINAL);
    await request(app)
      .post(cloneUrl)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    const createCall = prisma.course.create.mock.calls[0][0].data;
    const clonedQuestion = createCall.chapters.create[0].sections.create[0].questions.create[0];
    expect(clonedQuestion.id).toBeUndefined();
  });
});

// ─── Get teacher courses ──────────────────────────────────────────────────────

describe('GET /api/courses', () => {
  test('401 if no token', async () => {
    const res = await request(app).get('/api/courses');
    expect(res.status).toBe(401);
  });

  test('403 if requester is a STUDENT', async () => {
    const res = await request(app)
      .get('/api/courses')
      .set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(403);
  });

  test('200 with array of courses owned by the teacher', async () => {
    prisma.course.findMany.mockResolvedValue([COURSE]);
    const res = await request(app)
      .get('/api/courses')
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: COURSE.id, teacherId: TEACHER_ID });
    expect(prisma.course.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { teacherId: TEACHER_ID },
    }));
  });

  test('200 with empty array when teacher has no courses', async () => {
    prisma.course.findMany.mockResolvedValue([]);
    const res = await request(app)
      .get('/api/courses')
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ─── Get course chapters ──────────────────────────────────────────────────────

describe('GET /api/courses/:courseId/chapters', () => {
  const url = `/api/courses/${COURSE.id}/chapters`;
  const CHAPTER_WITH_COUNT = { ...ORIGINAL.chapters?.[0], _count: { sections: 2 } };

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

  test('200 with chapters list ordered by orderIndex', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.chapter.findMany.mockResolvedValue([CHAPTER_WITH_COUNT]);
    const res = await request(app)
      .get(url)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(prisma.chapter.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { courseId: COURSE.id },
      orderBy: { orderIndex: 'asc' },
    }));
  });

  test('200 with empty array when course has no chapters', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.chapter.findMany.mockResolvedValue([]);
    const res = await request(app)
      .get(url)
      .set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
