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

  // FILL_IN_BLANK — track position per blank independently
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

async function createQuestion(req, res) {
  const { sectionId } = req.params;
  const { type, content, solutionExplanation, orderIndex, difficulty, choices } = req.body;
  const errors = [];

  if (!type || !QUESTION_TYPES.includes(type)) errors.push(`type must be one of: ${QUESTION_TYPES.join(', ')}`);
  if (!content || !content.trim()) errors.push('content is required');
  if (!solutionExplanation || !solutionExplanation.trim()) errors.push('solutionExplanation is required');
  if (orderIndex === undefined || !Number.isInteger(orderIndex) || orderIndex < 0) errors.push('orderIndex must be a non-negative integer');
  if (difficulty === undefined || !Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) errors.push('difficulty must be an integer between 1 and 5');

  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const choiceError = type === 'FILL_IN_BLANK'
    ? validateFillInBlank(choices)
    : validateMultipleChoice(choices);
  if (choiceError) return res.status(400).json({ error: choiceError });

  const { error, status } = await ownedSection(sectionId, req.user.sub);
  if (error) return res.status(status).json({ error });

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

module.exports = { createQuestion };
