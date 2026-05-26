const crypto = require('crypto');
const prisma = require('../lib/prisma');

function generateCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function getTeacherCourses(req, res) {
  const courses = await prisma.course.findMany({
    where: { teacherId: req.user.sub },
    orderBy: { name: 'asc' },
  });
  res.json(courses);
}

async function createCourse(req, res) {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const course = await prisma.course.create({
    data: { name: name.trim(), teacherId: req.user.sub },
  });

  res.status(201).json(course);
}

async function requestJoin(req, res) {
  const { courseId } = req.params;
  const studentId = req.user.sub;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const alreadyEnrolled = await prisma.studentCourse.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  });
  if (alreadyEnrolled) return res.status(409).json({ error: 'Already enrolled in this course' });

  const existing = await prisma.joinRequest.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  });
  if (existing) return res.status(409).json({ error: 'Join request already submitted' });

  const joinRequest = await prisma.joinRequest.create({
    data: { studentId, courseId },
  });

  res.status(201).json(joinRequest);
}

async function approveJoin(req, res) {
  const { courseId, requestId } = req.params;
  const teacherId = req.user.sub;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (course.teacherId !== teacherId) return res.status(403).json({ error: 'You do not own this course' });

  const joinRequest = await prisma.joinRequest.findUnique({ where: { id: requestId } });
  if (!joinRequest || joinRequest.courseId !== courseId) return res.status(404).json({ error: 'Join request not found' });
  if (joinRequest.status !== 'PENDING') return res.status(409).json({ error: `Join request is already ${joinRequest.status.toLowerCase()}` });

  await prisma.joinRequest.update({
    where: { id: requestId },
    data: { status: 'APPROVED' },
  });

  const enrollment = await prisma.studentCourse.create({
    data: { studentId: joinRequest.studentId, courseId },
  });

  res.status(201).json(enrollment);
}

async function getPendingJoinRequests(req, res) {
  const { courseId } = req.params;
  const teacherId = req.user.sub;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (course.teacherId !== teacherId) return res.status(403).json({ error: 'You do not own this course' });

  const requests = await prisma.joinRequest.findMany({
    where: { courseId, status: 'PENDING' },
    include: { student: { omit: { password: true } } },
    orderBy: { createdAt: 'asc' },
  });

  res.json(requests);
}

async function cloneCourse(req, res) {
  const { courseId } = req.params;
  const teacherId = req.user.sub;

  const original = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      chapters: {
        orderBy: { orderIndex: 'asc' },
        include: {
          sections: {
            orderBy: { orderIndex: 'asc' },
            include: {
              questions: {
                include: { choices: true },
              },
            },
          },
        },
      },
    },
  });

  if (!original) return res.status(404).json({ error: 'Course not found' });
  if (original.teacherId !== teacherId) return res.status(403).json({ error: 'You do not own this course' });

  const clone = await prisma.course.create({
    data: {
      teacherId,
      name: `${original.name} (Copy)`,
      chapters: {
        create: original.chapters.map(ch => ({
          name: ch.name,
          description: ch.description,
          orderIndex: ch.orderIndex,
          sections: {
            create: ch.sections.map(sec => ({
              name: sec.name,
              description: sec.description,
              orderIndex: sec.orderIndex,
              questions: {
                create: sec.questions.map(q => ({
                  type: q.type,
                  content: q.content,
                  correctExplanation: q.correctExplanation,
                  incorrectExplanation: q.incorrectExplanation,
                  difficulty: q.difficulty,
                  choices: {
                    create: q.choices.map(c => ({
                      content: c.content,
                      isCorrect: c.isCorrect,
                      blankIndex: c.blankIndex,
                    })),
                  },
                })),
              },
            })),
          },
        })),
      },
    },
  });

  res.status(201).json(clone);
}

async function createCourseClass(req, res) {
  const { courseId } = req.params;
  const { sectionNumber, meetingTimes, archiveDate } = req.body;

  if (!sectionNumber?.trim()) return res.status(400).json({ error: 'sectionNumber is required' });
  if (!meetingTimes?.trim()) return res.status(400).json({ error: 'meetingTimes is required' });

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (course.teacherId !== req.user.sub) return res.status(403).json({ error: 'You do not own this course' });

  let classCode;
  for (let i = 0; i < 10; i++) {
    const candidate = generateCode();
    const existing = await prisma.courseClass.findUnique({ where: { code: candidate } });
    if (!existing) { classCode = candidate; break; }
  }
  if (!classCode) return res.status(500).json({ error: 'Could not generate unique class code' });

  const courseClass = await prisma.courseClass.create({
    data: {
      courseId,
      sectionNumber: sectionNumber.trim(),
      meetingTimes: meetingTimes.trim(),
      code: classCode,
      archiveDate: archiveDate ? new Date(archiveDate) : null,
    },
  });

  res.status(201).json(courseClass);
}

