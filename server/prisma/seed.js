require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// All seed records are tagged by these fixed emails so the script is safely re-runnable.
const TEACHER_EMAIL = 'teacher@seed.dev';
const STUDENT_EMAILS = ['alice@seed.dev', 'bob@seed.dev', 'charlie@seed.dev', 'diana@seed.dev'];

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
function hoursAgo(n) {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}
function minutesAfter(date, min) {
  return new Date(date.getTime() + min * 60 * 1000);
}

// ─── Clear ─────────────────────────────────────────────────────────────────────

async function clear() {
  console.log('Clearing previous seed data...');

  const teacher = await prisma.teacher.findUnique({ where: { email: TEACHER_EMAIL } });
  const students = await prisma.student.findMany({ where: { email: { in: STUDENT_EMAILS } } });
  const studentIds = students.map(s => s.id);

  const courseIds = teacher
    ? (await prisma.course.findMany({ where: { teacherId: teacher.id }, select: { id: true } })).map(c => c.id)
    : [];

  const sessionIds = courseIds.length
    ? (await prisma.session.findMany({ where: { courseId: { in: courseIds } }, select: { id: true } })).map(s => s.id)
    : [];

  const attemptIds = sessionIds.length
    ? (await prisma.questionAttempt.findMany({ where: { sessionId: { in: sessionIds } }, select: { id: true } })).map(a => a.id)
    : [];

  const chapterIds = courseIds.length
    ? (await prisma.chapter.findMany({ where: { courseId: { in: courseIds } }, select: { id: true } })).map(c => c.id)
    : [];

  const sectionIds = chapterIds.length
    ? (await prisma.section.findMany({ where: { chapterId: { in: chapterIds } }, select: { id: true } })).map(s => s.id)
    : [];

  const questionIds = sectionIds.length
    ? (await prisma.question.findMany({ where: { sectionId: { in: sectionIds } }, select: { id: true } })).map(q => q.id)
    : [];

  // Delete in reverse-dependency order
  if (attemptIds.length) {
    await prisma.attemptAnswer.deleteMany({ where: { attemptId: { in: attemptIds } } });
    await prisma.questionAttempt.deleteMany({ where: { id: { in: attemptIds } } });
  }
  if (sessionIds.length) await prisma.session.deleteMany({ where: { id: { in: sessionIds } } });
  if (sectionIds.length) await prisma.studentSection.deleteMany({ where: { sectionId: { in: sectionIds } } });
  if (courseIds.length) {
    await prisma.studentCourse.deleteMany({ where: { courseId: { in: courseIds } } });
    await prisma.joinRequest.deleteMany({ where: { courseId: { in: courseIds } } });
  }
  if (questionIds.length) await prisma.choice.deleteMany({ where: { questionId: { in: questionIds } } });
  if (questionIds.length) await prisma.question.deleteMany({ where: { id: { in: questionIds } } });
  if (sectionIds.length) await prisma.section.deleteMany({ where: { id: { in: sectionIds } } });
  if (chapterIds.length) await prisma.chapter.deleteMany({ where: { id: { in: chapterIds } } });
  if (courseIds.length) await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
  if (teacher) await prisma.teacher.delete({ where: { id: teacher.id } });
  if (studentIds.length) await prisma.student.deleteMany({ where: { id: { in: studentIds } } });

  console.log('Done.\n');
}

