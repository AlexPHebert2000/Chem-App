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
      where: { sectionId: { in: sectionIds } },
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

module.exports = { exportStudentsCsv };
