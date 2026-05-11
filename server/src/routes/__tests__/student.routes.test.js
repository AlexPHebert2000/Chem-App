const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');

jest.mock('../../lib/prisma', () => ({
  course:         { findUnique: jest.fn() },
  chapter:        { findMany: jest.fn(), findUnique: jest.fn() },
  section:        { findUnique: jest.fn() },
  question:       { findMany: jest.fn() },
  student:        { update: jest.fn() },
  studentCourse:  { findUnique: jest.fn(), findMany: jest.fn() },
  studentSection: { findMany: jest.fn() },
  studentBadge:   { findMany: jest.fn() },
}));

const prisma = require('../../lib/prisma');

process.env.JWT_SECRET = 'test_secret';

const STUDENT_ID  = 'student-id-1';
const TEACHER_ID  = 'teacher-id-1';

function token(role, id) {
  return jwt.sign({ sub: id, role }, process.env.JWT_SECRET);
}
const studentAuth = () => ({ Authorization: `Bearer ${token('STUDENT', STUDENT_ID)}` });
const teacherAuth = () => ({ Authorization: `Bearer ${token('TEACHER', TEACHER_ID)}` });

const COURSE   = { id: 'course-id-1', name: 'Gen Chem', code: 'ABCD' };
const CHAPTER  = { id: 'chapter-id-1', courseId: COURSE.id, name: 'Chapter 1', description: 'Intro', orderIndex: 0 };
const SECTION  = { id: 'section-id-1', chapterId: CHAPTER.id, name: 'Section 1', description: 'Atoms', orderIndex: 0 };

const ENROLLMENT = {
  studentId: STUDENT_ID,
  courseId: COURSE.id,
  currentPoints: 50,
  lifetimePoints: 50,
  streak: 2,
  currentSectionId: SECTION.id,
};

const CHAPTER_WITH_SECTIONS = {
  ...CHAPTER,
  sections: [
    { id: SECTION.id, name: SECTION.name, description: SECTION.description, orderIndex: 0, _count: { questions: 5 } },
  ],
};

const MC_CHOICES = [
  { id: 'c-1', content: '6',  isCorrect: true,  blankIndex: 0 },
  { id: 'c-2', content: '12', isCorrect: false, blankIndex: 0 },
];
const QUESTION = {
  id: 'q-1',
  sectionId: SECTION.id,
  content: 'What is the atomic number of Carbon?',
  type: 'MULTIPLE_CHOICE',
  difficulty: 3,
  correctExplanation: 'Carbon has 6 protons.',
  incorrectExplanation: 'Review atomic numbers.',
  choices: MC_CHOICES,
};

// ─── GET /api/courses (student) ───────────────────────────────────────────────

