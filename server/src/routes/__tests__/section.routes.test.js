const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');

jest.mock('../../lib/prisma', () => ({
  section:       { findUnique: jest.fn(), update: jest.fn() },
  chapter:       { findUnique: jest.fn() },
  course:        { findUnique: jest.fn() },
  question:      { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  choice:        { deleteMany: jest.fn(), create: jest.fn() },
  studentCourse: { findUnique: jest.fn() },
}));

const prisma = require('../../lib/prisma');

process.env.JWT_SECRET = 'test_secret';

const TEACHER_ID       = 'teacher-id-1';
const OTHER_TEACHER_ID = 'teacher-id-2';
const STUDENT_ID       = 'student-id-1';

function token(role, id) {
  return jwt.sign({ sub: id, role }, process.env.JWT_SECRET);
}

const COURSE  = { id: 'course-id-1', teacherId: TEACHER_ID };
const CHAPTER = { id: 'chapter-id-1', courseId: COURSE.id };
const SECTION = { id: 'section-id-1', chapterId: CHAPTER.id, questionIds: [] };

const QUESTION_ID = 'question-id-1';
const QUESTION    = { id: QUESTION_ID, teacherId: TEACHER_ID, sectionIds: [] };

const MC_CHOICES = [
  { content: '6',  isCorrect: true  },
  { content: '12', isCorrect: false },
  { content: '4',  isCorrect: false },
];

const FIB_CHOICES = [
  { blankIndex: 0, content: '6',  isCorrect: true  },
  { blankIndex: 0, content: '12', isCorrect: false },
  { blankIndex: 1, content: 'C',  isCorrect: true  },
  { blankIndex: 1, content: 'Ca', isCorrect: false },
];

function mockOwnership(sectionOverride) {
  prisma.section.findUnique.mockResolvedValue(sectionOverride ?? SECTION);
  prisma.chapter.findUnique.mockResolvedValue(CHAPTER);
  prisma.course.findUnique.mockResolvedValue(COURSE);
}

beforeEach(() => jest.clearAllMocks());

// ─── GET /api/sections/:sectionId/questions ───────────────────────────────────

describe('GET /api/sections/:sectionId/questions', () => {
  const getUrl = `/api/sections/${SECTION.id}/questions`;
  const QUESTION_WITH_CHOICES = { id: QUESTION_ID, type: 'MULTIPLE_CHOICE', choices: MC_CHOICES };

  test('401 if no token', async () => {
    const res = await request(app).get(getUrl);
    expect(res.status).toBe(401);
  });

  test('404 if section not found', async () => {
    prisma.section.findUnique.mockResolvedValue(null);
    const res = await request(app).get(getUrl).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Section not found/);
  });

  test('403 if teacher does not own the course', async () => {
    mockOwnership();
    const res = await request(app).get(getUrl).set('Authorization', `Bearer ${token('TEACHER', OTHER_TEACHER_ID)}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/do not own/);
  });

  test('200 for TEACHER with questions including choices', async () => {
    mockOwnership();
    prisma.question.findMany.mockResolvedValue([QUESTION_WITH_CHOICES]);
    const res = await request(app).get(getUrl).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('200 with empty array when section has no questions', async () => {
    mockOwnership();
    prisma.question.findMany.mockResolvedValue([]);
    const res = await request(app).get(getUrl).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('200 for STUDENT with questions stripped of isCorrect', async () => {
    mockOwnership();
    prisma.studentCourse.findUnique.mockResolvedValue({ studentId: STUDENT_ID, courseId: COURSE.id });
    prisma.question.findMany.mockResolvedValue([QUESTION_WITH_CHOICES]);
    const res = await request(app).get(getUrl).set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    res.body[0].choices.forEach(c => expect(c).not.toHaveProperty('isCorrect'));
  });
});

// ─── POST /api/sections/:sectionId/questions/:questionId — addQuestionToSection

const addUrl = `/api/sections/${SECTION.id}/questions/${QUESTION_ID}`;

describe('POST /api/sections/:sectionId/questions/:questionId — guards', () => {
  test('401 if no token', async () => {
    const res = await request(app).post(addUrl);
    expect(res.status).toBe(401);
  });

  test('403 if STUDENT', async () => {
    const res = await request(app).post(addUrl).set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/sections/:sectionId/questions/:questionId — ownership', () => {
  const auth = (id = TEACHER_ID) => ({ Authorization: `Bearer ${token('TEACHER', id)}` });

  test('404 if section not found', async () => {
    prisma.section.findUnique.mockResolvedValue(null);
    const res = await request(app).post(addUrl).set(auth());
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Section not found/);
  });

  test('403 if teacher does not own the section course', async () => {
    mockOwnership();
    const res = await request(app).post(addUrl).set(auth(OTHER_TEACHER_ID));
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/do not own/);
  });

  test('404 if question not found', async () => {
    mockOwnership();
    prisma.question.findUnique.mockResolvedValue(null);
    const res = await request(app).post(addUrl).set(auth());
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Question not found/);
  });

  test('403 if teacher does not own the question', async () => {
    mockOwnership();
    prisma.question.findUnique.mockResolvedValue({ ...QUESTION, teacherId: OTHER_TEACHER_ID });
    const res = await request(app).post(addUrl).set(auth());
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/do not own/);
  });

  test('409 if question is already in the section', async () => {
    mockOwnership({ ...SECTION, questionIds: [QUESTION_ID] });
    prisma.question.findUnique.mockResolvedValue(QUESTION);
    const res = await request(app).post(addUrl).set(auth());
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already in/);
  });
});

describe('POST /api/sections/:sectionId/questions/:questionId — success', () => {
  const auth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });

  test('200 adds question to section', async () => {
    mockOwnership({ ...SECTION, questionIds: [] });
    prisma.question.findUnique.mockResolvedValue({ ...QUESTION, sectionIds: [] });
    prisma.section.update.mockResolvedValue({});
    prisma.question.update.mockResolvedValue({});
    const res = await request(app).post(addUrl).set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ message: 'Question added to section' });
    expect(prisma.section.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: SECTION.id },
      data: { questionIds: { push: QUESTION_ID } },
    }));
    expect(prisma.question.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: QUESTION_ID },
      data: { sectionIds: { push: SECTION.id } },
    }));
  });
});

// ─── DELETE /api/sections/:sectionId/questions/:questionId — removeQuestionFromSection

const deleteUrl = `/api/sections/${SECTION.id}/questions/${QUESTION_ID}`;

describe('DELETE /api/sections/:sectionId/questions/:questionId — guards', () => {
  test('401 if no token', async () => {
    const res = await request(app).delete(deleteUrl);
    expect(res.status).toBe(401);
  });

  test('403 if STUDENT', async () => {
    const res = await request(app).delete(deleteUrl).set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`);
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/sections/:sectionId/questions/:questionId — ownership', () => {
  const auth = (id = TEACHER_ID) => ({ Authorization: `Bearer ${token('TEACHER', id)}` });

  test('404 if section not found', async () => {
    prisma.section.findUnique.mockResolvedValue(null);
    const res = await request(app).delete(deleteUrl).set(auth());
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Section not found/);
  });

  test('403 if teacher does not own the section course', async () => {
    mockOwnership();
    const res = await request(app).delete(deleteUrl).set(auth(OTHER_TEACHER_ID));
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/do not own/);
  });

  test('404 if question not found', async () => {
    mockOwnership();
    prisma.question.findUnique.mockResolvedValue(null);
    const res = await request(app).delete(deleteUrl).set(auth());
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Question not found/);
  });

  test('403 if teacher does not own the question', async () => {
    mockOwnership();
    prisma.question.findUnique.mockResolvedValue({ ...QUESTION, teacherId: OTHER_TEACHER_ID });
    const res = await request(app).delete(deleteUrl).set(auth());
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/do not own/);
  });
});