async function getCourseClasses(req, res) {
  const { courseId } = req.params;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (course.teacherId !== req.user.sub) return res.status(403).json({ error: 'You do not own this course' });

  const classes = await prisma.courseClass.findMany({
    where: { courseId },
    include: { _count: { select: { enrollments: true } } },
  });

  const todayUTC = new Date(new Date().toISOString().slice(0, 10));

  const activeTodayCounts = await Promise.all(
    classes.map(c =>
      prisma.session.groupBy({
        by: ['studentId'],
        where: { courseClassId: c.id, startedAt: { gte: todayUTC } },
      }).then(rows => rows.length)
    )
  );

  res.json(classes.map((c, i) => ({
    id: c.id,
    courseId: c.courseId,
    sectionNumber: c.sectionNumber,
    meetingTimes: c.meetingTimes,
    code: c.code,
    archiveDate: c.archiveDate,
    enrollmentCount: c._count.enrollments,
    activeToday: activeTodayCounts[i],
  })));
}

async function patchCourseClass(req, res) {
  const { courseId, classId } = req.params;
  const { sectionNumber, meetingTimes, archiveDate } = req.body;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (course.teacherId !== req.user.sub) return res.status(403).json({ error: 'You do not own this course' });

  const courseClass = await prisma.courseClass.findUnique({ where: { id: classId } });
  if (!courseClass || courseClass.courseId !== courseId) return res.status(404).json({ error: 'Class not found' });

  const data = {};
  if (sectionNumber?.trim()) data.sectionNumber = sectionNumber.trim();
  if (meetingTimes?.trim()) data.meetingTimes = meetingTimes.trim();
  if (archiveDate !== undefined) data.archiveDate = archiveDate ? new Date(archiveDate) : null;

  if (!Object.keys(data).length) return res.status(400).json({ error: 'Provide at least one field to update' });

  const updated = await prisma.courseClass.update({ where: { id: classId }, data });
  res.json(updated);
}

async function requestJoinClass(req, res) {
  const { classId } = req.params;
  const studentId = req.user.sub;

  const courseClass = await prisma.courseClass.findUnique({ where: { id: classId } });
  if (!courseClass) return res.status(404).json({ error: 'Class not found' });

  const alreadyEnrolled = await prisma.studentEnrollment.findUnique({
    where: { studentId_courseClassId: { studentId, courseClassId: classId } },
  });
  if (alreadyEnrolled) return res.status(409).json({ error: 'Already enrolled in this class' });

  const existing = await prisma.joinRequest.findUnique({
    where: { studentId_courseClassId: { studentId, courseClassId: classId } },
  });
  if (existing) return res.status(409).json({ error: 'Join request already exists' });

  const joinRequest = await prisma.joinRequest.create({
    data: { studentId, courseClassId: classId },
  });

  res.status(201).json(joinRequest);
}

async function getPendingClassJoinRequests(req, res) {
  const { courseId, classId } = req.params;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (course.teacherId !== req.user.sub) return res.status(403).json({ error: 'You do not own this course' });

  const requests = await prisma.joinRequest.findMany({
    where: { courseClassId: classId, status: 'PENDING' },
    include: { student: { omit: { password: true } } },
  });

  res.json(requests);
}

async function approveJoinClass(req, res) {
  const { courseId, classId, requestId } = req.params;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (course.teacherId !== req.user.sub) return res.status(403).json({ error: 'You do not own this course' });

  const joinRequest = await prisma.joinRequest.findUnique({ where: { id: requestId } });
  if (!joinRequest || joinRequest.courseClassId !== classId) return res.status(404).json({ error: 'Join request not found' });
  if (joinRequest.status !== 'PENDING') return res.status(409).json({ error: 'Request already processed' });

  await prisma.joinRequest.update({ where: { id: requestId }, data: { status: 'APPROVED' } });

  const enrollment = await prisma.studentEnrollment.create({
    data: { studentId: joinRequest.studentId, courseClassId: classId },
  });

  res.status(201).json(enrollment);
}

async function enrollByCode(req, res) {
  const { code } = req.body;
  const studentId = req.user.sub;

  if (!code || !code.trim()) return res.status(400).json({ error: 'code is required' });

  const courseClass = await prisma.courseClass.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!courseClass) return res.status(404).json({ error: 'Class not found' });

  const alreadyEnrolled = await prisma.studentEnrollment.findUnique({
    where: { studentId_courseClassId: { studentId, courseClassId: courseClass.id } },
  });
  if (alreadyEnrolled) return res.status(409).json({ error: 'Already enrolled in this class' });

  const enrollment = await prisma.studentEnrollment.create({
    data: { studentId, courseClassId: courseClass.id },
  });

  res.status(201).json(enrollment);
}