describe('GET /api/courses — STUDENT', () => {
  test('401 if no token', async () => {
    const res = await request(app).get('/api/courses');
    expect(res.status).toBe(401);
  });

  test('200 with empty array when not enrolled in any course', async () => {
    prisma.studentCourse.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/courses').set(studentAuth());
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('200 with mapped enrollment data including currentSection', async () => {
    prisma.studentCourse.findMany.mockResolvedValue([{
      ...ENROLLMENT,
      course: COURSE,
      currentSection: { id: SECTION.id, name: SECTION.name },
    }]);
    const res = await request(app).get('/api/courses').set(studentAuth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: COURSE.id,
      name: COURSE.name,
      code: COURSE.code,
      currentPoints: ENROLLMENT.currentPoints,
      lifetimePoints: ENROLLMENT.lifetimePoints,
      streak: ENROLLMENT.streak,
      currentSectionId: SECTION.id,
      currentSection: { id: SECTION.id, name: SECTION.name },
    });
  });
});

// ─── GET /api/courses/:courseId/progress (student) ───────────────────────────

describe('GET /api/courses/:courseId/progress — STUDENT', () => {
  const url = `/api/courses/${COURSE.id}/progress`;

  test('401 if no token', async () => {
    const res = await request(app).get(url);
    expect(res.status).toBe(401);
  });

  test('403 if requester is a TEACHER', async () => {
    const res = await request(app).get(url).set(teacherAuth());
    expect(res.status).toBe(403);
  });

  test('404 if course not found', async () => {
    prisma.course.findUnique.mockResolvedValue(null);
    const res = await request(app).get(url).set(studentAuth());
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Course not found/);
  });

  test('403 if not enrolled', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.studentCourse.findUnique.mockResolvedValue(null);
    const res = await request(app).get(url).set(studentAuth());
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Not enrolled/);
  });

  test('200 with progress data and completion counts', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.studentCourse.findUnique.mockResolvedValue(ENROLLMENT);
    prisma.chapter.findMany.mockResolvedValue([{ ...CHAPTER, sections: [{ id: SECTION.id }] }]);
    prisma.studentSection.findMany.mockResolvedValue([
      { sectionId: SECTION.id, completedAt: new Date('2026-05-01'), score: 80 },
    ]);
    const res = await request(app).get(url).set(studentAuth());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      courseId: COURSE.id,
      currentPoints: ENROLLMENT.currentPoints,
      lifetimePoints: ENROLLMENT.lifetimePoints,
      streak: ENROLLMENT.streak,
      currentSectionId: SECTION.id,
      totalSections: 1,
      completedSections: 1,
    });
    expect(res.body.sections).toHaveLength(1);
    expect(res.body.sections[0]).toMatchObject({ sectionId: SECTION.id, score: 80 });
  });

  test('200 with 0 completions when no sections finished', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.studentCourse.findUnique.mockResolvedValue(ENROLLMENT);
    prisma.chapter.findMany.mockResolvedValue([{ ...CHAPTER, sections: [{ id: SECTION.id }] }]);
    prisma.studentSection.findMany.mockResolvedValue([]);
    const res = await request(app).get(url).set(studentAuth());
    expect(res.status).toBe(200);
    expect(res.body.totalSections).toBe(1);
    expect(res.body.completedSections).toBe(0);
    expect(res.body.sections).toEqual([]);
  });
});

// ─── GET /api/courses/:courseId/chapters (student) ───────────────────────────

describe('GET /api/courses/:courseId/chapters — STUDENT', () => {
  const url = `/api/courses/${COURSE.id}/chapters`;

  test('404 if course not found', async () => {
    prisma.course.findUnique.mockResolvedValue(null);
    const res = await request(app).get(url).set(studentAuth());
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Course not found/);
  });

  test('403 if not enrolled', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.studentCourse.findUnique.mockResolvedValue(null);
    const res = await request(app).get(url).set(studentAuth());
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Not enrolled/);
  });

  test('200 with chapters and sections with completion status', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.studentCourse.findUnique.mockResolvedValue(ENROLLMENT);
    prisma.chapter.findMany.mockResolvedValue([CHAPTER_WITH_SECTIONS]);
    prisma.studentSection.findMany.mockResolvedValue([
      { sectionId: SECTION.id, completedAt: new Date('2026-05-01'), score: 90 },
    ]);
    const res = await request(app).get(url).set(studentAuth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    const chapter = res.body[0];
    expect(chapter).toMatchObject({ id: CHAPTER.id, name: CHAPTER.name });
    expect(chapter.sections).toHaveLength(1);
    expect(chapter.sections[0]).toMatchObject({
      id: SECTION.id,
      questionCount: 5,
      completed: true,
      score: 90,
    });
  });

  test('sections show completed: false and score: null when not yet done', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.studentCourse.findUnique.mockResolvedValue(ENROLLMENT);
    prisma.chapter.findMany.mockResolvedValue([CHAPTER_WITH_SECTIONS]);
    prisma.studentSection.findMany.mockResolvedValue([]);
    const res = await request(app).get(url).set(studentAuth());
    expect(res.status).toBe(200);
    expect(res.body[0].sections[0]).toMatchObject({ completed: false, score: null });
  });
});

// ─── GET /api/sections/:sectionId/questions (student) ────────────────────────

