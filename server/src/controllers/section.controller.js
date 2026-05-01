const prisma = require('../lib/prisma');

async function findNextSection(sectionOrderIndex, chapter) {
  const nextInChapter = await prisma.section.findFirst({
    where: { chapterId: chapter.id, orderIndex: { gt: sectionOrderIndex } },
    orderBy: { orderIndex: 'asc' },
  });
  if (nextInChapter) return nextInChapter;

  const nextChapter = await prisma.chapter.findFirst({
    where: { courseId: chapter.courseId, orderIndex: { gt: chapter.orderIndex } },
    orderBy: { orderIndex: 'asc' },
  });
  if (!nextChapter) return null;

  return prisma.section.findFirst({
    where: { chapterId: nextChapter.id },
    orderBy: { orderIndex: 'asc' },
  });
}

async function completeSection(req, res) {
  const { sectionId } = req.params;
  const studentId = req.user.sub;

  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) return res.status(404).json({ error: 'Section not found' });

  const chapter = await prisma.chapter.findUnique({ where: { id: section.chapterId } });
  const courseId = chapter.courseId;

  const enrollment = await prisma.studentCourse.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  });
  if (!enrollment) return res.status(403).json({ error: 'Not enrolled in this course' });

  const existing = await prisma.studentSection.findUnique({
    where: { studentId_sectionId: { studentId, sectionId } },
  });
  if (existing?.completedAt) return res.status(409).json({ error: 'Section already completed' });

  // Aggregate XP from the latest attempt per question
  const questions = await prisma.question.findMany({
    where: { sectionId },
    select: { id: true, difficulty: true, type: true, choices: { select: { blankIndex: true } } },
  });

  let xpEarned = 0;
  let correctCount = 0;

  if (questions.length > 0) {
    const attempts = await prisma.questionAttempt.findMany({
      where: { studentId, questionId: { in: questions.map(q => q.id) } },
      orderBy: { attemptedAt: 'desc' },
    });

    const latestByQuestion = new Map();
    for (const a of attempts) {
      if (!latestByQuestion.has(a.questionId)) latestByQuestion.set(a.questionId, a);
    }

    for (const q of questions) {
      const attempt = latestByQuestion.get(q.id);
      if (!attempt) continue;
      const maxScore = q.type === 'MULTIPLE_CHOICE'
        ? 1
        : new Set(q.choices.map(c => c.blankIndex)).size;
      if (attempt.score === maxScore) {
        xpEarned += q.difficulty * 10;
        correctCount++;
      }
    }
  }

  const sectionScore = questions.length > 0
    ? Math.round((correctCount / questions.length) * 100)
    : 0;

  const now = new Date();
  const studentSection = await prisma.studentSection.upsert({
    where: { studentId_sectionId: { studentId, sectionId } },
    update: { completedAt: now, score: sectionScore },
    create: { studentId, sectionId, completedAt: now, score: sectionScore },
  });

  const nextSection = await findNextSection(section.orderIndex, chapter);

  const updatedEnrollment = await prisma.studentCourse.update({
    where: { studentId_courseId: { studentId, courseId } },
    data: {
      currentPoints: { increment: xpEarned },
      lifetimePoints: { increment: xpEarned },
      currentSectionId: nextSection?.id ?? null,
    },
  });

  res.json({
    studentSection,
    xpEarned,
    nextSectionId: nextSection?.id ?? null,
    currentPoints: updatedEnrollment.currentPoints,
  });
}

module.exports = { completeSection };
