const prisma = require('../lib/prisma');

const QUESTION_TYPES = ['MULTIPLE_CHOICE', 'FILL_IN_BLANK'];

async function ownedSection(sectionId, teacherId) {
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) return { error: 'Section not found', status: 404 };

  const chapter = await prisma.chapter.findUnique({ where: { id: section.chapterId } });
  const course = await prisma.course.findUnique({ where: { id: chapter.courseId } });
  if (course.teacherId !== teacherId) return { error: 'You do not own this course', status: 403 };

  return { section };
}

function validateMultipleChoice(choices) {
  if (!Array.isArray(choices) || choices.length < 2) {
    return 'choices must be an array of at least 2 options';
  }
  for (let i = 0; i < choices.length; i++) {
    if (!choices[i].content || !choices[i].content.trim()) {
      return `choice at position ${i} is missing content`;
    }
  }
  const correctCount = choices.filter(c => c.isCorrect === true).length;
  if (correctCount !== 1) {
    return 'exactly one choice must be marked as correct';
  }
  return null;
}

function validateFillInBlank(choices) {
  if (!Array.isArray(choices) || choices.length === 0) {
    return 'choices must be a non-empty array';
  }
  for (let i = 0; i < choices.length; i++) {
    const c = choices[i];
    if (!c.content || !c.content.trim()) return `choice at index ${i} is missing content`;
    if (!Number.isInteger(c.blankIndex) || c.blankIndex < 0) return `choice at index ${i} must have a non-negative integer blankIndex`;
  }

  const blanks = {};
  for (const c of choices) {
    if (!blanks[c.blankIndex]) blanks[c.blankIndex] = [];
    blanks[c.blankIndex].push(c);
  }

  for (const [blankIndex, blankChoices] of Object.entries(blanks)) {
    if (blankChoices.length < 2) return `blank ${blankIndex} must have at least 2 choices`;
    const correctCount = blankChoices.filter(c => c.isCorrect === true).length;
    if (correctCount !== 1) return `blank ${blankIndex} must have exactly one correct choice`;
  }

  return null;
}

function buildChoices(type, choices) {
  if (type === 'MULTIPLE_CHOICE') {
    return choices.map((c, i) => ({
      content: c.content.trim(),
      position: i,
      isCorrect: c.isCorrect === true,
      blankIndex: 0,
    }));
  }

  const positionPerBlank = {};
  return choices.map(c => {
    const pos = positionPerBlank[c.blankIndex] ?? 0;
    positionPerBlank[c.blankIndex] = pos + 1;
    return {
      content: c.content.trim(),
      position: pos,
      isCorrect: c.isCorrect === true,
      blankIndex: c.blankIndex,
    };
  });
}

async function getSectionQuestions(req, res) {
  const { sectionId } = req.params;
  const { error, status } = await ownedSection(sectionId, req.user.sub);
  if (error) return res.status(status).json({ error });

  const questions = await prisma.question.findMany({
    where: { sectionId },
    orderBy: { orderIndex: 'asc' },
    include: { choices: { orderBy: { position: 'asc' } } },
  });
  res.json(questions);
}

async function createQuestion(req, res) {
  const { sectionId } = req.params;
  const { type, content, solutionExplanation, difficulty, choices } = req.body;
  const errors = [];

  if (!type || !QUESTION_TYPES.includes(type)) errors.push(`type must be one of: ${QUESTION_TYPES.join(', ')}`);
  if (!content || !content.trim()) errors.push('content is required');
  if (!solutionExplanation || !solutionExplanation.trim()) errors.push('solutionExplanation is required');
  if (difficulty === undefined || !Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) errors.push('difficulty must be an integer between 1 and 5');

  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const choiceError = type === 'FILL_IN_BLANK'
    ? validateFillInBlank(choices)
    : validateMultipleChoice(choices);
  if (choiceError) return res.status(400).json({ error: choiceError });

  const { error, status } = await ownedSection(sectionId, req.user.sub);
  if (error) return res.status(status).json({ error });

  const orderIndex = await prisma.question.count({ where: { sectionId } });

  const question = await prisma.question.create({
    data: {
      sectionId,
      type,
      content: content.trim(),
      solutionExplanation: solutionExplanation.trim(),
      orderIndex,
      difficulty,
      choices: { create: buildChoices(type, choices) },
    },
    include: { choices: true },
  });

  res.status(201).json(question);
}

async function attemptQuestion(req, res) {
  const { questionId } = req.params;
  const { sessionId, choiceIds } = req.body;
  const studentId = req.user.sub;

  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
  if (!Array.isArray(choiceIds) || choiceIds.length === 0) {
    return res.status(400).json({ error: 'choiceIds must be a non-empty array' });
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { choices: true },
  });
  if (!question) return res.status(404).json({ error: 'Question not found' });

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.studentId !== studentId) return res.status(404).json({ error: 'Session not found' });
  if (session.endedAt) return res.status(409).json({ error: 'Session has already ended' });

  // Verify the question belongs to the session's course
  const section = await prisma.section.findUnique({ where: { id: question.sectionId } });
  const chapter = await prisma.chapter.findUnique({ where: { id: section.chapterId } });
  if (chapter.courseId !== session.courseId) {
    return res.status(403).json({ error: 'Question does not belong to the session course' });
  }

  const enrollment = await prisma.studentCourse.findUnique({
    where: { studentId_courseId: { studentId, courseId: session.courseId } },
  });
  if (!enrollment) return res.status(403).json({ error: 'Not enrolled in this course' });

  // Validate all submitted choices belong to this question
  const choiceMap = new Map(question.choices.map(c => [c.id, c]));
  for (const choiceId of choiceIds) {
    if (!choiceMap.has(choiceId)) {
      return res.status(400).json({ error: `Choice ${choiceId} does not belong to this question` });
    }
  }

  // Type-specific submission validation
  if (question.type === 'MULTIPLE_CHOICE') {
    if (choiceIds.length !== 1) {
      return res.status(400).json({ error: 'Multiple choice questions require exactly one choice' });
    }
  } else if (question.type === 'FILL_IN_BLANK') {
    const totalBlanks = new Set(question.choices.map(c => c.blankIndex)).size;
    const submittedChoices = choiceIds.map(id => choiceMap.get(id));
    const blankCounts = {};
    for (const c of submittedChoices) {
      blankCounts[c.blankIndex] = (blankCounts[c.blankIndex] || 0) + 1;
    }
    const submittedBlanks = Object.keys(blankCounts).length;
    if (submittedBlanks !== totalBlanks) {
      return res.status(400).json({ error: `Must submit one answer for each of the ${totalBlanks} blanks` });
    }
    for (const [blankIndex, count] of Object.entries(blankCounts)) {
      if (count > 1) {
        return res.status(400).json({ error: `Only one answer allowed per blank (duplicate for blank ${blankIndex})` });
      }
    }
  }

  // Score: count of correct submitted choices
  const selectedChoices = choiceIds.map(id => choiceMap.get(id));
  const score = selectedChoices.filter(c => c.isCorrect).length;

  const attempt = await prisma.questionAttempt.create({
    data: {
      studentId,
      questionId,
      sessionId,
      attemptedAt: new Date(),
      score,
      answers: {
        create: selectedChoices.map(c => ({
          choiceId: c.id,
          isCorrect: c.isCorrect,
        })),
      },
    },
    include: { answers: true },
  });

  await prisma.session.update({
    where: { id: sessionId },
    data: { questionsAnswered: { increment: 1 } },
  });

  res.status(201).json(attempt);
}

module.exports = { getSectionQuestions, createQuestion, attemptQuestion };