describe('GET /api/sections/:sectionId/questions — STUDENT', () => {
  const url = `/api/sections/${SECTION.id}/questions`;

  test('404 if section not found', async () => {
    prisma.section.findUnique.mockResolvedValue(null);
    const res = await request(app).get(url).set(studentAuth());
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Section not found/);
  });

  test('403 if not enrolled in the section course', async () => {
    prisma.section.findUnique.mockResolvedValue(SECTION);
    prisma.chapter.findUnique.mockResolvedValue(CHAPTER);
    prisma.studentCourse.findUnique.mockResolvedValue(null);
    const res = await request(app).get(url).set(studentAuth());
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Not enrolled/);
  });

  test('200 with questions and choices have no isCorrect field', async () => {
    prisma.section.findUnique.mockResolvedValue(SECTION);
    prisma.chapter.findUnique.mockResolvedValue(CHAPTER);
    prisma.studentCourse.findUnique.mockResolvedValue(ENROLLMENT);
    prisma.question.findMany.mockResolvedValue([QUESTION]);
    const res = await request(app).get(url).set(studentAuth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: QUESTION.id, type: QUESTION.type });
    res.body[0].choices.forEach(c => {
      expect(c).not.toHaveProperty('isCorrect');
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('content');
    });
  });

  test('explanations are NOT stripped from questions', async () => {
    prisma.section.findUnique.mockResolvedValue(SECTION);
    prisma.chapter.findUnique.mockResolvedValue(CHAPTER);
    prisma.studentCourse.findUnique.mockResolvedValue(ENROLLMENT);
    prisma.question.findMany.mockResolvedValue([QUESTION]);
    const res = await request(app).get(url).set(studentAuth());
    expect(res.body[0]).toHaveProperty('correctExplanation');
    expect(res.body[0]).toHaveProperty('incorrectExplanation');
  });
});

// ─── GET /api/courses/:courseId/leaderboard ───────────────────────────────────

describe('GET /api/courses/:courseId/leaderboard', () => {
  const url = `/api/courses/${COURSE.id}/leaderboard`;
  const STUDENT_2 = { id: 'student-id-2', name: 'Bob', email: 'bob@test.com' };
  const ENTRIES = [
    { studentId: STUDENT_ID,    currentPoints: 200, lifetimePoints: 300, streak: 5, student: { id: STUDENT_ID,    name: 'Alice', email: 'alice@test.com' } },
    { studentId: STUDENT_2.id,  currentPoints: 100, lifetimePoints: 150, streak: 2, student: STUDENT_2 },
  ];

  test('401 if no token', async () => {
    const res = await request(app).get(url);
    expect(res.status).toBe(401);
  });

  test('404 if course not found', async () => {
    prisma.course.findUnique.mockResolvedValue(null);
    const res = await request(app).get(url).set(studentAuth());
    expect(res.status).toBe(404);
  });

  test('403 if student not enrolled', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.studentCourse.findUnique.mockResolvedValue(null);
    const res = await request(app).get(url).set(studentAuth());
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Not enrolled/);
  });

  test('403 if teacher does not own course', async () => {
    prisma.course.findUnique.mockResolvedValue({ ...COURSE, teacherId: 'other-teacher' });
    const res = await request(app).get(url).set(teacherAuth());
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/do not own/);
  });

  test('200 student gets ranked leaderboard', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.studentCourse.findUnique.mockResolvedValue(ENROLLMENT);
    prisma.studentCourse.findMany.mockResolvedValue(ENTRIES);
    const res = await request(app).get(url).set(studentAuth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ rank: 1, name: 'Alice', currentPoints: 200 });
    expect(res.body[1]).toMatchObject({ rank: 2, name: 'Bob',   currentPoints: 100 });
  });

  test('200 teacher gets leaderboard for owned course', async () => {
    prisma.course.findUnique.mockResolvedValue({ ...COURSE, teacherId: TEACHER_ID });
    prisma.studentCourse.findMany.mockResolvedValue(ENTRIES);
    const res = await request(app).get(url).set(teacherAuth());
    expect(res.status).toBe(200);
    expect(res.body[0].rank).toBe(1);
  });

  test('response entries do not include password', async () => {
    prisma.course.findUnique.mockResolvedValue(COURSE);
    prisma.studentCourse.findUnique.mockResolvedValue(ENROLLMENT);
    prisma.studentCourse.findMany.mockResolvedValue(ENTRIES);
    const res = await request(app).get(url).set(studentAuth());
    res.body.forEach(entry => expect(entry).not.toHaveProperty('password'));
  });
});