describe('DELETE /api/sections/:sectionId/questions/:questionId — success', () => {
  const auth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });

  test('200 removes question from section', async () => {
    mockOwnership({ ...SECTION, questionIds: [QUESTION_ID] });
    prisma.question.findUnique.mockResolvedValue({ ...QUESTION, sectionIds: [SECTION.id] });
    prisma.section.update.mockResolvedValue({});
    prisma.question.update.mockResolvedValue({});
    const res = await request(app).delete(deleteUrl).set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ message: 'Question removed from section' });
    expect(prisma.section.update).toHaveBeenCalledWith({
      where: { id: SECTION.id },
      data: { questionIds: { set: [] } },
    });
    expect(prisma.question.update).toHaveBeenCalledWith({
      where: { id: QUESTION_ID },
      data: { sectionIds: { set: [] } },
    });
  });
});

// ─── PATCH /api/sections/:sectionId/questions/:questionId — backward-compat updateQuestion

const MC_BODY = {
  type: 'MULTIPLE_CHOICE',
  content: 'What is the atomic number of Carbon?',
  correctExplanation: 'Carbon has 6 protons.',
  incorrectExplanation: 'Review the periodic table.',
  difficulty: 2,
  choices: [
    { content: '6',  isCorrect: true  },
    { content: '12', isCorrect: false },
    { content: '4',  isCorrect: false },
  ],
};

