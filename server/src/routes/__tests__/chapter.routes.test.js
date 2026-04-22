const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');

jest.mock('../../lib/prisma', () => ({
  course: { findUnique: jest.fn() },
  chapter: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  section: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
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
const CHAPTER_A = { id: 'chapter-id-1', courseId: COURSE.id, name: 'Atomic Structure', description: 'Intro to atoms', orderIndex: 0 };
const CHAPTER_B = { id: 'chapter-id-2', courseId: COURSE.id, name: 'Bonding', description: 'Chemical bonds', orderIndex: 1 };
const SECTION_A = { id: 'section-id-1', chapterId: CHAPTER_A.id, name: 'The Nucleus', description: 'Protons and neutrons', orderIndex: 0 };
const SECTION_B = { id: 'section-id-2', chapterId: CHAPTER_A.id, name: 'Electrons', description: 'Electron shells', orderIndex: 1 };

// ─── Create chapter ───────────────────────────────────────────────────────────

describe('POST /api/courses/:courseId/chapters', () => {
  const url = `/api/courses/${COURSE.id}/chapters`;
  const validBody = { name: 'Atomic Structure', description: 'Intro to atoms', orderIndex: 0 };

  test('401 if no token', async () => {
    const res = await request(app).post(url).send(validBody);
    expect(res.status).toBe(401);
  });

  test('403 if requester is a STUDENT', async () => {
    const res = await request(app).post(url).set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`).send(validBody);
    expect(res.status).toBe(403);
  });

  test('400 if name is missing', async () => {
    const res = await request(app).post(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send({ description: 'desc', orderIndex: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/);
  });

  test('400 if description is missing', async () => {
    const res = await request(app).post(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send({ name: 'Chapter', orderIndex: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/description/);
  });

  test('400 if orderIndex is missing', async () => {
    const res = await request(app).post(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send({ name: 'Chapter', description: 'desc' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/orderIndex/);
  });

  test('400 if orderIndex is negative', async () => {
    const res = await request(app).post(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send({ ...validBody, orderIndex: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/orderIndex/);
  });

  test('404 if course not found', async () => {
    prisma.course.findUnique.mockResolvedValue(null);
    const res = await request(app).post(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send(validBody);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Course not found/);
  });

  test('403 if teacher does not own the course', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    const res = await request(app).post(url).set('Authorization', `Bearer ${token('TEACHER', OTHER_TEACHER_ID)}`).send(validBody);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/do not own/);
  });

  test('201 with created chapter on success', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.chapter.create.mockResolvedValue(CHAPTER_A);
    const res = await request(app).post(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send(validBody);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: CHAPTER_A.name, courseId: COURSE.id, orderIndex: 0 });
  });
});

// ─── Swap chapter order ───────────────────────────────────────────────────────

describe('PATCH /api/courses/:courseId/chapters/swap', () => {
  const url = `/api/courses/${COURSE.id}/chapters/swap`;
  const validBody = { chapterIdA: CHAPTER_A.id, chapterIdB: CHAPTER_B.id };

  test('401 if no token', async () => {
    const res = await request(app).patch(url).send(validBody);
    expect(res.status).toBe(401);
  });

  test('403 if requester is a STUDENT', async () => {
    const res = await request(app).patch(url).set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`).send(validBody);
    expect(res.status).toBe(403);
  });

  test('400 if chapterIdA is missing', async () => {
    const res = await request(app).patch(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send({ chapterIdB: CHAPTER_B.id });
    expect(res.status).toBe(400);
  });

  test('400 if both IDs are the same', async () => {
    const res = await request(app).patch(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send({ chapterIdA: CHAPTER_A.id, chapterIdB: CHAPTER_A.id });
    expect(res.status).toBe(400);
  });

  test('404 if course not found', async () => {
    prisma.course.findUnique.mockResolvedValue(null);
    const res = await request(app).patch(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send(validBody);
    expect(res.status).toBe(404);
  });

  test('403 if teacher does not own the course', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    const res = await request(app).patch(url).set('Authorization', `Bearer ${token('TEACHER', OTHER_TEACHER_ID)}`).send(validBody);
    expect(res.status).toBe(403);
  });

  test('404 if chapterIdA does not belong to the course', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.chapter.findUnique.mockResolvedValueOnce({ ...CHAPTER_A, courseId: 'other-course' }).mockResolvedValueOnce(CHAPTER_B);
    const res = await request(app).patch(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send(validBody);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/chapterIdA/);
  });

  test('404 if chapterIdB does not belong to the course', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.chapter.findUnique.mockResolvedValueOnce(CHAPTER_A).mockResolvedValueOnce({ ...CHAPTER_B, courseId: 'other-course' });
    const res = await request(app).patch(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send(validBody);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/chapterIdB/);
  });

  test('200 with swapped indexes on success', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.chapter.findUnique.mockResolvedValueOnce(CHAPTER_A).mockResolvedValueOnce(CHAPTER_B);
    prisma.chapter.update.mockResolvedValue({});
    const res = await request(app).patch(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send(validBody);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ chapterIdA: CHAPTER_A.id, orderIndexA: CHAPTER_B.orderIndex, chapterIdB: CHAPTER_B.id, orderIndexB: CHAPTER_A.orderIndex });
  });
});

