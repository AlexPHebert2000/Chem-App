const prisma = require('../lib/prisma');

async function getStudentCourses(req, res) {
  const studentId = req.user.sub;

  const enrollments = await prisma.studentCourse.findMany({
    where: { studentId },
    include: {
      course: true,
      currentSection: { select: { id: true, name: true } },
    },
    orderBy: { course: { name: 'asc' } },
  });

  res.json(enrollments.map(e => ({
    id: e.course.id,
    name: e.course.name,
    code: e.course.code,
    currentPoints: e.currentPoints,
    lifetimePoints: e.lifetimePoints,
    streak: e.streak,
    currentSectionId: e.currentSectionId,
    currentSection: e.currentSection,
  })));
}

async function getStudentCourseProgress(req, res) {
  const { courseId } = req.params;
  const studentId = req.user.sub;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const enrollment = await prisma.studentCourse.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  });
  if (!enrollment) return res.status(403).json({ error: 'Not enrolled in this course' });

  const chapters = await prisma.chapter.findMany({
    where: { courseId },
    include: { sections: { select: { id: true } } },
  });
  const sectionIds = chapters.flatMap(ch => ch.sections.map(s => s.id));

  const completions = await prisma.studentSection.findMany({
    where: { studentId, sectionId: { in: sectionIds }, completedAt: { not: null } },
  });

  res.json({
    courseId,
    currentPoints: enrollment.currentPoints,
    lifetimePoints: enrollment.lifetimePoints,
    streak: enrollment.streak,
    currentSectionId: enrollment.currentSectionId,
    totalSections: sectionIds.length,
    completedSections: completions.length,
    sections: completions.map(c => ({
      sectionId: c.sectionId,
      completedAt: c.completedAt,
      score: c.score,
    })),
  });
}

async function getStudentSectionQuestions(req, res) {
  const { sectionId } = req.params;
  const studentId = req.user.sub;

  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) return res.status(404).json({ error: 'Section not found' });

  const chapter = await prisma.chapter.findUnique({ where: { id: section.chapterId } });

  const enrollment = await prisma.studentCourse.findUnique({
    where: { studentId_courseId: { studentId, courseId: chapter.courseId } },
  });
  if (!enrollment) return res.status(403).json({ error: 'Not enrolled in this course' });

  const questions = await prisma.question.findMany({
    where: { sectionId },
    include: { choices: true },
  });

  // Strip isCorrect so students can't see answers in the payload
  res.json(questions.map(q => ({
    ...q,
    choices: q.choices.map(({ isCorrect, ...choice }) => choice),
  })));
}

async function getStudentCourseChapters(req, res) {
  const { courseId } = req.params;
  const studentId = req.user.sub;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const enrollment = await prisma.studentCourse.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  });
  if (!enrollment) return res.status(403).json({ error: 'Not enrolled in this course' });

  const chapters = await prisma.chapter.findMany({
    where: { courseId },
    orderBy: { orderIndex: 'asc' },
    include: {
      sections: {
        orderBy: { orderIndex: 'asc' },
        include: { _count: { select: { questions: true } } },
      },
    },
  });

  const sectionIds = chapters.flatMap(ch => ch.sections.map(s => s.id));
  const completions = await prisma.studentSection.findMany({
    where: { studentId, sectionId: { in: sectionIds } },
  });
  const completionMap = new Map(completions.map(c => [c.sectionId, c]));

  res.json(chapters.map(ch => ({
    id: ch.id,
    name: ch.name,
    description: ch.description,
    orderIndex: ch.orderIndex,
    sections: ch.sections.map(sec => {
      const completion = completionMap.get(sec.id);
      return {
        id: sec.id,
        name: sec.name,
        description: sec.description,
        orderIndex: sec.orderIndex,
        questionCount: sec._count.questions,
        completed: !!completion?.completedAt,
        score: completion?.score ?? null,
      };
    }),
  })));
}

module.exports = { getStudentCourses, getStudentCourseProgress, getStudentSectionQuestions, getStudentCourseChapters };