const patchUrl = `/api/sections/${SECTION.id}/questions/${QUESTION_ID}`;

describe('PATCH /api/sections/:sectionId/questions/:questionId — guards', () => {
  test('401 if no token', async () => {
    const res = await request(app).patch(patchUrl).send(MC_BODY);
    expect(res.status).toBe(401);
  });

  test('403 if STUDENT', async () => {
    const res = await request(app).patch(patchUrl).set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`).send(MC_BODY);
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/sections/:sectionId/questions/:questionId — field validation', () => {
  const auth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });

  test('400 if type is missing', async () => {
    const { type: _, ...body } = MC_BODY;
    const res = await request(app).patch(patchUrl).set(auth()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/);
  });

  test('400 if difficulty is out of range', async () => {
    const res = await request(app).patch(patchUrl).set(auth()).send({ ...MC_BODY, difficulty: 6 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/difficulty/);
  });
});

describe('PATCH /api/sections/:sectionId/questions/:questionId — ownership', () => {
  const auth = (id = TEACHER_ID) => ({ Authorization: `Bearer ${token('TEACHER', id)}` });

  test('404 if question not found', async () => {
    prisma.question.findUnique.mockResolvedValue(null);
    const res = await request(app).patch(patchUrl).set(auth()).send(MC_BODY);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Question not found/);
  });

  test('403 if teacher does not own the question', async () => {
    prisma.question.findUnique.mockResolvedValue({ ...QUESTION, teacherId: OTHER_TEACHER_ID, choices: [] });
    const res = await request(app).patch(patchUrl).set(auth()).send(MC_BODY);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/do not own/);
  });
});

describe('PATCH /api/sections/:sectionId/questions/:questionId — success', () => {
  const auth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });

  test('200 updates the question via question ownership (no section chain)', async () => {
    const existing = { ...QUESTION, teacherId: TEACHER_ID, choices: [] };
    const updated  = { ...existing, ...MC_BODY, choices: [] };
    prisma.question.findUnique
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(updated);
    prisma.choice.deleteMany.mockResolvedValue({});
    prisma.choice.create.mockResolvedValue({});
    prisma.question.update.mockResolvedValue({});
    const res = await request(app).patch(patchUrl).set(auth()).send(MC_BODY);
    expect(res.status).toBe(200);
    expect(prisma.question.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: QUESTION_ID },
      data: expect.objectContaining({ type: 'MULTIPLE_CHOICE' }),
    }));
  });
});