// ─── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
  await clear();
  console.log('Seeding...');

  const hashed = await bcrypt.hash('password123', 10);

  // ── Teacher ──────────────────────────────────────────────────────────────────

  const teacher = await prisma.teacher.create({
    data: { name: 'Sarah Chen', email: TEACHER_EMAIL, password: hashed },
  });

  // ── Students ─────────────────────────────────────────────────────────────────

  const [alice, bob, charlie, diana] = await Promise.all([
    prisma.student.create({ data: { name: 'Alice Johnson', email: 'alice@seed.dev', password: hashed } }),
    prisma.student.create({ data: { name: 'Bob Martinez',  email: 'bob@seed.dev',   password: hashed } }),
    prisma.student.create({ data: { name: 'Charlie Park',  email: 'charlie@seed.dev', password: hashed } }),
    prisma.student.create({ data: { name: 'Diana Walsh',   email: 'diana@seed.dev',  password: hashed } }),
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  //  COURSE 1 — General Chemistry I
  // ═══════════════════════════════════════════════════════════════════════════

  const gchem = await prisma.course.create({
    data: { name: 'General Chemistry I', teacherId: teacher.id, code: 'GCHEM01' },
  });

  const gchemCh1 = await prisma.chapter.create({
    data: { courseId: gchem.id, name: 'Atomic Structure', description: 'Protons, neutrons, and electrons', orderIndex: 0 },
  });

  // ── Section 1: The Nucleus ─────────────────────────────────────────────────

  const nucleus = await prisma.section.create({
    data: { chapterId: gchemCh1.id, name: 'The Nucleus', description: 'Atomic number and mass number', orderIndex: 0 },
  });

  const q1 = await prisma.question.create({
    data: {
      sectionId: nucleus.id, type: 'MULTIPLE_CHOICE', difficulty: 2,
      content: 'How many protons does a carbon atom have?',
      correctExplanation: 'Carbon has atomic number 6, meaning 6 protons.',
      incorrectExplanation: 'The atomic number equals the number of protons. Carbon is element 6.',
      choices: { create: [
        { content: '6',  isCorrect: true,  blankIndex: 0 },
        { content: '12', isCorrect: false, blankIndex: 0 },
        { content: '4',  isCorrect: false, blankIndex: 0 },
      ]},
    },
  });

  const q2 = await prisma.question.create({
    data: {
      sectionId: nucleus.id, type: 'MULTIPLE_CHOICE', difficulty: 1,
      content: 'What is the charge of a neutron?',
      correctExplanation: 'Neutrons carry no electrical charge.',
      incorrectExplanation: 'Protons are positive, electrons are negative, neutrons are neutral.',
      choices: { create: [
        { content: 'Neutral',  isCorrect: true,  blankIndex: 0 },
        { content: 'Positive', isCorrect: false, blankIndex: 0 },
        { content: 'Negative', isCorrect: false, blankIndex: 0 },
      ]},
    },
  });

  // FIB with 2 blanks — maxScore = 2, exercises the FIB scoring path
  const q3 = await prisma.question.create({
    data: {
      sectionId: nucleus.id, type: 'FILL_IN_BLANK', difficulty: 3,
      content: 'Nitrogen has ___ protons and its most common isotope has ___ neutrons.',
      correctExplanation: 'Nitrogen-14 has 7 protons (atomic number 7) and 7 neutrons (14 − 7).',
      incorrectExplanation: 'Nitrogen is element 7. Mass number 14 minus 7 protons gives 7 neutrons.',
      choices: { create: [
        { content: '7', isCorrect: true,  blankIndex: 0 },
        { content: '6', isCorrect: false, blankIndex: 0 },
        { content: '8', isCorrect: false, blankIndex: 0 },
        { content: '7', isCorrect: true,  blankIndex: 1 },
        { content: '6', isCorrect: false, blankIndex: 1 },
        { content: '8', isCorrect: false, blankIndex: 1 },
      ]},
    },
  });

  // ── Section 2: Electron Configuration ─────────────────────────────────────

  const electrons = await prisma.section.create({
    data: { chapterId: gchemCh1.id, name: 'Electron Configuration', description: 'Shells and orbitals', orderIndex: 1 },
  });

  const q4 = await prisma.question.create({
    data: {
      sectionId: electrons.id, type: 'MULTIPLE_CHOICE', difficulty: 2,
      content: 'How many electrons can the second electron shell hold?',
      correctExplanation: 'The second shell (n=2) holds up to 8 electrons (2n²).',
      incorrectExplanation: 'Use the formula 2n². For n=2: 2×4 = 8.',
      choices: { create: [
        { content: '8',  isCorrect: true,  blankIndex: 0 },
        { content: '2',  isCorrect: false, blankIndex: 0 },
        { content: '18', isCorrect: false, blankIndex: 0 },
      ]},
    },
  });

  const q5 = await prisma.question.create({
    data: {
      sectionId: electrons.id, type: 'MULTIPLE_CHOICE', difficulty: 1,
      content: 'What is the electron configuration of Helium?',
      correctExplanation: 'Helium has 2 electrons, filling the 1s orbital: 1s².',
      incorrectExplanation: 'Helium (Z=2) places both electrons in the 1s orbital.',
      choices: { create: [
        { content: '1s²', isCorrect: true,  blankIndex: 0 },
        { content: '1s¹', isCorrect: false, blankIndex: 0 },
        { content: '2s²', isCorrect: false, blankIndex: 0 },
      ]},
    },
  });

  // ── Enrollments ────────────────────────────────────────────────────────────
  // Alice: active, high streak | Bob: moderate | Charlie: dropped off (streak 0)

  await prisma.studentCourse.createMany({
    data: [
      { studentId: alice.id,   courseId: gchem.id, streak: 5, lifetimePoints: 420, currentPoints: 120 },
      { studentId: bob.id,     courseId: gchem.id, streak: 2, lifetimePoints: 210, currentPoints: 60  },
      { studentId: charlie.id, courseId: gchem.id, streak: 0, lifetimePoints: 0,   currentPoints: 0   },
    ],
  });

  // ── Alice — 2 completed sessions ───────────────────────────────────────────
  //   Session 1: 20 min, 5 questions
  //   Session 2: 15 min, 3 questions
  //   Avg session: 17.5 min | Total time: 35 min | Q/session: 4.0
  //   Correct rate: 8/10 = 80.0% | Avg attempts/Q: 8 attempts / 5 Qs = 1.60

  const aS1t = daysAgo(2);
  const aliceS1 = await prisma.session.create({
    data: { studentId: alice.id, courseId: gchem.id, startedAt: aS1t, endedAt: minutesAfter(aS1t, 20), questionsAnswered: 5 },
  });

  const aS2t = daysAgo(1);
  const aliceS2 = await prisma.session.create({
    data: { studentId: alice.id, courseId: gchem.id, startedAt: aS2t, endedAt: minutesAfter(aS2t, 15), questionsAnswered: 3 },
  });

  // Session 1: Q1✓ Q2✗ Q3½(1/2) Q4✓ Q5✓  → score 4 / max 6
  // Session 2: Q2✓(retry) Q3✓✓(2/2) Q1✓   → score 4 / max 4
  await prisma.questionAttempt.createMany({
    data: [
      { studentId: alice.id, questionId: q1.id, sessionId: aliceS1.id, attemptedAt: aS1t, score: 1 },
      { studentId: alice.id, questionId: q2.id, sessionId: aliceS1.id, attemptedAt: aS1t, score: 0 },
      { studentId: alice.id, questionId: q3.id, sessionId: aliceS1.id, attemptedAt: aS1t, score: 1 },
      { studentId: alice.id, questionId: q4.id, sessionId: aliceS1.id, attemptedAt: aS1t, score: 1 },
      { studentId: alice.id, questionId: q5.id, sessionId: aliceS1.id, attemptedAt: aS1t, score: 1 },
      { studentId: alice.id, questionId: q2.id, sessionId: aliceS2.id, attemptedAt: aS2t, score: 1 },
      { studentId: alice.id, questionId: q3.id, sessionId: aliceS2.id, attemptedAt: aS2t, score: 2 },
      { studentId: alice.id, questionId: q1.id, sessionId: aliceS2.id, attemptedAt: aS2t, score: 1 },
    ],
  });

  await prisma.studentSection.createMany({
    data: [
      { studentId: alice.id, sectionId: nucleus.id,   score: 8, completedAt: daysAgo(2) },
      { studentId: alice.id, sectionId: electrons.id, score: 6, completedAt: daysAgo(1) },
    ],
  });

  // ── Bob — 2 completed sessions ─────────────────────────────────────────────
  //   Session 1: 30 min, 4 questions
  //   Session 2: 10 min, 2 questions
  //   Avg session: 20.0 min | Total time: 40 min | Q/session: 3.0
  //   Correct rate: 3/7 = 42.9% | Avg attempts/Q: 6 attempts / 4 Qs = 1.50

  const bS1t = daysAgo(5);
  const bobS1 = await prisma.session.create({
    data: { studentId: bob.id, courseId: gchem.id, startedAt: bS1t, endedAt: minutesAfter(bS1t, 30), questionsAnswered: 4 },
  });

  const bS2t = daysAgo(3);
  const bobS2 = await prisma.session.create({
    data: { studentId: bob.id, courseId: gchem.id, startedAt: bS2t, endedAt: minutesAfter(bS2t, 10), questionsAnswered: 2 },
  });

  // Session 1: Q1✗ Q1✓(retry) Q2✓ Q4✗  → score 2 / max 4
  // Session 2: Q3✗(0/2) Q4✓             → score 1 / max 3
  await prisma.questionAttempt.createMany({
    data: [
      { studentId: bob.id, questionId: q1.id, sessionId: bobS1.id, attemptedAt: bS1t, score: 0 },
      { studentId: bob.id, questionId: q1.id, sessionId: bobS1.id, attemptedAt: bS1t, score: 1 },
      { studentId: bob.id, questionId: q2.id, sessionId: bobS1.id, attemptedAt: bS1t, score: 1 },
      { studentId: bob.id, questionId: q4.id, sessionId: bobS1.id, attemptedAt: bS1t, score: 0 },
      { studentId: bob.id, questionId: q3.id, sessionId: bobS2.id, attemptedAt: bS2t, score: 0 },
      { studentId: bob.id, questionId: q4.id, sessionId: bobS2.id, attemptedAt: bS2t, score: 1 },
    ],
  });

  await prisma.studentSection.create({
    data: { studentId: bob.id, sectionId: nucleus.id, score: 5, completedAt: daysAgo(5) },
  });

  // ── Charlie — 1 abandoned session, no attempts, no sections ───────────────
  //   Exercises the "0 completed sessions → blank stats" path

  await prisma.session.create({
    data: { studentId: charlie.id, courseId: gchem.id, startedAt: daysAgo(10), questionsAnswered: 0 },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  COURSE 2 — Organic Chemistry
  // ═══════════════════════════════════════════════════════════════════════════

  const ochem = await prisma.course.create({
    data: { name: 'Organic Chemistry', teacherId: teacher.id, code: 'OCHEM01' },
  });

  const ochemCh1 = await prisma.chapter.create({
    data: { courseId: ochem.id, name: 'Hydrocarbons', description: 'Alkanes, alkenes, and alkynes', orderIndex: 0 },
  });

  const alkanes = await prisma.section.create({
    data: { chapterId: ochemCh1.id, name: 'Alkanes', description: 'Saturated hydrocarbons', orderIndex: 0 },
  });

  const q6 = await prisma.question.create({
    data: {
      sectionId: alkanes.id, type: 'MULTIPLE_CHOICE', difficulty: 2,
      content: 'What is the general molecular formula for alkanes?',
      correctExplanation: 'Alkanes are fully saturated: CₙH₂ₙ₊₂.',
      incorrectExplanation: 'Alkanes have only single C–C bonds. The formula is CₙH₂ₙ₊₂.',
      choices: { create: [
        { content: 'CₙH₂ₙ₊₂', isCorrect: true,  blankIndex: 0 },
        { content: 'CₙH₂ₙ',   isCorrect: false, blankIndex: 0 },
        { content: 'CₙH₂ₙ₋₂', isCorrect: false, blankIndex: 0 },
      ]},
    },
  });

  const q7 = await prisma.question.create({
    data: {
      sectionId: alkanes.id, type: 'MULTIPLE_CHOICE', difficulty: 1,
      content: 'Which of the following is an alkane?',
      correctExplanation: 'Methane (CH₄) is the simplest alkane.',
      incorrectExplanation: 'Ethylene has a double bond; acetylene has a triple bond. Methane has only single bonds.',
      choices: { create: [
        { content: 'Methane',   isCorrect: true,  blankIndex: 0 },
        { content: 'Ethylene',  isCorrect: false, blankIndex: 0 },
        { content: 'Acetylene', isCorrect: false, blankIndex: 0 },
      ]},
    },
  });

  const alkenes = await prisma.section.create({
    data: { chapterId: ochemCh1.id, name: 'Alkenes', description: 'Unsaturated hydrocarbons with double bonds', orderIndex: 1 },
  });

  const q8 = await prisma.question.create({
    data: {
      sectionId: alkenes.id, type: 'MULTIPLE_CHOICE', difficulty: 1,
      content: 'What type of bond is characteristic of alkenes?',
      correctExplanation: 'Alkenes contain at least one C=C double bond.',
      incorrectExplanation: 'The "-ene" suffix signals a double bond. Alkynes have triple bonds.',
      choices: { create: [
        { content: 'Double bond',       isCorrect: true,  blankIndex: 0 },
        { content: 'Triple bond',       isCorrect: false, blankIndex: 0 },
        { content: 'Single bonds only', isCorrect: false, blankIndex: 0 },
      ]},
    },
  });

  // ── Enrollments ────────────────────────────────────────────────────────────
  // Alice: active | Diana: just enrolled, no activity (exercises blank-stats path)

  await prisma.studentCourse.createMany({
    data: [
      { studentId: alice.id, courseId: ochem.id, streak: 3, lifetimePoints: 180, currentPoints: 80 },
      { studentId: diana.id, courseId: ochem.id, streak: 0, lifetimePoints: 0,   currentPoints: 0  },
    ],
  });

  // ── Alice — 2 completed sessions in Org Chem ───────────────────────────────
  //   Session 1: 25 min, 3 questions
  //   Session 2: 30 min, 2 questions
  //   Avg session: 27.5 min | Total time: 55 min | Q/session: 2.5
  //   Correct rate: 4/5 = 80.0% | Avg attempts/Q: 5 attempts / 3 Qs = 1.67

  const aOrgS1t = daysAgo(1);
  const aliceOrgS1 = await prisma.session.create({
    data: { studentId: alice.id, courseId: ochem.id, startedAt: aOrgS1t, endedAt: minutesAfter(aOrgS1t, 25), questionsAnswered: 3 },
  });

  const aOrgS2t = hoursAgo(6);
  const aliceOrgS2 = await prisma.session.create({
    data: { studentId: alice.id, courseId: ochem.id, startedAt: aOrgS2t, endedAt: minutesAfter(aOrgS2t, 30), questionsAnswered: 2 },
  });

  // Session 1: Q6✓ Q7✓ Q8✗  → score 2 / max 3
  // Session 2: Q8✓(retry) Q7✓ → score 2 / max 2
  await prisma.questionAttempt.createMany({
    data: [
      { studentId: alice.id, questionId: q6.id, sessionId: aliceOrgS1.id, attemptedAt: aOrgS1t, score: 1 },
      { studentId: alice.id, questionId: q7.id, sessionId: aliceOrgS1.id, attemptedAt: aOrgS1t, score: 1 },
      { studentId: alice.id, questionId: q8.id, sessionId: aliceOrgS1.id, attemptedAt: aOrgS1t, score: 0 },
      { studentId: alice.id, questionId: q8.id, sessionId: aliceOrgS2.id, attemptedAt: aOrgS2t, score: 1 },
      { studentId: alice.id, questionId: q7.id, sessionId: aliceOrgS2.id, attemptedAt: aOrgS2t, score: 1 },
    ],
  });

  await prisma.studentSection.create({
    data: { studentId: alice.id, sectionId: alkanes.id, score: 7, completedAt: aOrgS1t },
  });

  // Diana: enrolled but no sessions, no attempts — all stats will be blank

  // ── Token ──────────────────────────────────────────────────────────────────

  const token = jwt.sign(
    { sub: teacher.id, role: 'TEACHER' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' },
  );

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║               SEED COMPLETE                         ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  console.log('  Credentials (all passwords: password123)');
  console.log('  ─────────────────────────────────────────');
  console.log(`  Teacher : ${TEACHER_EMAIL}`);
  console.log('  Students: alice@seed.dev    (Gen Chem + Org Chem)');
  console.log('            bob@seed.dev      (Gen Chem only)');
  console.log('            charlie@seed.dev  (Gen Chem, abandoned session)');
  console.log('            diana@seed.dev    (Org Chem, no activity)\n');

  console.log('  Teacher JWT (valid 24h)');
  console.log('  ─────────────────────────────────────────');
  console.log(`  ${token}\n`);

  console.log('  Export the CSV');
  console.log('  ─────────────────────────────────────────');
  console.log(`  curl -s -H "Authorization: Bearer ${token}" \\`);
  console.log('       http://localhost:3000/api/courses/export > report.csv\n');

  console.log('  Expected stats in the CSV');
  console.log('  ─────────────────────────────────────────');
  console.log('  General Chemistry I');
  console.log('    Alice Johnson  2 sessions  avg 17.5 min  total 35m   80.0% correct  1.60 avg attempts');
  console.log('    Bob Martinez   2 sessions  avg 20.0 min  total 40m   42.9% correct  1.50 avg attempts');
  console.log('    Charlie Park   0 completed sessions → session stats blank');
  console.log('  Organic Chemistry');
  console.log('    Alice Johnson  2 sessions  avg 27.5 min  total 55m   80.0% correct  1.67 avg attempts');
  console.log('    Diana Walsh    not yet active → all stats blank\n');
}

// ─── Entry point ───────────────────────────────────────────────────────────────

const resetOnly = process.argv.includes('--reset');

(resetOnly ? clear() : seed())
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
