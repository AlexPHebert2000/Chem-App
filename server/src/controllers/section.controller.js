const prisma = require('../lib/prisma');
const { awardBadges } = require('../services/badge.service');

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
    where: { id: { in: section.questionIds } },
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
      const maxScore = (q.type === 'MULTIPLE_CHOICE' || q.type === 'DYNAMIC')
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

  // Streak calculation — compare calendar dates in UTC
  const todayUTC = new Date(now.toISOString().slice(0, 10));
  const yesterdayUTC = new Date(todayUTC);
  yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);

  const freshEnrollment = await prisma.studentCourse.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
    select: { streak: true, lastActivityDate: true },
  });

  let newStreak;
  if (!freshEnrollment.lastActivityDate) {
    newStreak = 1;
  } else {
    const lastUTC = new Date(freshEnrollment.lastActivityDate.toISOString().slice(0, 10));
    if (lastUTC.getTime() === todayUTC.getTime()) {
      newStreak = freshEnrollment.streak; // already active today
    } else if (lastUTC.getTime() === yesterdayUTC.getTime()) {
      newStreak = freshEnrollment.streak + 1;
    } else {
      newStreak = 1; // missed one or more days
    }
  }

  const updatedEnrollment = await prisma.studentCourse.update({
    where: { studentId_courseId: { studentId, courseId } },
    data: {
      currentPoints: { increment: xpEarned },
      lifetimePoints: { increment: xpEarned },
      currentSectionId: nextSection?.id ?? null,
      streak: newStreak,
      lastActivityDate: now,
    },
  });

  await awardBadges(studentId);

  res.json({
    studentSection,
    xpEarned,
    nextSectionId: nextSection?.id ?? null,
    currentPoints: updatedEnrollment.currentPoints,
    streak: updatedEnrollment.streak,
  });
}

async function addQuestionToSection(req, res) {
  const { sectionId, questionId } = req.params;
  const teacherId = req.user.sub;

  // Verify teacher owns the section
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) return res.status(404).json({ error: 'Section not found' });

  const chapter = await prisma.chapter.findUnique({ where: { id: section.chapterId } });
  const course = await prisma.course.findUnique({ where: { id: chapter.courseId } });
  if (course.teacherId !== teacherId) return res.status(403).json({ error: 'You do not own this course' });

  // Verify teacher owns the question
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) return res.status(404).json({ error: 'Question not found' });
  if (question.teacherId !== teacherId) return res.status(403).json({ error: 'You do not own this question' });

  // Check question isn't already in the section
  if (section.questionIds.includes(questionId)) {
    return res.status(409).json({ error: 'Question is already in this section' });
  }

  await prisma.section.update({
    where: { id: sectionId },
    data: { questionIds: { push: questionId } },
  });
  await prisma.question.update({
    where: { id: questionId },
    data: { sectionIds: { push: sectionId } },
  });

  res.json({ message: 'Question added to section' });
}

async function removeQuestionFromSection(req, res) {
  const { sectionId, questionId } = req.params;
  const teacherId = req.user.sub;

  // Verify teacher owns the section
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) return res.status(404).json({ error: 'Section not found' });

  const chapter = await prisma.chapter.findUnique({ where: { id: section.chapterId } });
  const course = await prisma.course.findUnique({ where: { id: chapter.courseId } });
  if (course.teacherId !== teacherId) return res.status(403).json({ error: 'You do not own this course' });

  // Verify teacher owns the question
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) return res.status(404).json({ error: 'Question not found' });
  if (question.teacherId !== teacherId) return res.status(403).json({ error: 'You do not own this question' });

  await prisma.section.update({
    where: { id: sectionId },
    data: { questionIds: { set: section.questionIds.filter(id => id !== questionId) } },
  });
  await prisma.question.update({
    where: { id: questionId },
    data: { sectionIds: { set: question.sectionIds.filter(id => id !== sectionId) } },
  });

  res.json({ message: 'Question removed from section' });
}

module.exports = { completeSection, addQuestionToSection, removeQuestionFromSection };
