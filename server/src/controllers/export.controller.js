const prisma = require('../lib/prisma');

const HEADERS = [
  'Student Name',
  'Email',
  'Sections Completed',
  'Avg Session Length (min)',
  'Total Time in Course',
  'Questions Per Session',
  'Sections Per Session',
  'Current Streak',
  'Correct Answer Rate (%)',
  'Avg Attempts Per Question',
  'Last Active',
  'Total XP',
  'Exam Bonus Points',
];

function csvEscape(value) {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCsv(fields) {
  return fields.map(csvEscape).join(',');
}

function formatDuration(totalMs) {
  const totalMin = Math.round(totalMs / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function xpToExamBonus(xp) {
  if (xp >= 5000) return 4;
  if (xp >= 2500) return 2;
  if (xp >= 1000) return 1;
  return 0;
}

function mean(values) {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

async function exportStudentsCsv(req, res) {
  const teacherId = req.user.sub;

  const courses = await prisma.course.findMany({
    where: { teacherId },
    orderBy: { name: 'asc' },
  });

  const BOM = '﻿';
  const CRLF = '\r\n';
  const lines = [];

  for (const course of courses) {
    const enrollments = await prisma.studentCourse.findMany({
      where: { courseId: course.id },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { student: { name: 'asc' } },
    });

    lines.push(rowToCsv([`Course: ${course.name}`]));
    lines.push('');
    lines.push(rowToCsv(HEADERS));

    if (enrollments.length === 0) {
      lines.push('(No students enrolled)');
      lines.push('');
      lines.push('');
      continue;
    }

    const studentIds = enrollments.map(e => e.studentId);

    const sessions = await prisma.session.findMany({
      where: { courseId: course.id, studentId: { in: studentIds } },
    });

    const chapters = await prisma.chapter.findMany({
      where: { courseId: course.id },
      select: { id: true },
    });
    const chapterIds = chapters.map(c => c.id);

    const sections = await prisma.section.findMany({
      where: { chapterId: { in: chapterIds } },
      select: { id: true },
    });
    const sectionIds = sections.map(s => s.id);

    // Build questionId → maxScore map (one fetch, no per-attempt includes)
    const questions = await prisma.question.findMany({
      where: { sectionIds: { hasSome: sectionIds } },
      select: { id: true, type: true, choices: { select: { blankIndex: true } } },
    });
    const questionMaxScore = new Map();
    for (const q of questions) {
      if (q.type === 'MULTIPLE_CHOICE') {
        questionMaxScore.set(q.id, 1);
      } else {
        const blanks = new Set(q.choices.map(c => c.blankIndex));
        questionMaxScore.set(q.id, blanks.size);
      }
    }

    const sessionIds = sessions.map(s => s.id);
    const attempts = sessionIds.length > 0
      ? await prisma.questionAttempt.findMany({
          where: { sessionId: { in: sessionIds } },
        })
      : [];

    const studentSections = sectionIds.length > 0
      ? await prisma.studentSection.findMany({
          where: { sectionId: { in: sectionIds }, studentId: { in: studentIds } },
        })
      : [];

    // Group by studentId
    const sessionsByStudent = new Map();
    for (const s of sessions) {
      if (!sessionsByStudent.has(s.studentId)) sessionsByStudent.set(s.studentId, []);
      sessionsByStudent.get(s.studentId).push(s);
    }

    const attemptsByStudent = new Map();
    for (const a of attempts) {
      if (!attemptsByStudent.has(a.studentId)) attemptsByStudent.set(a.studentId, []);
      attemptsByStudent.get(a.studentId).push(a);
    }

    const sectionsByStudent = new Map();
    for (const ss of studentSections) {
      if (!sectionsByStudent.has(ss.studentId)) sectionsByStudent.set(ss.studentId, []);
      sectionsByStudent.get(ss.studentId).push(ss);
    }

    for (const enrollment of enrollments) {
      const { student, streak } = enrollment;
      const sid = student.id;

      const mySessions = sessionsByStudent.get(sid) || [];
      const completed = mySessions.filter(s => s.endedAt != null);
      const myAttempts = attemptsByStudent.get(sid) || [];
      const mySections = sectionsByStudent.get(sid) || [];

      const durations = completed.map(s => new Date(s.endedAt) - new Date(s.startedAt));

      const avgSessionLengthMs = mean(durations);
      const avgSessionLength = avgSessionLengthMs != null
        ? (avgSessionLengthMs / 60000).toFixed(1)
        : '';

      const totalTimeMs = durations.reduce((a, b) => a + b, 0);
      const totalTime = completed.length > 0 ? formatDuration(totalTimeMs) : '';

      const avgQPerSession = mean(completed.map(s => s.questionsAnswered));
      const questionsPerSession = avgQPerSession != null ? avgQPerSession.toFixed(1) : '';

      const sectionsCompleted = mySections.length;

      const sectionsPerSession = completed.length > 0
        ? (sectionsCompleted / completed.length).toFixed(2)
        : '';

      let correctRate = '';
      let avgAttemptsPerQuestion = '';
      if (myAttempts.length > 0) {
        let totalScore = 0;
        let totalPossible = 0;
        for (const a of myAttempts) {
          const max = questionMaxScore.get(a.questionId) ?? 1;
          totalScore += a.score;
          totalPossible += max;
        }
        if (totalPossible > 0) {
          correctRate = `${((totalScore / totalPossible) * 100).toFixed(1)}%`;
        }

        const distinctQuestions = new Set(myAttempts.map(a => a.questionId)).size;
        avgAttemptsPerQuestion = (myAttempts.length / distinctQuestions).toFixed(2);
      }

      let lastActive = '';
      if (mySessions.length > 0) {
        const latest = mySessions.reduce((a, b) =>
          new Date(a.startedAt) > new Date(b.startedAt) ? a : b);
        lastActive = new Date(latest.startedAt).toLocaleDateString('en-US');
      }

      const xp = enrollment.currentPoints ?? 0;
      lines.push(rowToCsv([
        student.name,
        student.email,
        String(sectionsCompleted),
        avgSessionLength,
        totalTime,
        questionsPerSession,
        sectionsPerSession,
        String(streak),
        correctRate,
        avgAttemptsPerQuestion,
        lastActive,
        String(xp),
        String(xpToExamBonus(xp)),
      ]));
    }

    lines.push('');
    lines.push('');
  }

  const csv = BOM + lines.join(CRLF);
  const date = new Date().toISOString().slice(0, 10);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="student-report-${date}.csv"`);
  res.send(csv);
}

async function exportChapterCsv(req, res) {
  const teacherId = req.user.sub;
  const { chapterId } = req.params;
  const { courseClassId } = req.query;

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { course: { select: { teacherId: true, name: true } } },
  });
  if (!chapter || chapter.course.teacherId !== teacherId)
    return res.status(404).json({ error: 'Not found' });

  const sections = await prisma.section.findMany({
    where: { chapterId },
    orderBy: { orderIndex: 'asc' },
    include: {
      questions: { select: { id: true, content: true, type: true, choices: { select: { blankIndex: true } } } },
    },
  });
  const sectionIds = sections.map(s => s.id);

  const questionMaxScore = new Map();
  const allQuestionIds = [];
  for (const sec of sections) {
    for (const q of sec.questions) {
      if (!questionMaxScore.has(q.id)) {
        const max = q.type === 'MULTIPLE_CHOICE' ? 1 : new Set(q.choices.map(c => c.blankIndex)).size || 1;
        questionMaxScore.set(q.id, max);
        allQuestionIds.push(q.id);
      }
    }
  }

  let students = [];
  if (courseClassId) {
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { courseClassId },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { student: { name: 'asc' } },
    });
    students = enrollments.map(e => e.student);
  } else if (sectionIds.length > 0) {
    const ss = await prisma.studentSection.findMany({
      where: { sectionId: { in: sectionIds } },
      include: { student: { select: { id: true, name: true, email: true } } },
    });
    const seen = new Set();
    for (const s of ss) {
      if (!seen.has(s.studentId)) { seen.add(s.studentId); students.push(s.student); }
    }
    students.sort((a, b) => a.name.localeCompare(b.name));
  }

  const studentIds = students.map(s => s.id);
  const totalStudents = students.length;

  const studentSections = sectionIds.length > 0 && studentIds.length > 0
    ? await prisma.studentSection.findMany({ where: { sectionId: { in: sectionIds }, studentId: { in: studentIds } } })
    : [];

  const attempts = allQuestionIds.length > 0 && studentIds.length > 0
    ? await prisma.questionAttempt.findMany({ where: { questionId: { in: allQuestionIds }, studentId: { in: studentIds } } })
    : [];

  // Section completion/score stats
  const sectionCompletedCount = new Map();
  const sectionScores = new Map();
  for (const ss of studentSections) {
    sectionCompletedCount.set(ss.sectionId, (sectionCompletedCount.get(ss.sectionId) ?? 0) + 1);
    if (!sectionScores.has(ss.sectionId)) sectionScores.set(ss.sectionId, []);
    sectionScores.get(ss.sectionId).push(ss.score);
  }

  // Per-question stats
  const qAnswered = new Map();
  const qScoreData = new Map();
  for (const a of attempts) {
    if (!qAnswered.has(a.questionId)) qAnswered.set(a.questionId, new Set());
    qAnswered.get(a.questionId).add(a.studentId);
    if (!qScoreData.has(a.questionId)) qScoreData.set(a.questionId, { totalScore: 0, totalPossible: 0 });
    const entry = qScoreData.get(a.questionId);
    entry.totalScore += a.score;
    entry.totalPossible += questionMaxScore.get(a.questionId) ?? 1;
  }

  const BOM = '﻿';
  const CRLF = '\r\n';
  const lines = [];

  const classLabel = courseClassId ? ` | Class ${courseClassId}` : '';
  lines.push(rowToCsv([`Chapter: ${chapter.name}`]));
  lines.push(rowToCsv([`Course: ${chapter.course.name}${classLabel}`]));
  lines.push(rowToCsv([`Students: ${totalStudents}`]));
  lines.push('');

  lines.push(rowToCsv(['SECTION SUMMARY']));
  lines.push(rowToCsv(['Section', 'Questions', 'Completed', 'Completion %', 'Avg Score %']));
  for (const sec of sections) {
    const completed = sectionCompletedCount.get(sec.id) ?? 0;
    const completionPct = totalStudents > 0 ? ((completed / totalStudents) * 100).toFixed(1) : '';
    const scores = sectionScores.get(sec.id) ?? [];
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '';
    lines.push(rowToCsv([
      sec.name,
      String(sec.questions.length),
      String(completed),
      completionPct ? `${completionPct}%` : '',
      avgScore ? `${avgScore}%` : '',
    ]));
  }

  lines.push('');
  lines.push(rowToCsv(['QUESTIONS BREAKDOWN']));
  lines.push(rowToCsv(['Section', 'Question', 'Type', 'Students Answered', 'Accuracy %']));
  for (const sec of sections) {
    for (const q of sec.questions) {
      const answered = qAnswered.get(q.id)?.size ?? 0;
      const s = qScoreData.get(q.id);
      const accuracy = s && s.totalPossible > 0 ? ((s.totalScore / s.totalPossible) * 100).toFixed(1) : '';
      const preview = q.content.length > 80 ? q.content.slice(0, 80) + '...' : q.content;
      lines.push(rowToCsv([sec.name, preview, q.type, String(answered), accuracy ? `${accuracy}%` : '']));
    }
  }

  const csv = BOM + lines.join(CRLF);
  const date = new Date().toISOString().slice(0, 10);
  const safeName = chapter.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="chapter-${safeName}-${date}.csv"`);
  res.send(csv);
}

async function exportSectionCsv(req, res) {
  const teacherId = req.user.sub;
  const { sectionId } = req.params;
  const { courseClassId } = req.query;

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: {
      chapter: { include: { course: { select: { teacherId: true, name: true } } } },
      questions: { select: { id: true, content: true, type: true, choices: { select: { blankIndex: true } } } },
    },
  });
  if (!section || section.chapter.course.teacherId !== teacherId)
    return res.status(404).json({ error: 'Not found' });

  const questionMaxScore = new Map();
  for (const q of section.questions) {
    const max = q.type === 'MULTIPLE_CHOICE' ? 1 : new Set(q.choices.map(c => c.blankIndex)).size || 1;
    questionMaxScore.set(q.id, max);
  }
  const questionIds = section.questions.map(q => q.id);

  let students = [];
  const xpByStudentId = new Map();
  if (courseClassId) {
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { courseClassId },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { student: { name: 'asc' } },
    });
    for (const e of enrollments) {
      students.push(e.student);
      xpByStudentId.set(e.studentId, e.currentPoints ?? 0);
    }
  } else {
    const ss = await prisma.studentSection.findMany({
      where: { sectionId },
      include: { student: { select: { id: true, name: true, email: true } } },
    });
    const seen = new Set();
    for (const s of ss) {
      if (!seen.has(s.studentId)) { seen.add(s.studentId); students.push(s.student); }
    }
    students.sort((a, b) => a.name.localeCompare(b.name));
    const courseId = section.chapter.courseId;
    if (courseId) {
      const studentIds = students.map(s => s.id);
      const courseEnrollments = studentIds.length > 0
        ? await prisma.studentCourse.findMany({ where: { courseId, studentId: { in: studentIds } }, select: { studentId: true, currentPoints: true } })
        : [];
      for (const e of courseEnrollments) xpByStudentId.set(e.studentId, e.currentPoints ?? 0);
    }
  }

  const studentIds = students.map(s => s.id);

  const studentSectionRecords = studentIds.length > 0
    ? await prisma.studentSection.findMany({ where: { sectionId, studentId: { in: studentIds } } })
    : [];
  const studentSectionMap = new Map();
  for (const ss of studentSectionRecords) studentSectionMap.set(ss.studentId, ss);

  const attempts = questionIds.length > 0 && studentIds.length > 0
    ? await prisma.questionAttempt.findMany({ where: { questionId: { in: questionIds }, studentId: { in: studentIds } } })
    : [];

  const studentAttemptCount = new Map();
  const qAnswered = new Map();
  const qScoreData = new Map();
  for (const a of attempts) {
    studentAttemptCount.set(a.studentId, (studentAttemptCount.get(a.studentId) ?? 0) + 1);
    if (!qAnswered.has(a.questionId)) qAnswered.set(a.questionId, new Set());
    qAnswered.get(a.questionId).add(a.studentId);
    if (!qScoreData.has(a.questionId)) qScoreData.set(a.questionId, { totalScore: 0, totalPossible: 0 });
    const entry = qScoreData.get(a.questionId);
    entry.totalScore += a.score;
    entry.totalPossible += questionMaxScore.get(a.questionId) ?? 1;
  }

  const BOM = '﻿';
  const CRLF = '\r\n';
  const lines = [];

  lines.push(rowToCsv([`Section: ${section.name}`]));
  lines.push(rowToCsv([`Chapter: ${section.chapter.name} | Course: ${section.chapter.course.name}`]));
  lines.push('');

  lines.push(rowToCsv(['STUDENT RESULTS']));
  lines.push(rowToCsv(['Student Name', 'Email', 'Completed', 'Score (%)', 'Attempts', 'Total XP', 'Exam Bonus Points']));
  for (const student of students) {
    const ss = studentSectionMap.get(student.id);
    const completed = ss ? 'Yes' : 'No';
    const score = ss != null ? `${ss.score}%` : '';
    const attemptCount = String(studentAttemptCount.get(student.id) ?? 0);
    const xp = xpByStudentId.get(student.id) ?? 0;
    lines.push(rowToCsv([student.name, student.email, completed, score, attemptCount, String(xp), String(xpToExamBonus(xp))]));
  }

  lines.push('');
  lines.push(rowToCsv(['QUESTIONS BREAKDOWN']));
  lines.push(rowToCsv(['Question', 'Type', 'Students Answered', 'Accuracy %']));
  for (const q of section.questions) {
    const answered = qAnswered.get(q.id)?.size ?? 0;
    const s = qScoreData.get(q.id);
    const accuracy = s && s.totalPossible > 0 ? ((s.totalScore / s.totalPossible) * 100).toFixed(1) : '';
    const preview = q.content.length > 80 ? q.content.slice(0, 80) + '...' : q.content;
    lines.push(rowToCsv([preview, q.type, String(answered), accuracy ? `${accuracy}%` : '']));
  }

  const csv = BOM + lines.join(CRLF);
  const date = new Date().toISOString().slice(0, 10);
  const safeName = section.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="section-${safeName}-${date}.csv"`);
  res.send(csv);
}

module.exports = { exportStudentsCsv, exportChapterCsv, exportSectionCsv };