// ─── Create section ───────────────────────────────────────────────────────────

describe('POST /api/chapters/:chapterId/sections', () => {
  const url = `/api/chapters/${CHAPTER_A.id}/sections`;
  const validBody = { name: 'The Nucleus', description: 'Protons and neutrons', orderIndex: 0 };

  test('401 if no token', async () => {
    const res = await request(app).post(url).send(validBody);
    expect(res.status).toBe(401);
  });

  test('403 if requester is a STUDENT', async () => {
    const res = await request(app).post(url).set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`).send(validBody);
    expect(res.status).toBe(403);
  });

  test('400 if name is missing', async () => {
    const res = await request(app).post(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send({ description: 'desc', orderIndex: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/);
  });

  test('400 if description is missing', async () => {
    const res = await request(app).post(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send({ name: 'Section', orderIndex: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/description/);
  });

  test('400 if orderIndex is missing', async () => {
    const res = await request(app).post(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send({ name: 'Section', description: 'desc' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/orderIndex/);
  });

  test('404 if chapter not found', async () => {
    prisma.chapter.findUnique.mockResolvedValue(null);
    const res = await request(app).post(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send(validBody);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Chapter not found/);
  });

  test('403 if teacher does not own the course', async () => {
    prisma.chapter.findUnique.mockResolvedValue(CHAPTER_A);
    prisma.course.findUnique.mockResolvedValue(COURSE);
    const res = await request(app).post(url).set('Authorization', `Bearer ${token('TEACHER', OTHER_TEACHER_ID)}`).send(validBody);
    expect(res.status).toBe(403);
  });

  test('201 with created section on success', async () => {
    prisma.chapter.findUnique.mockResolvedValue(CHAPTER_A);
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.section.create.mockResolvedValue(SECTION_A);
    const res = await request(app).post(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send(validBody);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: SECTION_A.name, chapterId: CHAPTER_A.id, orderIndex: 0 });
  });
});

// ─── Swap section order ───────────────────────────────────────────────────────

describe('PATCH /api/chapters/:chapterId/sections/swap', () => {
  const url = `/api/chapters/${CHAPTER_A.id}/sections/swap`;
  const validBody = { sectionIdA: SECTION_A.id, sectionIdB: SECTION_B.id };

  test('401 if no token', async () => {
    const res = await request(app).patch(url).send(validBody);
    expect(res.status).toBe(401);
  });

  test('403 if requester is a STUDENT', async () => {
    const res = await request(app).patch(url).set('Authorization', `Bearer ${token('STUDENT', STUDENT_ID)}`).send(validBody);
    expect(res.status).toBe(403);
  });

  test('400 if sectionIdA is missing', async () => {
    const res = await request(app).patch(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send({ sectionIdB: SECTION_B.id });
    expect(res.status).toBe(400);
  });

  test('400 if both IDs are the same', async () => {
    const res = await request(app).patch(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send({ sectionIdA: SECTION_A.id, sectionIdB: SECTION_A.id });
    expect(res.status).toBe(400);
  });

  test('404 if chapter not found', async () => {
    prisma.chapter.findUnique.mockResolvedValue(null);
    const res = await request(app).patch(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send(validBody);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Chapter not found/);
  });

  test('403 if teacher does not own the course', async () => {
    prisma.chapter.findUnique.mockResolvedValue(CHAPTER_A);
    prisma.course.findUnique.mockResolvedValue(COURSE);
    const res = await request(app).patch(url).set('Authorization', `Bearer ${token('TEACHER', OTHER_TEACHER_ID)}`).send(validBody);
    expect(res.status).toBe(403);
  });

  test('404 if sectionIdA does not belong to the chapter', async () => {
    prisma.chapter.findUnique.mockResolvedValue(CHAPTER_A);
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.section.findUnique.mockResolvedValueOnce({ ...SECTION_A, chapterId: 'other-chapter' }).mockResolvedValueOnce(SECTION_B);
    const res = await request(app).patch(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send(validBody);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/sectionIdA/);
  });

  test('404 if sectionIdB does not belong to the chapter', async () => {
    prisma.chapter.findUnique.mockResolvedValue(CHAPTER_A);
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.section.findUnique.mockResolvedValueOnce(SECTION_A).mockResolvedValueOnce({ ...SECTION_B, chapterId: 'other-chapter' });
    const res = await request(app).patch(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send(validBody);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/sectionIdB/);
  });

  test('200 with swapped indexes on success', async () => {
    prisma.chapter.findUnique.mockResolvedValue(CHAPTER_A);
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.section.findUnique.mockResolvedValueOnce(SECTION_A).mockResolvedValueOnce(SECTION_B);
    prisma.section.update.mockResolvedValue({});
    const res = await request(app).patch(url).set('Authorization', `Bearer ${token('TEACHER', TEACHER_ID)}`).send(validBody);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ sectionIdA: SECTION_A.id, orderIndexA: SECTION_B.orderIndex, sectionIdB: SECTION_B.id, orderIndexB: SECTION_A.orderIndex });
  });
});
