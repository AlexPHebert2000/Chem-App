const prisma = require('../lib/prisma');

function getWeekBounds() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon...
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMonday));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 7);
  return { weekStart: monday, weekEnd: sunday };
}

function maxScoreForQuestion(q) {
  if (q.type === 'MULTIPLE_CHOICE' || q.type === 'DYNAMIC') return 1;
  return new Set(q.choices.map(c => c.blankIndex)).size;
}

async function getWeeklyStats(req, res) {
  const studentId = req.user.sub;
  const { courseClassId } = req.query;
  const { weekStart, weekEnd } = getWeekBounds();

  const sessionWhere = {
    studentId,
    startedAt: { gte: weekStart, lt: weekEnd },
    ...(courseClassId && { courseClassId }),
  };

  const sessions = await prisma.session.findMany({
    where: { ...sessionWhere, endedAt: { not: null } },
    select: { startedAt: true, endedAt: true, pointsEarned: true },
  });

  const minutesActive = Math.round(
    sessions.reduce((sum, s) => sum + (new Date(s.endedAt) - new Date(s.startedAt)), 0) / 60000
  );

  const xpEarned = sessions.reduce((sum, s) => sum + s.pointsEarned, 0);

  // Get session IDs for the week (including open sessions)
  const weekSessionIds = (
    await prisma.session.findMany({ where: sessionWhere, select: { id: true } })
  ).map(s => s.id);

  const attempts = await prisma.questionAttempt.findMany({
    where: { studentId, sessionId: { in: weekSessionIds } },
    include: { question: { include: { choices: { select: { blankIndex: true } } } } },
    orderBy: { attemptedAt: 'asc' },
  });

  const questionsAttempted = attempts.length;
  let correctCount = 0;
  let firstTryCorrect = 0;
  const seenQuestions = new Set();

  for (const a of attempts) {
    const max = maxScoreForQuestion(a.question);
    const isCorrect = a.score === max;
    if (isCorrect) correctCount++;
    if (!seenQuestions.has(a.questionId)) {
      seenQuestions.add(a.questionId);
      if (isCorrect) firstTryCorrect++;
    }
  }

  const percentCorrect = questionsAttempted > 0
    ? Math.round((correctCount / questionsAttempted) * 100)
    : 0;

  const perfectQuizzes = await prisma.sectionAttempt.count({
    where: { studentId, completedAt: { gte: weekStart, lt: weekEnd }, score: 100 },
  });

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { weeklyMinuteGoal: true },
  });

  res.json({
    minutesActive,
    xpEarned,
    questionsAttempted,
    percentCorrect,
    firstTryCorrect,
    perfectQuizzes,
    weeklyMinuteGoal: student?.weeklyMinuteGoal ?? 60,
  });
}

async function getQuestionStats(req, res) {
  const { questionId } = req.params;
  const teacherId = req.user.sub;

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { choices: { select: { blankIndex: true } } },
  });
  if (!question) return res.status(404).json({ error: 'Question not found' });
  if (question.teacherId !== teacherId) return res.status(403).json({ error: 'You do not own this question' });

  const max = maxScoreForQuestion(question);
  const allAttempts = await prisma.questionAttempt.findMany({
    where: { questionId },
    orderBy: { attemptedAt: 'asc' },
  });

  // All-time success rate
  const allCorrect = allAttempts.filter(a => a.score === max).length;
  const allTimeSuccessRate = allAttempts.length > 0
    ? Math.round((allCorrect / allAttempts.length) * 100)
    : null;

  // Retries: per student, count attempts before first correct
  const attemptsByStudent = new Map();
  for (const a of allAttempts) {
    if (!attemptsByStudent.has(a.studentId)) attemptsByStudent.set(a.studentId, []);
    attemptsByStudent.get(a.studentId).push(a);
  }

  const retriesPerStudent = [];
  for (const [, studentAttempts] of attemptsByStudent) {
    const firstCorrectIdx = studentAttempts.findIndex(a => a.score === max);
    if (firstCorrectIdx >= 0) retriesPerStudent.push(firstCorrectIdx); // 0 = got it first try
  }

  const avgRetries = retriesPerStudent.length > 0
    ? +(retriesPerStudent.reduce((s, v) => s + v, 0) / retriesPerStudent.length).toFixed(1)
    : null;
  const maxRetries = retriesPerStudent.length > 0 ? Math.max(...retriesPerStudent) : null;

  // Class success rate: students enrolled in this teacher's courses
  const teacherCourses = await prisma.course.findMany({ where: { teacherId }, select: { id: true } });
  const teacherCourseIds = teacherCourses.map(c => c.id);
  const enrolledStudentIds = (
    await prisma.studentEnrollment.findMany({
      where: { courseClass: { courseId: { in: teacherCourseIds } } },
      select: { studentId: true },
    })
  ).map(e => e.studentId);

  const classAttempts = allAttempts.filter(a => enrolledStudentIds.includes(a.studentId));
  const classCorrect = classAttempts.filter(a => a.score === max).length;
  const classSuccessRate = classAttempts.length > 0
    ? Math.round((classCorrect / classAttempts.length) * 100)
    : null;

  res.json({ allTimeSuccessRate, classSuccessRate, avgRetries, maxRetries, totalAttempts: allAttempts.length });
}

async function getSuggestedReviews(req, res) {
  const studentId = req.user.sub;
  const { courseClassId } = req.query;

  // Get all completed sections for this student (optionally filtered to a course)
  let completedSections = await prisma.studentSection.findMany({
    where: { studentId, completedAt: { not: null } },
    include: { section: { select: { id: true, name: true, chapterId: true } } },
  });

  if (courseClassId) {
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId, courseClassId },
      include: { courseClass: { select: { courseId: true } } },
    });
    if (!enrollment) return res.json([]);

    const courseId = enrollment.courseClass.courseId;
    const chapters = await prisma.chapter.findMany({ where: { courseId }, select: { id: true } });
    const chapterIds = chapters.map(c => c.id);
    completedSections = completedSections.filter(cs => chapterIds.includes(cs.section.chapterId));
  }

  if (!completedSections.length) return res.json([]);

  const sectionIds = completedSections.map(cs => cs.sectionId);

  // Get most recent SectionAttempt per section
  const recentAttempts = await prisma.sectionAttempt.findMany({
    where: { studentId, sectionId: { in: sectionIds } },
    orderBy: { completedAt: 'desc' },
  });

  const latestBySection = new Map();
  for (const a of recentAttempts) {
    if (!latestBySection.has(a.sectionId)) latestBySection.set(a.sectionId, a);
  }

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setUTCDate(twoWeeksAgo.getUTCDate() - 14);

  const suggestions = completedSections
    .map(cs => {
      const latest = latestBySection.get(cs.sectionId);
      const score = latest?.score ?? cs.score;
      const lastAttemptedAt = latest?.completedAt ?? cs.completedAt;
      return { sectionId: cs.sectionId, name: cs.section.name, score, lastAttemptedAt };
    })
    .filter(s => {
      if (s.score < 60) return true;
      if (s.score < 80 && new Date(s.lastAttemptedAt) < twoWeeksAgo) return true;
      return false;
    })
    .sort((a, b) => {
      if (a.score < 60 && b.score >= 60) return -1;
      if (a.score >= 60 && b.score < 60) return 1;
      return a.score - b.score;
    })
    .slice(0, 10);

  res.json(suggestions);
}

module.exports = { getWeeklyStats, getQuestionStats, getSuggestedReviews };
