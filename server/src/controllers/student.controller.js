const prisma = require('../lib/prisma');
const {
  parseBrackets, resolveAll, renderContent,
  evaluateAnswer, generateDistractors, buildDynamicChoices,
} = require('../lib/questionTemplate');

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
    where: { id: { in: section.questionIds } },
    include: { choices: true },
  });

  const processedQuestions = await Promise.all(questions.map(async (q) => {
    if (q.type !== 'DYNAMIC') {
      return { ...q, choices: q.choices.map(({ isCorrect, ...choice }) => choice) };
    }

    const brackets = parseBrackets(q.content);
    const resolutions = resolveAll(brackets);
    const resolvedContent = renderContent(q.content, resolutions);
    const correctValue = evaluateAnswer(q.answerExpression, resolutions);
    const count = q.distractorCount ?? 3;
    const distractors = generateDistractors(correctValue, resolutions, brackets, q.answerExpression, count);
    const dynamicChoices = buildDynamicChoices(correctValue, distractors);

    await prisma.questionResolution.upsert({
      where: { studentId_questionId: { studentId, questionId: q.id } },
      update: { resolvedContent, choicesJson: JSON.stringify(dynamicChoices), createdAt: new Date() },
      create: { studentId, questionId: q.id, resolvedContent, choicesJson: JSON.stringify(dynamicChoices) },
    });

    return {
      ...q,
      content: resolvedContent,
      choices: dynamicChoices.map(({ isCorrect, ...c }) => c),
    };
  }));

  for (let i = processedQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [processedQuestions[i], processedQuestions[j]] = [processedQuestions[j], processedQuestions[i]];
  }

  res.json(processedQuestions);
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

async function patchStudentProfile(req, res) {
  const studentId = req.user.sub;
  const { name, profileImage } = req.body;

  if (name !== undefined && (!name || !name.trim())) {
    return res.status(400).json({ error: 'name cannot be blank' });
  }

  const data = {};
  if (name !== undefined) data.name = name.trim();
  if (profileImage !== undefined) data.profileImage = profileImage;

  if (!Object.keys(data).length) {
    return res.status(400).json({ error: 'Provide at least one field to update: name, profileImage' });
  }

  const student = await prisma.student.update({
    where: { id: studentId },
    data,
    omit: { password: true },
  });

  res.json(student);
}

async function getCourseLeaderboard(req, res) {
  const { courseId } = req.params;
  const { sub: userId, role } = req.user;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: 'Course not found' });

  if (role === 'TEACHER') {
    if (course.teacherId !== userId) return res.status(403).json({ error: 'You do not own this course' });
  } else {
    const enrollment = await prisma.studentCourse.findUnique({
      where: { studentId_courseId: { studentId: userId, courseId } },
    });
    if (!enrollment) return res.status(403).json({ error: 'Not enrolled in this course' });
  }

  const entries = await prisma.studentCourse.findMany({
    where: { courseId },
    orderBy: { currentPoints: 'desc' },
    include: { student: { omit: { password: true } } },
  });

  const todayUTC = new Date(new Date().toISOString().slice(0, 10));
  const yesterdayUTC = new Date(todayUTC);
  yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);

  function liveStreak(e) {
    if (!e.lastActivityDate) return 0;
    const lastUTC = new Date(e.lastActivityDate.toISOString().slice(0, 10));
    return lastUTC.getTime() >= yesterdayUTC.getTime() ? e.streak : 0;
  }

  res.json(entries.map((e, i) => ({
    rank: i + 1,
    studentId: e.studentId,
    name: e.student.name,
    currentPoints: e.currentPoints,
    lifetimePoints: e.lifetimePoints,
    streak: liveStreak(e),
    isYou: e.studentId === userId,
  })));
}

async function getStudentBadges(req, res) {
  const studentId = req.user.sub;

  const studentBadges = await prisma.studentBadge.findMany({
    where: { studentId },
    include: { badge: true },
    orderBy: { dateAchieved: 'desc' },
  });

  res.json(studentBadges);
}

async function getCourseClassLeaderboard(req, res) {
  const { courseId, classId } = req.params;
  const { sub: userId, role } = req.user;

  const courseClass = await prisma.courseClass.findUnique({ where: { id: classId } });
  if (!courseClass || courseClass.courseId !== courseId) return res.status(404).json({ error: 'Class not found' });

  if (role === 'TEACHER') {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (course.teacherId !== userId) return res.status(403).json({ error: 'You do not own this course' });
  } else {
    const enrollment = await prisma.studentEnrollment.findUnique({
      where: { studentId_courseClassId: { studentId: userId, courseClassId: classId } },
    });
    if (!enrollment) return res.status(403).json({ error: 'Not enrolled in this class' });
  }

  const entries = await prisma.studentEnrollment.findMany({
    where: { courseClassId: classId },
    orderBy: { currentPoints: 'desc' },
    include: { student: { omit: { password: true } } },
  });

  const todayUTC = new Date(new Date().toISOString().slice(0, 10));
  const yesterdayUTC = new Date(todayUTC);
  yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);

  function liveStreak(e) {
    if (!e.lastActivityDate) return 0;
    const lastUTC = new Date(e.lastActivityDate.toISOString().slice(0, 10));
    return lastUTC.getTime() >= yesterdayUTC.getTime() ? e.streak : 0;
  }

  res.json(entries.map((e, i) => ({
    rank: i + 1,
    studentId: e.studentId,
    name: e.student.name,
    currentPoints: e.currentPoints,
    lifetimePoints: e.lifetimePoints,
    streak: liveStreak(e),
    isYou: e.studentId === userId,
  })));
}

async function getStudentMe(req, res) {
  const studentId = req.user.sub;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      name: true,
      email: true,
      activeTitle: true,
      weeklyMinuteGoal: true,
      enrollments: {
        select: {
          courseClassId: true,
          streak: true,
          lifetimePoints: true,
          currentPoints: true,
          courseClass: { select: { courseId: true, sectionNumber: true, meetingTimes: true, code: true } },
        },
      },
    },
  });

  if (!student) return res.status(404).json({ error: 'Student not found' });

  const enrollmentsWithRank = await Promise.all(
    student.enrollments.map(async (e) => {
      const ahead = await prisma.studentEnrollment.count({
        where: { courseClassId: e.courseClassId, currentPoints: { gt: e.currentPoints } },
      });
      return { ...e, rank: ahead + 1 };
    })
  );
  res.json({ ...student, enrollments: enrollmentsWithRank });
}

async function setWeeklyGoal(req, res) {
  const studentId = req.user.sub;
  const { weeklyMinuteGoal } = req.body;

  if (!Number.isInteger(weeklyMinuteGoal) || weeklyMinuteGoal < 1) {
    return res.status(400).json({ error: 'weeklyMinuteGoal must be a positive integer' });
  }

  const student = await prisma.student.update({
    where: { id: studentId },
    data: { weeklyMinuteGoal },
    select: { weeklyMinuteGoal: true },
  });

  res.json({ weeklyMinuteGoal: student.weeklyMinuteGoal });
}

module.exports = { getStudentMe, getStudentCourses, getStudentCourseProgress, getStudentSectionQuestions, getStudentCourseChapters, getStudentBadges, getCourseLeaderboard, getCourseClassLeaderboard, patchStudentProfile, setWeeklyGoal };