async function getClassChapterStats(req, res) {
  const { courseId, classId } = req.params;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (course.teacherId !== req.user.sub) return res.status(403).json({ error: 'You do not own this course' });

  const courseClass = await prisma.courseClass.findUnique({ where: { id: classId } });
  if (!courseClass || courseClass.courseId !== courseId) {
    return res.status(404).json({ error: 'Class not found' });
  }

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { courseClassId: classId },
    select: { studentId: true },
  });
  const studentIds = enrollments.map(e => e.studentId);
  const total = studentIds.length;

  const chapters = await prisma.chapter.findMany({
    where: { courseId },
    orderBy: { orderIndex: 'asc' },
    include: { sections: { select: { id: true } } },
  });

  const chapterStats = await Promise.all(chapters.map(async ch => {
    const sectionIds = ch.sections.map(s => s.id);

    if (!sectionIds.length || !studentIds.length) {
      return { chapterId: ch.id, completedCount: 0, avgScore: null };
    }

    const completions = await prisma.studentSection.groupBy({
      by: ['studentId'],
      where: {
        sectionId: { in: sectionIds },
        studentId: { in: studentIds },
        completedAt: { not: null },
      },
      _count: { sectionId: true },
    });
    const completedCount = completions.filter(c => c._count.sectionId === sectionIds.length).length;

    const agg = await prisma.sectionAttempt.aggregate({
      where: { sectionId: { in: sectionIds }, studentId: { in: studentIds } },
      _avg: { score: true },
      _count: { id: true },
    });
    const avgScore = agg._count.id > 0 ? Math.round(agg._avg.score ?? 0) : null;

    return { chapterId: ch.id, completedCount, avgScore };
  }));

  res.json({ total, chapters: chapterStats });
}

async function getChapterClassStats(req, res) {
  const { courseId, classId, chapterId } = req.params;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (course.teacherId !== req.user.sub) return res.status(403).json({ error: 'You do not own this course' });

  const courseClass = await prisma.courseClass.findUnique({ where: { id: classId } });
  if (!courseClass || courseClass.courseId !== courseId) return res.status(404).json({ error: 'Class not found' });

  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter || chapter.courseId !== courseId) return res.status(404).json({ error: 'Chapter not found' });

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { courseClassId: classId },
    select: { studentId: true },
  });
  const studentIds = enrollments.map(e => e.studentId);
  const total = studentIds.length;

  const sectionList = await prisma.section.findMany({
    where: { chapterId },
    orderBy: { orderIndex: 'asc' },
    select: { id: true, questionIds: true },
  });

  if (!studentIds.length) {
    return res.json({
      total: 0,
      sections: sectionList.map(sec => ({
        sectionId: sec.id,
        completedCount: 0,
        avgScore: null,
        questions: (sec.questionIds ?? []).map(qId => ({ questionId: qId, answeredCount: 0, accuracy: null })),
      })),
    });
  }

  const sections = await Promise.all(sectionList.map(async sec => {
    const completedCount = await prisma.studentSection.count({
      where: { sectionId: sec.id, studentId: { in: studentIds }, completedAt: { not: null } },
    });

    const agg = await prisma.sectionAttempt.aggregate({
      where: { sectionId: sec.id, studentId: { in: studentIds } },
      _avg: { score: true },
      _count: { id: true },
    });
    const avgScore = agg._count.id > 0 ? Math.round(agg._avg.score ?? 0) : null;

    const questionIds = sec.questionIds ?? [];
    let questions = [];
    if (questionIds.length > 0) {
      const [distinctRows, avgRows] = await Promise.all([
        prisma.questionAttempt.groupBy({
          by: ['questionId', 'studentId'],
          where: { questionId: { in: questionIds }, studentId: { in: studentIds } },
        }),
        prisma.questionAttempt.groupBy({
          by: ['questionId'],
          where: { questionId: { in: questionIds }, studentId: { in: studentIds } },
          _avg: { score: true },
        }),
      ]);

      const answeredCountMap = {};
      distinctRows.forEach(r => { answeredCountMap[r.questionId] = (answeredCountMap[r.questionId] ?? 0) + 1; });
      const accuracyMap = {};
      avgRows.forEach(r => { accuracyMap[r.questionId] = Math.round((r._avg.score ?? 0) * 100); });

      questions = questionIds.map(qId => ({
        questionId: qId,
        answeredCount: answeredCountMap[qId] ?? 0,
        accuracy: accuracyMap[qId] != null ? accuracyMap[qId] : null,
      }));
    }

    return { sectionId: sec.id, completedCount, avgScore, questions };
  }));

  res.json({ total, sections });
}

module.exports = { getTeacherCourses, createCourse, cloneCourse, requestJoin, approveJoin, getPendingJoinRequests, createCourseClass, getCourseClasses, patchCourseClass, requestJoinClass, getPendingClassJoinRequests, approveJoinClass, enrollByCode, getClassChapterStats, getChapterClassStats };