// ─── PATCH /api/students/me ───────────────────────────────────────────────────

describe('PATCH /api/students/me', () => {
  const UPDATED_STUDENT = { id: STUDENT_ID, name: 'Alice Updated', email: 'alice@test.com', profileImage: null };

  test('401 if no token', async () => {
    const res = await request(app).patch('/api/students/me').send({ name: 'Alice' });
    expect(res.status).toBe(401);
  });

  test('403 if requester is a TEACHER', async () => {
    const res = await request(app)
      .patch('/api/students/me')
      .set(teacherAuth())
      .send({ name: 'Alice' });
    expect(res.status).toBe(403);
  });

  test('400 if no fields provided', async () => {
    const res = await request(app)
      .patch('/api/students/me')
      .set(studentAuth())
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least one field/);
  });

  test('400 if name is blank string', async () => {
    const res = await request(app)
      .patch('/api/students/me')
      .set(studentAuth())
      .send({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/blank/);
  });

  test('200 updates name only', async () => {
    prisma.student.update.mockResolvedValue(UPDATED_STUDENT);
    const res = await request(app)
      .patch('/api/students/me')
      .set(studentAuth())
      .send({ name: 'Alice Updated' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Alice Updated');
    expect(res.body).not.toHaveProperty('password');
  });

  test('200 updates profileImage only', async () => {
    const withImage = { ...UPDATED_STUDENT, profileImage: 'https://example.com/avatar.png' };
    prisma.student.update.mockResolvedValue(withImage);
    const res = await request(app)
      .patch('/api/students/me')
      .set(studentAuth())
      .send({ profileImage: 'https://example.com/avatar.png' });
    expect(res.status).toBe(200);
    expect(res.body.profileImage).toBe('https://example.com/avatar.png');
  });

  test('200 updates both name and profileImage', async () => {
    const withBoth = { ...UPDATED_STUDENT, profileImage: 'https://example.com/avatar.png' };
    prisma.student.update.mockResolvedValue(withBoth);
    const res = await request(app)
      .patch('/api/students/me')
      .set(studentAuth())
      .send({ name: 'Alice Updated', profileImage: 'https://example.com/avatar.png' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Alice Updated');
    expect(res.body.profileImage).toBe('https://example.com/avatar.png');
  });
});

// ─── GET /api/students/me/badges ─────────────────────────────────────────────

describe('GET /api/students/me/badges', () => {
  const BADGE = { id: 'badge-id-1', name: 'First Steps', color: '#FFD700', criteriaType: 'SECTIONS_COMPLETED', criteriaAmount: 1 };
  const STUDENT_BADGE_EARNED = { id: 'sb-1', studentId: STUDENT_ID, badgeId: BADGE.id, progress: 1, dateAchieved: new Date('2026-05-10').toISOString(), badge: BADGE };
  const STUDENT_BADGE_IN_PROGRESS = { id: 'sb-2', studentId: STUDENT_ID, badgeId: 'badge-id-2', progress: 3, dateAchieved: null, badge: { id: 'badge-id-2', name: 'Centurion', color: '#C0C0C0', criteriaType: 'QUESTIONS_ANSWERED', criteriaAmount: 100 } };

  test('401 if no token', async () => {
    const res = await request(app).get('/api/students/me/badges');
    expect(res.status).toBe(401);
  });

  test('403 if requester is a TEACHER', async () => {
    const res = await request(app)
      .get('/api/students/me/badges')
      .set(teacherAuth());
    expect(res.status).toBe(403);
  });

  test('200 returns empty array when no badges', async () => {
    prisma.studentBadge.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/students/me/badges').set(studentAuth());
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('200 returns earned and in-progress badges with badge details', async () => {
    prisma.studentBadge.findMany.mockResolvedValue([STUDENT_BADGE_EARNED, STUDENT_BADGE_IN_PROGRESS]);
    const res = await request(app).get('/api/students/me/badges').set(studentAuth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const earned = res.body.find(b => b.dateAchieved !== null);
    const inProgress = res.body.find(b => b.dateAchieved === null);
    expect(earned.badge.name).toBe('First Steps');
    expect(inProgress.progress).toBe(3);
    expect(inProgress.badge.criteriaAmount).toBe(100);
  });
});
