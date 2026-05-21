require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

const TEACHER_EMAIL = 'teacher@seed.dev';
const STUDENT_EMAILS = [
  'alice@seed.dev',   'bob@seed.dev',     'charlie@seed.dev', 'diana@seed.dev',
  'ethan@seed.dev',   'fiona@seed.dev',   'george@seed.dev',  'hannah@seed.dev',
  'isaac@seed.dev',   'julia@seed.dev',   'kevin@seed.dev',   'laura@seed.dev',
  'marcus@seed.dev',  'nina@seed.dev',    'oscar@seed.dev',   'priya@seed.dev',
  'quinn@seed.dev',   'rachel@seed.dev',  'sam@seed.dev',     'tara@seed.dev',
  'ulrich@seed.dev',  'victoria@seed.dev',
];

function daysAgo(n) { return new Date(Date.now() - n * 86400000); }
function hoursAgo(n) { return new Date(Date.now() - n * 3600000); }
function minutesAfter(date, min) { return new Date(date.getTime() + min * 60000); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function mkMC(teacherId, sectionId, content, difficulty, correct, wrongs, correctExp, wrongExp) {
  return prisma.question.create({ data: {
    teacherId, sectionIds: [sectionId], tagIds: [],
    type: 'MULTIPLE_CHOICE', difficulty, content,
    correctExplanation: correctExp, incorrectExplanation: wrongExp,
    choices: { create: [
      { content: correct, isCorrect: true, blankIndex: 0 },
      ...wrongs.map(w => ({ content: w, isCorrect: false, blankIndex: 0 })),
    ]},
  }});
}

async function mkFIB(teacherId, sectionId, content, difficulty, blanks, correctExp, wrongExp) {
  // blanks: array of [correct, wrong, wrong, ...] per blank index
  const choices = blanks.flatMap((opts, idx) =>
    opts.map((o, i) => ({ content: o, isCorrect: i === 0, blankIndex: idx }))
  );
  return prisma.question.create({ data: {
    teacherId, sectionIds: [sectionId], tagIds: [],
    type: 'FILL_IN_BLANK', difficulty, content,
    correctExplanation: correctExp, incorrectExplanation: wrongExp,
    choices: { create: choices },
  }});
}

async function mkDyn(teacherId, sectionId, content, answerExpression, difficulty, correctExp, wrongExp) {
  return prisma.question.create({ data: {
    teacherId, sectionIds: [sectionId], tagIds: [],
    type: 'DYNAMIC', difficulty, content, answerExpression,
    distractorCount: 3,
    correctExplanation: correctExp, incorrectExplanation: wrongExp,
  }});
}

async function mkSession(studentId, courseId, classId, startDate, durationMin, questionsAnswered) {
  return prisma.session.create({ data: {
    studentId, courseId, courseClassId: classId,
    startedAt: startDate,
    endedAt: minutesAfter(startDate, durationMin),
    questionsAnswered,
  }});
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

  const questionIds = teacher
    ? (await prisma.question.findMany({ where: { teacherId: teacher.id }, select: { id: true } })).map(q => q.id)
    : [];

  if (attemptIds.length) {
    await prisma.attemptAnswer.deleteMany({ where: { attemptId: { in: attemptIds } } });
    await prisma.questionAttempt.deleteMany({ where: { id: { in: attemptIds } } });
  }
  if (sessionIds.length) await prisma.session.deleteMany({ where: { id: { in: sessionIds } } });
  if (sectionIds.length) await prisma.sectionAttempt.deleteMany({ where: { sectionId: { in: sectionIds } } });
  if (sectionIds.length) await prisma.studentSection.deleteMany({ where: { sectionId: { in: sectionIds } } });

  const courseClassIds = courseIds.length
    ? (await prisma.courseClass.findMany({ where: { courseId: { in: courseIds } }, select: { id: true } })).map(c => c.id)
    : [];

  if (courseClassIds.length) {
    await prisma.joinRequest.deleteMany({ where: { courseClassId: { in: courseClassIds } } });
    await prisma.studentEnrollment.deleteMany({ where: { courseClassId: { in: courseClassIds } } });
    await prisma.courseClass.deleteMany({ where: { id: { in: courseClassIds } } });
  }
  if (courseIds.length) await prisma.studentCourse.deleteMany({ where: { courseId: { in: courseIds } } });
  if (questionIds.length) await prisma.questionTag.deleteMany({ where: { questionIds: { hasSome: questionIds } } });
  if (questionIds.length) await prisma.choice.deleteMany({ where: { questionId: { in: questionIds } } });
  if (questionIds.length) await prisma.question.deleteMany({ where: { id: { in: questionIds } } });
  if (sectionIds.length) await prisma.section.deleteMany({ where: { id: { in: sectionIds } } });
  if (chapterIds.length) await prisma.chapter.deleteMany({ where: { id: { in: chapterIds } } });
  if (courseIds.length) await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
  if (teacher) await prisma.teacher.delete({ where: { id: teacher.id } });
  if (studentIds.length) await prisma.studentBadge.deleteMany({ where: { studentId: { in: studentIds } } });
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
  const tid = teacher.id;

  // ── 22 Students ──────────────────────────────────────────────────────────────

  const studentData = [
    { name: 'Alice Johnson',   email: 'alice@seed.dev'   },
    { name: 'Bob Martinez',    email: 'bob@seed.dev'     },
    { name: 'Charlie Park',    email: 'charlie@seed.dev' },
    { name: 'Diana Walsh',     email: 'diana@seed.dev'   },
    { name: 'Ethan Torres',    email: 'ethan@seed.dev'   },
    { name: 'Fiona Kim',       email: 'fiona@seed.dev'   },
    { name: 'George Patel',    email: 'george@seed.dev'  },
    { name: 'Hannah Liu',      email: 'hannah@seed.dev'  },
    { name: 'Isaac Brown',     email: 'isaac@seed.dev'   },
    { name: 'Julia Chen',      email: 'julia@seed.dev'   },
    { name: 'Kevin Lee',       email: 'kevin@seed.dev'   },
    { name: 'Laura Nguyen',    email: 'laura@seed.dev'   },
    { name: 'Marcus Robinson', email: 'marcus@seed.dev'  },
    { name: 'Nina Patel',      email: 'nina@seed.dev'    },
    { name: 'Oscar Williams',  email: 'oscar@seed.dev'   },
    { name: 'Priya Singh',     email: 'priya@seed.dev'   },
    { name: 'Quinn Davis',     email: 'quinn@seed.dev'   },
    { name: 'Rachel Thompson', email: 'rachel@seed.dev'  },
    { name: 'Sam Nguyen',      email: 'sam@seed.dev'     },
    { name: 'Tara Mitchell',   email: 'tara@seed.dev'    },
    { name: 'Ulrich Meyer',    email: 'ulrich@seed.dev'  },
    { name: 'Victoria Adams',  email: 'victoria@seed.dev'},
  ];

  const students = await Promise.all(
    studentData.map(d => prisma.student.create({ data: { ...d, password: hashed } }))
  );

  const [
    alice, bob, charlie, diana, ethan, fiona, george, hannah,
    isaac, julia, kevin, laura, marcus, nina, oscar,
    priya, quinn, rachel, sam, tara, ulrich, victoria,
  ] = students;

  // ═══════════════════════════════════════════════════════════════════════════
  //  COURSE 1 — General Chemistry I
  // ═══════════════════════════════════════════════════════════════════════════

  const gchem = await prisma.course.create({ data: { name: 'General Chemistry I', teacherId: tid } });

  // ── Chapter 1: Atomic Structure ────────────────────────────────────────────

  const gCh1 = await prisma.chapter.create({
    data: { courseId: gchem.id, name: 'Atomic Structure', description: 'Protons, neutrons, electrons, and orbitals', orderIndex: 0 },
  });

  // Section 1.1 — The Nucleus
  const nucleus = await prisma.section.create({
    data: { chapterId: gCh1.id, name: 'The Nucleus', description: 'Atomic number, mass number, and nuclear composition', orderIndex: 0, questionIds: [] },
  });
  const n1 = await mkMC(tid, nucleus.id,
    'How many protons does a carbon atom have?', 2,
    '6', ['12', '4', '8'],
    'Carbon has atomic number 6, meaning 6 protons.',
    'The atomic number equals the number of protons. Carbon is element 6.');
  const n2 = await mkMC(tid, nucleus.id,
    'What is the charge of a neutron?', 1,
    'Neutral', ['Positive', 'Negative', '+1'],
    'Neutrons carry no electrical charge — they are neutral.',
    'Protons are +1, electrons are −1, neutrons are 0.');
  const n3 = await mkFIB(tid, nucleus.id,
    'Nitrogen has ___ protons and its most common isotope (N-14) has ___ neutrons.', 3,
    [['7', '6', '8'], ['7', '6', '8']],
    'Nitrogen is element 7. Mass 14 − 7 protons = 7 neutrons.',
    'Atomic number = protons. Neutrons = mass number − atomic number.');
  const n4 = await mkDyn(tid, nucleus.id,
    'How many protons does a neutral atom of [el(1,18).name] have?',
    '[1.number]', 2,
    'The atomic number equals the number of protons in the nucleus.',
    'Look up the atomic number on the periodic table — it equals the proton count.');
  await prisma.section.update({ where: { id: nucleus.id }, data: { questionIds: [n1.id, n2.id, n3.id, n4.id] } });

  // Section 1.2 — Electron Configuration
  const electrons = await prisma.section.create({
    data: { chapterId: gCh1.id, name: 'Electron Configuration', description: 'Shells, subshells, and orbital notation', orderIndex: 1, questionIds: [] },
  });
  const e1 = await mkMC(tid, electrons.id,
    'How many electrons can the second electron shell hold?', 2,
    '8', ['2', '18', '6'],
    'The second shell (n=2) holds up to 8 electrons using the formula 2n².',
    'Use 2n². For n=2: 2×4 = 8.');
  const e2 = await mkMC(tid, electrons.id,
    'What is the correct electron configuration for sodium (Na, Z=11)?', 3,
    '1s² 2s² 2p⁶ 3s¹', ['1s² 2s² 2p⁵', '1s² 2s² 2p⁶ 3s²', '1s² 2s⁶ 2p³'],
    'Na has 11 electrons. Fill 1s²(2) + 2s²(4) + 2p⁶(10) + 3s¹(11).',
    'Fill orbitals in order of increasing energy: 1s, 2s, 2p, 3s…');
  const e3 = await mkFIB(tid, electrons.id,
    'The ___ principle states that electrons occupy the lowest energy orbitals first. Hund\'s rule applies to degenerate ___ orbitals.', 2,
    [['Aufbau', 'Pauli', 'Heisenberg'], ['subshell', 'shell', 'energy']],
    'The Aufbau principle fills lowest energy first; Hund\'s rule fills degenerate subshell orbitals.',
    'Aufbau = "building up". Hund\'s rule = one electron per orbital before pairing.');
  const e4 = await mkDyn(tid, electrons.id,
    'What is the atomic number of [el(1,20).name]?',
    '[1.number]', 1,
    'The atomic number is the number of protons, shown on the periodic table.',
    'Each element has a unique atomic number equal to its proton count.');
  await prisma.section.update({ where: { id: electrons.id }, data: { questionIds: [e1.id, e2.id, e3.id, e4.id] } });

  // Section 1.3 — Isotopes & Ions
  const isotopes = await prisma.section.create({
    data: { chapterId: gCh1.id, name: 'Isotopes and Ions', description: 'Isotopes, atomic mass, and ion formation', orderIndex: 2, questionIds: [] },
  });
  const i1 = await mkMC(tid, isotopes.id,
    'Carbon-12 and Carbon-14 are isotopes. What do they have in common?', 2,
    'Same number of protons', ['Same number of neutrons', 'Same mass number', 'Same number of electrons'],
    'Isotopes of the same element share the same atomic number (proton count).',
    'Isotopes differ in neutron count but have the same number of protons.');
  const i2 = await mkMC(tid, isotopes.id,
    'A sodium atom (Na) loses one electron. What is the resulting ion?', 2,
    'Na⁺', ['Na⁻', 'Na²⁺', 'Na⁰'],
    'Losing one electron gives a +1 charge, forming Na⁺.',
    'Cations form when electrons are lost; anions when gained.');
  const i3 = await mkFIB(tid, isotopes.id,
    'Chlorine-35 has ___ protons and ___ neutrons. Its average atomic mass is approximately ___.',  3,
    [['17', '18', '16'], ['18', '17', '19'], ['35.5', '35', '36']],
    'Cl has 17 protons. 35−17=18 neutrons. Average mass ~35.5 due to Cl-37 abundance.',
    'Protons = atomic number. Neutrons = mass − protons. Average mass accounts for isotope abundance.');
  await prisma.section.update({ where: { id: isotopes.id }, data: { questionIds: [i1.id, i2.id, i3.id] } });

  // ── Chapter 2: Chemical Bonding ────────────────────────────────────────────

  const gCh2 = await prisma.chapter.create({
    data: { courseId: gchem.id, name: 'Chemical Bonding', description: 'Ionic, covalent, and metallic bonds', orderIndex: 1 },
  });

  // Section 2.1 — Ionic Bonds
  const ionic = await prisma.section.create({
    data: { chapterId: gCh2.id, name: 'Ionic Bonds', description: 'Electron transfer and ionic compound formation', orderIndex: 0, questionIds: [] },
  });
  const io1 = await mkMC(tid, ionic.id,
    'Which compound is ionic?', 1,
    'NaCl', ['CO₂', 'H₂O', 'CH₄'],
    'NaCl is formed by electron transfer between Na (metal) and Cl (nonmetal).',
    'Ionic bonds form between metals and nonmetals. Molecular bonds form between nonmetals.');
  const io2 = await mkMC(tid, ionic.id,
    'In MgO, what is the charge on the magnesium ion?', 2,
    'Mg²⁺', ['Mg⁺', 'Mg³⁺', 'Mg⁻'],
    'Mg loses 2 valence electrons to achieve noble gas configuration, forming Mg²⁺.',
    'Magnesium is in Group 2 and loses 2 electrons to form a 2+ cation.');
  const io3 = await mkFIB(tid, ionic.id,
    'Ionic bonds form between ___ and ___ elements. The resulting compound is held together by ___ attraction.', 2,
    [['metals', 'nonmetals', 'metalloids'], ['nonmetals', 'metals', 'noble gases'], ['electrostatic', 'covalent', 'magnetic']],
    'Metals donate electrons to nonmetals. The resulting ions are attracted electrostatically.',
    'Think: metal + nonmetal → ionic compound with electrostatic attraction.');
  await prisma.section.update({ where: { id: ionic.id }, data: { questionIds: [io1.id, io2.id, io3.id] } });

  // Section 2.2 — Covalent Bonds
  const covalent = await prisma.section.create({
    data: { chapterId: gCh2.id, name: 'Covalent Bonds', description: 'Electron sharing and molecular geometry', orderIndex: 1, questionIds: [] },
  });
  const cv1 = await mkMC(tid, covalent.id,
    'How many covalent bonds does carbon typically form?', 2,
    '4', ['2', '3', '6'],
    'Carbon has 4 valence electrons and forms 4 bonds to complete its octet.',
    'Carbon is in Group 14 (4 valence electrons) and forms 4 bonds.');
  const cv2 = await mkMC(tid, covalent.id,
    'What is the shape of a water molecule (H₂O)?', 2,
    'Bent', ['Linear', 'Trigonal planar', 'Tetrahedral'],
    'Two bonding pairs and two lone pairs on oxygen give H₂O a bent geometry.',
    'VSEPR: 4 electron pairs around O, but only 2 are bonding, giving a bent shape.');
  const cv3 = await mkDyn(tid, covalent.id,
    'What is the chemical symbol of [el(1,10).name]?',
    '[1.symbol]', 1,
    'Each element has a unique one- or two-letter symbol from the periodic table.',
    'The symbol is derived from the element\'s name (or Latin name).');
  await prisma.section.update({ where: { id: covalent.id }, data: { questionIds: [cv1.id, cv2.id, cv3.id] } });

  // ── Chapter 3: Stoichiometry ───────────────────────────────────────────────

  const gCh3 = await prisma.chapter.create({
    data: { courseId: gchem.id, name: 'Stoichiometry', description: 'Moles, masses, and balanced equations', orderIndex: 2 },
  });

  // Section 3.1 — The Mole
  const mole = await prisma.section.create({
    data: { chapterId: gCh3.id, name: 'The Mole Concept', description: "Avogadro's number and molar mass", orderIndex: 0, questionIds: [] },
  });
  const mo1 = await mkMC(tid, mole.id,
    "What is Avogadro's number?", 1,
    '6.022 × 10²³', ['6.022 × 10²¹', '6.022 × 10²⁵', '3.011 × 10²³'],
    "Avogadro's number is 6.022 × 10²³ particles per mole.",
    "Avogadro's number = 6.022 × 10²³. It defines the number of particles in one mole.");
  const mo2 = await mkFIB(tid, mole.id,
    'The molar mass of water (H₂O) is ___ g/mol. One mole of water contains ___ molecules.', 2,
    [['18', '16', '20'], ['6.022 × 10²³', '3.011 × 10²³', '12.044 × 10²³']],
    'H₂ = 2 g/mol, O = 16 g/mol → H₂O = 18 g/mol. One mole = 6.022×10²³ molecules.',
    'Add up atomic masses: 2(1) + 16 = 18. One mole always contains Avogadro\'s number of particles.');
  const mo3 = await mkDyn(tid, mole.id,
    'A sample contains [num(1.0,5.0,1)] moles of NaCl (molar mass = 58.44 g/mol). What is the mass in grams? Round to 2 decimal places.',
    '[1] * 58.44', 3,
    'Mass = moles × molar mass. Multiply the given moles by 58.44 g/mol.',
    'Use: mass (g) = moles × molar mass (g/mol).');
  await prisma.section.update({ where: { id: mole.id }, data: { questionIds: [mo1.id, mo2.id, mo3.id] } });

  // Section 3.2 — Balancing Equations
  const balancing = await prisma.section.create({
    data: { chapterId: gCh3.id, name: 'Balancing Equations', description: 'Conservation of mass and equation balancing', orderIndex: 1, questionIds: [] },
  });
  const ba1 = await mkMC(tid, balancing.id,
    'Balance: ___ H₂ + ___ O₂ → ___ H₂O. What are the coefficients?', 2,
    '2, 1, 2', ['1, 1, 2', '2, 2, 2', '1, 2, 2'],
    '2H₂ + O₂ → 2H₂O balances H (4=4) and O (2=2).',
    'Count atoms on each side. 2H₂ gives 4H; 2H₂O needs 4H. One O₂ gives 2O; 2H₂O needs 2O.');
  const ba2 = await mkMC(tid, balancing.id,
    'What law requires chemical equations to be balanced?', 1,
    'Law of Conservation of Mass', ['Law of Definite Proportions', 'Dalton\'s Law', 'Avogadro\'s Law'],
    'Mass cannot be created or destroyed, so atom counts must match on both sides.',
    'Conservation of mass: total mass of reactants = total mass of products.');
  const ba3 = await mkFIB(tid, balancing.id,
    'In the reaction N₂ + 3H₂ → 2NH₃, ___ moles of H₂ react with 2 moles of N₂ to produce ___ moles of NH₃.', 3,
    [['6', '3', '4'], ['4', '2', '6']],
    '2N₂ + 6H₂ → 4NH₃. Scale all coefficients by 2.',
    'Keep the ratio: 1 N₂ : 3 H₂ : 2 NH₃. Multiply by 2 for 2 moles of N₂.');
  await prisma.section.update({ where: { id: balancing.id }, data: { questionIds: [ba1.id, ba2.id, ba3.id] } });

  // ═══════════════════════════════════════════════════════════════════════════
  //  COURSE 2 — Organic Chemistry
  // ═══════════════════════════════════════════════════════════════════════════

  const ochem = await prisma.course.create({ data: { name: 'Organic Chemistry', teacherId: tid } });

  // ── Chapter 1: Hydrocarbons ────────────────────────────────────────────────

  const oCh1 = await prisma.chapter.create({
    data: { courseId: ochem.id, name: 'Hydrocarbons', description: 'Alkanes, alkenes, and alkynes', orderIndex: 0 },
  });

  // Section 1.1 — Alkanes
  const alkanes = await prisma.section.create({
    data: { chapterId: oCh1.id, name: 'Alkanes', description: 'Saturated hydrocarbons and IUPAC naming', orderIndex: 0, questionIds: [] },
  });
  const al1 = await mkMC(tid, alkanes.id,
    'What is the general molecular formula for alkanes?', 2,
    'CₙH₂ₙ₊₂', ['CₙH₂ₙ', 'CₙH₂ₙ₋₂', 'CₙHₙ'],
    'Alkanes are fully saturated (only C–C single bonds): CₙH₂ₙ₊₂.',
    'Each additional CH₂ adds one C and two H. Formula: CₙH₂ₙ₊₂.');
  const al2 = await mkMC(tid, alkanes.id,
    'What is the IUPAC name for CH₃–CH₂–CH₂–CH₃?', 2,
    'Butane', ['Propane', 'Pentane', 'Methane'],
    'Four carbons in a straight chain = but- prefix + -ane suffix = butane.',
    'Count the carbons: meth(1), eth(2), prop(3), but(4), pent(5).');
  const al3 = await mkFIB(tid, alkanes.id,
    'Methane has ___ carbon(s) and ___ hydrogen(s). The next alkane, ethane, has formula ___.', 1,
    [['1', '2', '3'], ['4', '2', '6'], ['C₂H₆', 'C₂H₄', 'C₃H₈']],
    'Methane = CH₄ (1C, 4H). Ethane = C₂H₆ (CₙH₂ₙ₊₂ with n=2).',
    'Alkane formula: CₙH₂ₙ₊₂. n=1: CH₄. n=2: C₂H₆.');
  await prisma.section.update({ where: { id: alkanes.id }, data: { questionIds: [al1.id, al2.id, al3.id] } });

  // Section 1.2 — Alkenes
  const alkenes = await prisma.section.create({
    data: { chapterId: oCh1.id, name: 'Alkenes', description: 'C=C double bonds and geometric isomers', orderIndex: 1, questionIds: [] },
  });
  const ak1 = await mkMC(tid, alkenes.id,
    'What functional group is present in all alkenes?', 1,
    'C=C double bond', ['C≡C triple bond', 'C–O bond', 'C–N bond'],
    'The "-ene" suffix signals the presence of at least one carbon–carbon double bond.',
    'Alkenes are defined by the C=C double bond. Alkynes have C≡C triple bonds.');
  const ak2 = await mkMC(tid, alkenes.id,
    'What is the IUPAC name of CH₂=CH₂?', 1,
    'Ethene', ['Ethane', 'Ethyne', 'Propene'],
    'Two carbons with a double bond: eth- prefix + -ene suffix = ethene (also called ethylene).',
    'Count carbons: eth(2). The -ene suffix denotes the double bond.');
  const ak3 = await mkDyn(tid, alkenes.id,
    'What is the atomic number of [el(1,18).name]? (This element\'s valence electrons determine bonding patterns.)',
    '[1.number]', 2,
    'The atomic number equals the proton count, which determines an element\'s valence electrons.',
    'The atomic number is found on the periodic table above the element symbol.');
  await prisma.section.update({ where: { id: alkenes.id }, data: { questionIds: [ak1.id, ak2.id, ak3.id] } });

  // Section 1.3 — Alkynes
  const alkynes = await prisma.section.create({
    data: { chapterId: oCh1.id, name: 'Alkynes', description: 'C≡C triple bonds and reactions', orderIndex: 2, questionIds: [] },
  });
  const ay1 = await mkMC(tid, alkynes.id,
    'What type of bond characterizes alkynes?', 1,
    'Carbon–carbon triple bond', ['Carbon–carbon double bond', 'Carbon–oxygen bond', 'Single bonds only'],
    'Alkynes contain at least one C≡C triple bond, making them highly unsaturated.',
    'The "-yne" suffix signals a triple bond. Alkenes have double bonds, alkanes have single bonds.');
  const ay2 = await mkFIB(tid, alkynes.id,
    'The simplest alkyne is ___, with formula ___. It has ___ degrees of unsaturation.', 2,
    [['ethyne', 'propyne', 'butyne'], ['C₂H₂', 'C₃H₄', 'C₂H₄'], ['2', '1', '3']],
    'Ethyne (C₂H₂) = acetylene. One triple bond = 2 degrees of unsaturation.',
    'Ethyne: 2C + 2H = C₂H₂. A triple bond contributes 2 degrees of unsaturation.');
  await prisma.section.update({ where: { id: alkynes.id }, data: { questionIds: [ay1.id, ay2.id] } });

  // ── Chapter 2: Functional Groups ──────────────────────────────────────────

  const oCh2 = await prisma.chapter.create({
    data: { courseId: ochem.id, name: 'Functional Groups', description: 'Alcohols, carboxylic acids, and other functional groups', orderIndex: 1 },
  });

  // Section 2.1 — Alcohols
  const alcohols = await prisma.section.create({
    data: { chapterId: oCh2.id, name: 'Alcohols and Ethers', description: 'Hydroxyl groups and ether linkages', orderIndex: 0, questionIds: [] },
  });
  const oh1 = await mkMC(tid, alcohols.id,
    'What functional group defines an alcohol?', 1,
    '–OH (hydroxyl)', ['–COOH (carboxyl)', '–CHO (aldehyde)', '–NH₂ (amino)'],
    'Alcohols are defined by the –OH (hydroxyl) group attached to a carbon chain.',
    'The –OH group is the hallmark of alcohols. Examples: methanol (CH₃OH), ethanol (C₂H₅OH).');
  const oh2 = await mkMC(tid, alcohols.id,
    'Ethanol (C₂H₅OH) is a primary alcohol. What makes it "primary"?', 2,
    'The –OH is on a carbon bonded to only one other carbon', ['It has two –OH groups', 'It has the shortest chain', 'It is the simplest alcohol'],
    'A primary alcohol has the –OH group on a carbon connected to exactly one other carbon.',
    'Classification: primary (1 C neighbor), secondary (2 C neighbors), tertiary (3 C neighbors).');
  const oh3 = await mkFIB(tid, alcohols.id,
    'Ethers have the general formula R–___–R\'. Diethyl ether has the formula ___.',  2,
    [['O', 'OH', 'N'], ['C₄H₁₀O', 'C₂H₆O', 'C₃H₈O']],
    'Ethers: R–O–R\'. Diethyl ether = CH₃CH₂–O–CH₂CH₃ = C₄H₁₀O.',
    'The ether linkage is C–O–C. Diethyl ether = two ethyl groups linked by O.');
  await prisma.section.update({ where: { id: alcohols.id }, data: { questionIds: [oh1.id, oh2.id, oh3.id] } });

  // Section 2.2 — Carboxylic Acids
  const carboxyl = await prisma.section.create({
    data: { chapterId: oCh2.id, name: 'Carboxylic Acids', description: 'Acidic functional groups and ester formation', orderIndex: 1, questionIds: [] },
  });
  const ca1 = await mkMC(tid, carboxyl.id,
    'What is the functional group of a carboxylic acid?', 1,
    '–COOH', ['–OH', '–CHO', '–CO–'],
    'Carboxylic acids contain the –COOH (carboxyl) group: a carbonyl bonded to a hydroxyl.',
    '–COOH = –C(=O)OH. It is more acidic than –OH because the negative charge is delocalized.');
  const ca2 = await mkFIB(tid, carboxyl.id,
    'Acetic acid (CH₃COOH) has the IUPAC name ___. It reacts with ethanol to form an ___ and water.', 2,
    [['ethanoic acid', 'methanoic acid', 'propanoic acid'], ['ester', 'ether', 'aldehyde']],
    'CH₃COOH = ethanoic acid (2 carbons). Acid + alcohol → ester + water (esterification).',
    'IUPAC: count carbons including the –COOH carbon. Acid + alcohol → ester via Fischer esterification.');
  await prisma.section.update({ where: { id: carboxyl.id }, data: { questionIds: [ca1.id, ca2.id] } });

  // ═══════════════════════════════════════════════════════════════════════════
  //  CLASSES
  // ═══════════════════════════════════════════════════════════════════════════

  // Class 1: Gen Chem 001 — 15 students
  const gchemClass1 = await prisma.courseClass.create({
    data: { courseId: gchem.id, sectionNumber: '001', meetingTimes: 'M W F 10:00am', code: 'GCHEM001' },
  });

  // Class 2: Gen Chem 002 — 7 students
  const gchemClass2 = await prisma.courseClass.create({
    data: { courseId: gchem.id, sectionNumber: '002', meetingTimes: 'T Th 2:00pm', code: 'GCHEM002' },
  });

  // Class 3: Org Chem 001 — 9 students
  const ochemClass = await prisma.courseClass.create({
    data: { courseId: ochem.id, sectionNumber: '001', meetingTimes: 'T Th 9:00am', code: 'OCHEM001' },
  });

  // ── Gen Chem 001 enrollments (alice–oscar, 15 students) ────────────────────
  const gc1Students = [alice, bob, charlie, diana, ethan, fiona, george, hannah, isaac, julia, kevin, laura, marcus, nina, oscar];
  const gc1Streaks   = [8,    3,    0,       1,     5,     4,     2,      1,      0,      3,     6,     2,     0,      1,     4   ];
  const gc1Points    = [580, 210,   0,      60,   340,   270,   140,    60,      0,    190,  420,   120,    0,     50,   240   ];

  await prisma.studentEnrollment.createMany({ data: gc1Students.map((s, i) => ({
    studentId: s.id, courseClassId: gchemClass1.id,
    streak: gc1Streaks[i], lifetimePoints: gc1Points[i], currentPoints: Math.floor(gc1Points[i] * 0.3),
  }))});
  await prisma.studentCourse.createMany({ data: gc1Students.map((s, i) => ({
    studentId: s.id, courseId: gchem.id,
    streak: gc1Streaks[i], lifetimePoints: gc1Points[i], currentPoints: Math.floor(gc1Points[i] * 0.3),
  }))});

  // ── Gen Chem 002 enrollments (priya–victoria, 7 students) ─────────────────
  const gc2Students = [priya, quinn, rachel, sam, tara, ulrich, victoria];
  const gc2Streaks   = [4,     2,     5,      1,   3,    0,      2      ];
  const gc2Points    = [260,  140,   380,    50,  200,   0,     110     ];

  await prisma.studentEnrollment.createMany({ data: gc2Students.map((s, i) => ({
    studentId: s.id, courseClassId: gchemClass2.id,
    streak: gc2Streaks[i], lifetimePoints: gc2Points[i], currentPoints: Math.floor(gc2Points[i] * 0.3),
  }))});
  await prisma.studentCourse.createMany({ data: gc2Students.map((s, i) => ({
    studentId: s.id, courseId: gchem.id,
    streak: gc2Streaks[i], lifetimePoints: gc2Points[i], currentPoints: Math.floor(gc2Points[i] * 0.3),
  }))});

  // ── Org Chem 001 enrollments (9 students) ─────────────────────────────────
  const ocStudents = [alice, bob, diana, fiona, george, julia, kevin, laura, oscar];
  const ocStreaks   = [8,    3,   1,     4,     2,      3,     6,     2,     4    ];
  const ocPoints    = [310, 160, 40,   180,    90,    150,   280,    80,   170   ];

  await prisma.studentEnrollment.createMany({ data: ocStudents.map((s, i) => ({
    studentId: s.id, courseClassId: ochemClass.id,
    streak: ocStreaks[i], lifetimePoints: ocPoints[i], currentPoints: Math.floor(ocPoints[i] * 0.3),
  }))});
  await prisma.studentCourse.createMany({ data: ocStudents.map((s, i) => ({
    studentId: s.id, courseId: ochem.id,
    streak: ocStreaks[i], lifetimePoints: ocPoints[i], currentPoints: Math.floor(ocPoints[i] * 0.3),
  }))});

  // ═══════════════════════════════════════════════════════════════════════════
  //  ACTIVITY — Gen Chem 001
  // ═══════════════════════════════════════════════════════════════════════════

  // Alice — high achiever, completed 4 sections
  const aS1 = await mkSession(alice.id, gchem.id, gchemClass1.id, daysAgo(6), 22, 4);
  const aS2 = await mkSession(alice.id, gchem.id, gchemClass1.id, daysAgo(4), 18, 4);
  const aS3 = await mkSession(alice.id, gchem.id, gchemClass1.id, daysAgo(2), 25, 5);
  const aS4 = await mkSession(alice.id, gchem.id, gchemClass1.id, daysAgo(1), 20, 5);
  await prisma.questionAttempt.createMany({ data: [
    { studentId: alice.id, questionId: n1.id, sessionId: aS1.id, attemptedAt: daysAgo(6), score: 1 },
    { studentId: alice.id, questionId: n2.id, sessionId: aS1.id, attemptedAt: daysAgo(6), score: 1 },
    { studentId: alice.id, questionId: n3.id, sessionId: aS1.id, attemptedAt: daysAgo(6), score: 2 },
    { studentId: alice.id, questionId: n4.id, sessionId: aS1.id, attemptedAt: daysAgo(6), score: 1 },
    { studentId: alice.id, questionId: e1.id, sessionId: aS2.id, attemptedAt: daysAgo(4), score: 1 },
    { studentId: alice.id, questionId: e2.id, sessionId: aS2.id, attemptedAt: daysAgo(4), score: 1 },
    { studentId: alice.id, questionId: e3.id, sessionId: aS2.id, attemptedAt: daysAgo(4), score: 2 },
    { studentId: alice.id, questionId: e4.id, sessionId: aS2.id, attemptedAt: daysAgo(4), score: 1 },
    { studentId: alice.id, questionId: i1.id, sessionId: aS3.id, attemptedAt: daysAgo(2), score: 1 },
    { studentId: alice.id, questionId: i2.id, sessionId: aS3.id, attemptedAt: daysAgo(2), score: 1 },
    { studentId: alice.id, questionId: i3.id, sessionId: aS3.id, attemptedAt: daysAgo(2), score: 2 },
    { studentId: alice.id, questionId: io1.id, sessionId: aS3.id, attemptedAt: daysAgo(2), score: 1 },
    { studentId: alice.id, questionId: io2.id, sessionId: aS3.id, attemptedAt: daysAgo(2), score: 1 },
    { studentId: alice.id, questionId: io3.id, sessionId: aS4.id, attemptedAt: daysAgo(1), score: 2 },
    { studentId: alice.id, questionId: cv1.id, sessionId: aS4.id, attemptedAt: daysAgo(1), score: 1 },
    { studentId: alice.id, questionId: cv2.id, sessionId: aS4.id, attemptedAt: daysAgo(1), score: 1 },
    { studentId: alice.id, questionId: cv3.id, sessionId: aS4.id, attemptedAt: daysAgo(1), score: 1 },
    { studentId: alice.id, questionId: mo1.id, sessionId: aS4.id, attemptedAt: daysAgo(1), score: 1 },
  ]});
  await prisma.studentSection.createMany({ data: [
    { studentId: alice.id, sectionId: nucleus.id,   score: 95, completedAt: daysAgo(6) },
    { studentId: alice.id, sectionId: electrons.id, score: 88, completedAt: daysAgo(4) },
    { studentId: alice.id, sectionId: isotopes.id,  score: 92, completedAt: daysAgo(2) },
    { studentId: alice.id, sectionId: ionic.id,     score: 85, completedAt: daysAgo(1) },
  ]});
  await prisma.sectionAttempt.createMany({ data: [
    { studentId: alice.id, sectionId: nucleus.id,   score: 95, xpEarned: 50, isReview: false, completedAt: daysAgo(6) },
    { studentId: alice.id, sectionId: electrons.id, score: 88, xpEarned: 40, isReview: false, completedAt: daysAgo(4) },
    { studentId: alice.id, sectionId: isotopes.id,  score: 92, xpEarned: 45, isReview: false, completedAt: daysAgo(2) },
    { studentId: alice.id, sectionId: ionic.id,     score: 85, xpEarned: 35, isReview: false, completedAt: daysAgo(1) },
  ]});

  // Bob — moderate, completed 2 sections, some wrong answers
  const bS1 = await mkSession(bob.id, gchem.id, gchemClass1.id, daysAgo(7), 30, 4);
  const bS2 = await mkSession(bob.id, gchem.id, gchemClass1.id, daysAgo(5), 20, 4);
  const bS3 = await mkSession(bob.id, gchem.id, gchemClass1.id, daysAgo(3), 15, 3);
  await prisma.questionAttempt.createMany({ data: [
    { studentId: bob.id, questionId: n1.id, sessionId: bS1.id, attemptedAt: daysAgo(7), score: 0 },
    { studentId: bob.id, questionId: n1.id, sessionId: bS1.id, attemptedAt: daysAgo(7), score: 1 },
    { studentId: bob.id, questionId: n2.id, sessionId: bS1.id, attemptedAt: daysAgo(7), score: 1 },
    { studentId: bob.id, questionId: n3.id, sessionId: bS1.id, attemptedAt: daysAgo(7), score: 1 },
    { studentId: bob.id, questionId: e1.id, sessionId: bS2.id, attemptedAt: daysAgo(5), score: 1 },
    { studentId: bob.id, questionId: e2.id, sessionId: bS2.id, attemptedAt: daysAgo(5), score: 0 },
    { studentId: bob.id, questionId: e3.id, sessionId: bS2.id, attemptedAt: daysAgo(5), score: 1 },
    { studentId: bob.id, questionId: e4.id, sessionId: bS2.id, attemptedAt: daysAgo(5), score: 1 },
    { studentId: bob.id, questionId: i1.id, sessionId: bS3.id, attemptedAt: daysAgo(3), score: 1 },
    { studentId: bob.id, questionId: i2.id, sessionId: bS3.id, attemptedAt: daysAgo(3), score: 0 },
    { studentId: bob.id, questionId: i3.id, sessionId: bS3.id, attemptedAt: daysAgo(3), score: 1 },
  ]});
  await prisma.studentSection.createMany({ data: [
    { studentId: bob.id, sectionId: nucleus.id,   score: 72, completedAt: daysAgo(7) },
    { studentId: bob.id, sectionId: electrons.id, score: 68, completedAt: daysAgo(5) },
  ]});
  await prisma.sectionAttempt.createMany({ data: [
    { studentId: bob.id, sectionId: nucleus.id,   score: 72, xpEarned: 25, isReview: false, completedAt: daysAgo(7) },
    { studentId: bob.id, sectionId: electrons.id, score: 68, xpEarned: 20, isReview: false, completedAt: daysAgo(5) },
  ]});

  // Ethan — strong student, 3 sections
  const etS1 = await mkSession(ethan.id, gchem.id, gchemClass1.id, daysAgo(5), 20, 4);
  const etS2 = await mkSession(ethan.id, gchem.id, gchemClass1.id, daysAgo(3), 22, 4);
  const etS3 = await mkSession(ethan.id, gchem.id, gchemClass1.id, daysAgo(1), 18, 3);
  await prisma.questionAttempt.createMany({ data: [
    { studentId: ethan.id, questionId: n1.id, sessionId: etS1.id, attemptedAt: daysAgo(5), score: 1 },
    { studentId: ethan.id, questionId: n2.id, sessionId: etS1.id, attemptedAt: daysAgo(5), score: 1 },
    { studentId: ethan.id, questionId: n3.id, sessionId: etS1.id, attemptedAt: daysAgo(5), score: 2 },
    { studentId: ethan.id, questionId: n4.id, sessionId: etS1.id, attemptedAt: daysAgo(5), score: 1 },
    { studentId: ethan.id, questionId: e1.id, sessionId: etS2.id, attemptedAt: daysAgo(3), score: 1 },
    { studentId: ethan.id, questionId: e2.id, sessionId: etS2.id, attemptedAt: daysAgo(3), score: 1 },
    { studentId: ethan.id, questionId: e3.id, sessionId: etS2.id, attemptedAt: daysAgo(3), score: 1 },
    { studentId: ethan.id, questionId: e4.id, sessionId: etS2.id, attemptedAt: daysAgo(3), score: 1 },
    { studentId: ethan.id, questionId: i1.id, sessionId: etS3.id, attemptedAt: daysAgo(1), score: 1 },
    { studentId: ethan.id, questionId: i2.id, sessionId: etS3.id, attemptedAt: daysAgo(1), score: 1 },
    { studentId: ethan.id, questionId: i3.id, sessionId: etS3.id, attemptedAt: daysAgo(1), score: 2 },
  ]});
  await prisma.studentSection.createMany({ data: [
    { studentId: ethan.id, sectionId: nucleus.id,   score: 100, completedAt: daysAgo(5) },
    { studentId: ethan.id, sectionId: electrons.id, score: 90,  completedAt: daysAgo(3) },
    { studentId: ethan.id, sectionId: isotopes.id,  score: 95,  completedAt: daysAgo(1) },
  ]});
  await prisma.sectionAttempt.createMany({ data: [
    { studentId: ethan.id, sectionId: nucleus.id,   score: 100, xpEarned: 60, isReview: false, completedAt: daysAgo(5) },
    { studentId: ethan.id, sectionId: electrons.id, score: 90,  xpEarned: 45, isReview: false, completedAt: daysAgo(3) },
    { studentId: ethan.id, sectionId: isotopes.id,  score: 95,  xpEarned: 50, isReview: false, completedAt: daysAgo(1) },
  ]});

  // Fiona — 2 sessions, 1 section
  const fiS1 = await mkSession(fiona.id, gchem.id, gchemClass1.id, daysAgo(4), 18, 3);
  const fiS2 = await mkSession(fiona.id, gchem.id, gchemClass1.id, daysAgo(2), 16, 3);
  await prisma.questionAttempt.createMany({ data: [
    { studentId: fiona.id, questionId: n1.id, sessionId: fiS1.id, attemptedAt: daysAgo(4), score: 1 },
    { studentId: fiona.id, questionId: n2.id, sessionId: fiS1.id, attemptedAt: daysAgo(4), score: 1 },
    { studentId: fiona.id, questionId: n3.id, sessionId: fiS1.id, attemptedAt: daysAgo(4), score: 1 },
    { studentId: fiona.id, questionId: e1.id, sessionId: fiS2.id, attemptedAt: daysAgo(2), score: 0 },
    { studentId: fiona.id, questionId: e2.id, sessionId: fiS2.id, attemptedAt: daysAgo(2), score: 1 },
    { studentId: fiona.id, questionId: e3.id, sessionId: fiS2.id, attemptedAt: daysAgo(2), score: 1 },
  ]});
  await prisma.studentSection.create({ data: { studentId: fiona.id, sectionId: nucleus.id, score: 78, completedAt: daysAgo(4) } });
  await prisma.sectionAttempt.create({ data: { studentId: fiona.id, sectionId: nucleus.id, score: 78, xpEarned: 30, isReview: false, completedAt: daysAgo(4) } });

  // George — 2 sessions, 1 section
  const geS1 = await mkSession(george.id, gchem.id, gchemClass1.id, daysAgo(8), 25, 4);
  const geS2 = await mkSession(george.id, gchem.id, gchemClass1.id, daysAgo(6), 15, 3);
  await prisma.questionAttempt.createMany({ data: [
    { studentId: george.id, questionId: n1.id, sessionId: geS1.id, attemptedAt: daysAgo(8), score: 1 },
    { studentId: george.id, questionId: n2.id, sessionId: geS1.id, attemptedAt: daysAgo(8), score: 0 },
    { studentId: george.id, questionId: n3.id, sessionId: geS1.id, attemptedAt: daysAgo(8), score: 2 },
    { studentId: george.id, questionId: n4.id, sessionId: geS1.id, attemptedAt: daysAgo(8), score: 1 },
    { studentId: george.id, questionId: e1.id, sessionId: geS2.id, attemptedAt: daysAgo(6), score: 1 },
    { studentId: george.id, questionId: e2.id, sessionId: geS2.id, attemptedAt: daysAgo(6), score: 0 },
    { studentId: george.id, questionId: e3.id, sessionId: geS2.id, attemptedAt: daysAgo(6), score: 1 },
  ]});
  await prisma.studentSection.create({ data: { studentId: george.id, sectionId: nucleus.id, score: 82, completedAt: daysAgo(8) } });
  await prisma.sectionAttempt.create({ data: { studentId: george.id, sectionId: nucleus.id, score: 82, xpEarned: 32, isReview: false, completedAt: daysAgo(8) } });

  // Charlie — 1 abandoned session, no completions
  await mkSession(charlie.id, gchem.id, gchemClass1.id, daysAgo(10), 0, 0);

  // Diana, Hannah, Isaac, Julia, Kevin, Laura, Marcus, Nina, Oscar — enrolled only (no sessions)
  // (exercises the "no activity" path in exports/stats)

  // ═══════════════════════════════════════════════════════════════════════════
  //  ACTIVITY — Gen Chem 002
  // ═══════════════════════════════════════════════════════════════════════════

  // Priya — strong, 3 sections
  const prS1 = await mkSession(priya.id, gchem.id, gchemClass2.id, daysAgo(5), 24, 4);
  const prS2 = await mkSession(priya.id, gchem.id, gchemClass2.id, daysAgo(3), 20, 4);
  const prS3 = await mkSession(priya.id, gchem.id, gchemClass2.id, daysAgo(1), 22, 3);
  await prisma.questionAttempt.createMany({ data: [
    { studentId: priya.id, questionId: n1.id, sessionId: prS1.id, attemptedAt: daysAgo(5), score: 1 },
    { studentId: priya.id, questionId: n2.id, sessionId: prS1.id, attemptedAt: daysAgo(5), score: 1 },
    { studentId: priya.id, questionId: n3.id, sessionId: prS1.id, attemptedAt: daysAgo(5), score: 2 },
    { studentId: priya.id, questionId: n4.id, sessionId: prS1.id, attemptedAt: daysAgo(5), score: 1 },
    { studentId: priya.id, questionId: e1.id, sessionId: prS2.id, attemptedAt: daysAgo(3), score: 1 },
    { studentId: priya.id, questionId: e2.id, sessionId: prS2.id, attemptedAt: daysAgo(3), score: 1 },
    { studentId: priya.id, questionId: e3.id, sessionId: prS2.id, attemptedAt: daysAgo(3), score: 2 },
    { studentId: priya.id, questionId: e4.id, sessionId: prS2.id, attemptedAt: daysAgo(3), score: 1 },
    { studentId: priya.id, questionId: i1.id, sessionId: prS3.id, attemptedAt: daysAgo(1), score: 1 },
    { studentId: priya.id, questionId: i2.id, sessionId: prS3.id, attemptedAt: daysAgo(1), score: 1 },
    { studentId: priya.id, questionId: i3.id, sessionId: prS3.id, attemptedAt: daysAgo(1), score: 1 },
  ]});
  await prisma.studentSection.createMany({ data: [
    { studentId: priya.id, sectionId: nucleus.id,   score: 90, completedAt: daysAgo(5) },
    { studentId: priya.id, sectionId: electrons.id, score: 95, completedAt: daysAgo(3) },
    { studentId: priya.id, sectionId: isotopes.id,  score: 80, completedAt: daysAgo(1) },
  ]});
  await prisma.sectionAttempt.createMany({ data: [
    { studentId: priya.id, sectionId: nucleus.id,   score: 90, xpEarned: 48, isReview: false, completedAt: daysAgo(5) },
    { studentId: priya.id, sectionId: electrons.id, score: 95, xpEarned: 52, isReview: false, completedAt: daysAgo(3) },
    { studentId: priya.id, sectionId: isotopes.id,  score: 80, xpEarned: 38, isReview: false, completedAt: daysAgo(1) },
  ]});

  // Quinn — moderate, 2 sessions, 1 section
  const quS1 = await mkSession(quinn.id, gchem.id, gchemClass2.id, daysAgo(6), 20, 3);
  const quS2 = await mkSession(quinn.id, gchem.id, gchemClass2.id, daysAgo(4), 15, 3);
  await prisma.questionAttempt.createMany({ data: [
    { studentId: quinn.id, questionId: n1.id, sessionId: quS1.id, attemptedAt: daysAgo(6), score: 1 },
    { studentId: quinn.id, questionId: n2.id, sessionId: quS1.id, attemptedAt: daysAgo(6), score: 0 },
    { studentId: quinn.id, questionId: n3.id, sessionId: quS1.id, attemptedAt: daysAgo(6), score: 1 },
    { studentId: quinn.id, questionId: e1.id, sessionId: quS2.id, attemptedAt: daysAgo(4), score: 1 },
    { studentId: quinn.id, questionId: e2.id, sessionId: quS2.id, attemptedAt: daysAgo(4), score: 0 },
    { studentId: quinn.id, questionId: e3.id, sessionId: quS2.id, attemptedAt: daysAgo(4), score: 2 },
  ]});
  await prisma.studentSection.create({ data: { studentId: quinn.id, sectionId: nucleus.id, score: 65, completedAt: daysAgo(6) } });
  await prisma.sectionAttempt.create({ data: { studentId: quinn.id, sectionId: nucleus.id, score: 65, xpEarned: 18, isReview: false, completedAt: daysAgo(6) } });

  // Rachel — 2 sessions, 2 sections
  const raS1 = await mkSession(rachel.id, gchem.id, gchemClass2.id, daysAgo(4), 26, 4);
  const raS2 = await mkSession(rachel.id, gchem.id, gchemClass2.id, daysAgo(2), 22, 4);
  await prisma.questionAttempt.createMany({ data: [
    { studentId: rachel.id, questionId: n1.id, sessionId: raS1.id, attemptedAt: daysAgo(4), score: 1 },
    { studentId: rachel.id, questionId: n2.id, sessionId: raS1.id, attemptedAt: daysAgo(4), score: 1 },
    { studentId: rachel.id, questionId: n3.id, sessionId: raS1.id, attemptedAt: daysAgo(4), score: 2 },
    { studentId: rachel.id, questionId: n4.id, sessionId: raS1.id, attemptedAt: daysAgo(4), score: 1 },
    { studentId: rachel.id, questionId: e1.id, sessionId: raS2.id, attemptedAt: daysAgo(2), score: 1 },
    { studentId: rachel.id, questionId: e2.id, sessionId: raS2.id, attemptedAt: daysAgo(2), score: 0 },
    { studentId: rachel.id, questionId: e3.id, sessionId: raS2.id, attemptedAt: daysAgo(2), score: 1 },
    { studentId: rachel.id, questionId: e4.id, sessionId: raS2.id, attemptedAt: daysAgo(2), score: 1 },
  ]});
  await prisma.studentSection.createMany({ data: [
    { studentId: rachel.id, sectionId: nucleus.id,   score: 88, completedAt: daysAgo(4) },
    { studentId: rachel.id, sectionId: electrons.id, score: 75, completedAt: daysAgo(2) },
  ]});
  await prisma.sectionAttempt.createMany({ data: [
    { studentId: rachel.id, sectionId: nucleus.id,   score: 88, xpEarned: 42, isReview: false, completedAt: daysAgo(4) },
    { studentId: rachel.id, sectionId: electrons.id, score: 75, xpEarned: 28, isReview: false, completedAt: daysAgo(2) },
  ]});

  // Sam, Tara — 1 session each, no completions
  const saS1 = await mkSession(sam.id, gchem.id, gchemClass2.id, daysAgo(8), 12, 2);
  await prisma.questionAttempt.createMany({ data: [
    { studentId: sam.id, questionId: n1.id, sessionId: saS1.id, attemptedAt: daysAgo(8), score: 0 },
    { studentId: sam.id, questionId: n2.id, sessionId: saS1.id, attemptedAt: daysAgo(8), score: 1 },
  ]});
  const taS1 = await mkSession(tara.id, gchem.id, gchemClass2.id, daysAgo(6), 10, 2);
  await prisma.questionAttempt.createMany({ data: [
    { studentId: tara.id, questionId: n1.id, sessionId: taS1.id, attemptedAt: daysAgo(6), score: 1 },
    { studentId: tara.id, questionId: n2.id, sessionId: taS1.id, attemptedAt: daysAgo(6), score: 1 },
  ]});

  // Ulrich, Victoria — enrolled, no sessions

  // ═══════════════════════════════════════════════════════════════════════════
  //  ACTIVITY — Org Chem 001
  // ═══════════════════════════════════════════════════════════════════════════

  // Alice — 2 sessions, 2 sections
  const aoS1 = await mkSession(alice.id, ochem.id, ochemClass.id, daysAgo(3), 20, 3);
  const aoS2 = await mkSession(alice.id, ochem.id, ochemClass.id, daysAgo(1), 18, 3);
  await prisma.questionAttempt.createMany({ data: [
    { studentId: alice.id, questionId: al1.id, sessionId: aoS1.id, attemptedAt: daysAgo(3), score: 1 },
    { studentId: alice.id, questionId: al2.id, sessionId: aoS1.id, attemptedAt: daysAgo(3), score: 1 },
    { studentId: alice.id, questionId: al3.id, sessionId: aoS1.id, attemptedAt: daysAgo(3), score: 2 },
    { studentId: alice.id, questionId: ak1.id, sessionId: aoS2.id, attemptedAt: daysAgo(1), score: 1 },
    { studentId: alice.id, questionId: ak2.id, sessionId: aoS2.id, attemptedAt: daysAgo(1), score: 1 },
    { studentId: alice.id, questionId: ak3.id, sessionId: aoS2.id, attemptedAt: daysAgo(1), score: 1 },
  ]});
  await prisma.studentSection.createMany({ data: [
    { studentId: alice.id, sectionId: alkanes.id, score: 90, completedAt: daysAgo(3) },
    { studentId: alice.id, sectionId: alkenes.id, score: 85, completedAt: daysAgo(1) },
  ]});
  await prisma.sectionAttempt.createMany({ data: [
    { studentId: alice.id, sectionId: alkanes.id, score: 90, xpEarned: 42, isReview: false, completedAt: daysAgo(3) },
    { studentId: alice.id, sectionId: alkenes.id, score: 85, xpEarned: 38, isReview: false, completedAt: daysAgo(1) },
  ]});

  // Bob — 2 sessions, 1 section
  const boS1 = await mkSession(bob.id, ochem.id, ochemClass.id, daysAgo(5), 25, 3);
  const boS2 = await mkSession(bob.id, ochem.id, ochemClass.id, daysAgo(3), 18, 2);
  await prisma.questionAttempt.createMany({ data: [
    { studentId: bob.id, questionId: al1.id, sessionId: boS1.id, attemptedAt: daysAgo(5), score: 1 },
    { studentId: bob.id, questionId: al2.id, sessionId: boS1.id, attemptedAt: daysAgo(5), score: 0 },
    { studentId: bob.id, questionId: al3.id, sessionId: boS1.id, attemptedAt: daysAgo(5), score: 1 },
    { studentId: bob.id, questionId: ak1.id, sessionId: boS2.id, attemptedAt: daysAgo(3), score: 1 },
    { studentId: bob.id, questionId: ak2.id, sessionId: boS2.id, attemptedAt: daysAgo(3), score: 1 },
  ]});
  await prisma.studentSection.create({ data: { studentId: bob.id, sectionId: alkanes.id, score: 70, completedAt: daysAgo(5) } });
  await prisma.sectionAttempt.create({ data: { studentId: bob.id, sectionId: alkanes.id, score: 70, xpEarned: 22, isReview: false, completedAt: daysAgo(5) } });

  // Kevin — strong org chem student, 3 sections
  const kvS1 = await mkSession(kevin.id, ochem.id, ochemClass.id, daysAgo(4), 22, 3);
  const kvS2 = await mkSession(kevin.id, ochem.id, ochemClass.id, daysAgo(2), 20, 3);
  const kvS3 = await mkSession(kevin.id, ochem.id, ochemClass.id, hoursAgo(4), 18, 2);
  await prisma.questionAttempt.createMany({ data: [
    { studentId: kevin.id, questionId: al1.id, sessionId: kvS1.id, attemptedAt: daysAgo(4), score: 1 },
    { studentId: kevin.id, questionId: al2.id, sessionId: kvS1.id, attemptedAt: daysAgo(4), score: 1 },
    { studentId: kevin.id, questionId: al3.id, sessionId: kvS1.id, attemptedAt: daysAgo(4), score: 2 },
    { studentId: kevin.id, questionId: ak1.id, sessionId: kvS2.id, attemptedAt: daysAgo(2), score: 1 },
    { studentId: kevin.id, questionId: ak2.id, sessionId: kvS2.id, attemptedAt: daysAgo(2), score: 1 },
    { studentId: kevin.id, questionId: ak3.id, sessionId: kvS2.id, attemptedAt: daysAgo(2), score: 1 },
    { studentId: kevin.id, questionId: ay1.id, sessionId: kvS3.id, attemptedAt: hoursAgo(4), score: 1 },
    { studentId: kevin.id, questionId: ay2.id, sessionId: kvS3.id, attemptedAt: hoursAgo(4), score: 2 },
  ]});
  await prisma.studentSection.createMany({ data: [
    { studentId: kevin.id, sectionId: alkanes.id, score: 100, completedAt: daysAgo(4) },
    { studentId: kevin.id, sectionId: alkenes.id, score: 95,  completedAt: daysAgo(2) },
    { studentId: kevin.id, sectionId: alkynes.id, score: 90,  completedAt: hoursAgo(4) },
  ]});
  await prisma.sectionAttempt.createMany({ data: [
    { studentId: kevin.id, sectionId: alkanes.id, score: 100, xpEarned: 60, isReview: false, completedAt: daysAgo(4) },
    { studentId: kevin.id, sectionId: alkenes.id, score: 95,  xpEarned: 55, isReview: false, completedAt: daysAgo(2) },
    { studentId: kevin.id, sectionId: alkynes.id, score: 90,  xpEarned: 48, isReview: false, completedAt: hoursAgo(4) },
  ]});

  // Julia — 1 session, 1 section
  const juS1 = await mkSession(julia.id, ochem.id, ochemClass.id, daysAgo(4), 15, 3);
  await prisma.questionAttempt.createMany({ data: [
    { studentId: julia.id, questionId: al1.id, sessionId: juS1.id, attemptedAt: daysAgo(4), score: 1 },
    { studentId: julia.id, questionId: al2.id, sessionId: juS1.id, attemptedAt: daysAgo(4), score: 1 },
    { studentId: julia.id, questionId: al3.id, sessionId: juS1.id, attemptedAt: daysAgo(4), score: 1 },
  ]});
  await prisma.studentSection.create({ data: { studentId: julia.id, sectionId: alkanes.id, score: 76, completedAt: daysAgo(4) } });
  await prisma.sectionAttempt.create({ data: { studentId: julia.id, sectionId: alkanes.id, score: 76, xpEarned: 26, isReview: false, completedAt: daysAgo(4) } });

  // Diana, Fiona, George, Laura, Oscar — enrolled in ochem, no sessions

  // ═══════════════════════════════════════════════════════════════════════════
  //  BADGES & TAGS
  // ═══════════════════════════════════════════════════════════════════════════

  await seedStreakBadges();

  const [badge7, badge14, badge21] = await Promise.all([
    prisma.badge.findFirst({ where: { name: '7-Day Streak' } }),
    prisma.badge.findFirst({ where: { name: '14-Day Streak' } }),
    prisma.badge.findFirst({ where: { name: '21-Day Streak' } }),
  ]);

  if (badge7 && badge14) {
    await Promise.all([
      prisma.studentBadge.create({ data: { studentId: alice.id,  badgeId: badge7.id,  dateAchieved: daysAgo(14), progress: 7  } }),
      prisma.studentBadge.create({ data: { studentId: alice.id,  badgeId: badge14.id, dateAchieved: daysAgo(7),  progress: 14 } }),
      ...(badge21 ? [prisma.studentBadge.create({ data: { studentId: alice.id,  badgeId: badge21.id, progress: 18 } })] : []),
      prisma.studentBadge.create({ data: { studentId: ethan.id,  badgeId: badge7.id,  dateAchieved: daysAgo(10), progress: 7  } }),
      prisma.studentBadge.create({ data: { studentId: kevin.id,  badgeId: badge7.id,  dateAchieved: daysAgo(8),  progress: 7  } }),
      prisma.studentBadge.create({ data: { studentId: priya.id,  badgeId: badge7.id,  dateAchieved: daysAgo(9),  progress: 7  } }),
      prisma.studentBadge.create({ data: { studentId: rachel.id, badgeId: badge7.id,  dateAchieved: daysAgo(12), progress: 7  } }),
    ]);
  }

  // Question tags
  const allGchemQIds = [n1.id, n2.id, n3.id, n4.id, e1.id, e2.id, e3.id, e4.id, i1.id, i2.id, i3.id, io1.id, io2.id, io3.id, cv1.id, cv2.id, cv3.id, mo1.id, mo2.id, mo3.id, ba1.id, ba2.id, ba3.id];
  const allOchemQIds = [al1.id, al2.id, al3.id, ak1.id, ak2.id, ak3.id, ay1.id, ay2.id, oh1.id, oh2.id, oh3.id, ca1.id, ca2.id];

  await prisma.questionTag.createMany({ data: [
    { name: 'Atomic Structure',     color: 'purple', questionIds: [n1.id, n2.id, n3.id, n4.id, e1.id, e2.id, e3.id, e4.id, i1.id, i2.id, i3.id] },
    { name: 'Chemical Bonding',     color: 'teal',   questionIds: [io1.id, io2.id, io3.id, cv1.id, cv2.id, cv3.id] },
    { name: 'Stoichiometry',        color: 'gold',   questionIds: [mo1.id, mo2.id, mo3.id, ba1.id, ba2.id, ba3.id] },
    { name: 'Hydrocarbons',         color: 'purple', questionIds: [al1.id, al2.id, al3.id, ak1.id, ak2.id, ak3.id, ay1.id, ay2.id] },
    { name: 'Functional Groups',    color: 'coral',  questionIds: [oh1.id, oh2.id, oh3.id, ca1.id, ca2.id] },
    { name: 'Memorization',         color: 'gold',   questionIds: [n1.id, n2.id, mo1.id, al1.id, al2.id, ay1.id] },
    { name: 'Conceptual',           color: 'teal',   questionIds: [cv2.id, ba2.id, io1.id, ak1.id, oh1.id, ca1.id] },
    { name: 'Dynamic (Calculated)', color: 'purple', questionIds: [n4.id, e4.id, cv3.id, mo3.id, ak3.id] },
  ]});

  // ── Teacher JWT ────────────────────────────────────────────────────────────

  const token = jwt.sign({ sub: teacher.id, role: 'TEACHER' }, process.env.JWT_SECRET, { expiresIn: '24h' });

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                     SEED COMPLETE                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  console.log('  Credentials (all passwords: password123)');
  console.log('  ────────────────────────────────────────────────────────────');
  console.log(`  Teacher : ${TEACHER_EMAIL}`);
  console.log('  Students: alice@seed.dev  ethan@seed.dev  priya@seed.dev');
  console.log('            bob@seed.dev    fiona@seed.dev  quinn@seed.dev');
  console.log('            charlie@seed.dev george@seed.dev rachel@seed.dev');
  console.log('            diana@seed.dev  kevin@seed.dev  sam@seed.dev');
  console.log('            (+ 10 more, all @seed.dev)\n');
  console.log('  Classes');
  console.log('  ────────────────────────────────────────────────────────────');
  console.log('  GCHEM001  Gen Chem I §001  M/W/F 10am   15 students');
  console.log('  GCHEM002  Gen Chem I §002  T/Th 2pm      7 students');
  console.log('  OCHEM001  Org Chem §001    T/Th 9am      9 students\n');
  console.log('  Content');
  console.log('  ────────────────────────────────────────────────────────────');
  console.log('  Gen Chem I  — 3 chapters, 7 sections, 23 questions (MC+FIB+DYNAMIC)');
  console.log('  Org Chem    — 2 chapters, 5 sections, 13 questions (MC+FIB+DYNAMIC)\n');
  console.log('  Teacher JWT (valid 24h)');
  console.log('  ────────────────────────────────────────────────────────────');
  console.log(`  ${token}\n`);
}

// ─── Streak Badges ─────────────────────────────────────────────────────────────

async function seedStreakBadges() {
  const streakBadges = [
    { name: '7-Day Streak',   criteriaAmount: 7,  xpReward: 100,  icon: '🔥', color: '#FF6B00' },
    { name: '14-Day Streak',  criteriaAmount: 14, xpReward: 200,  icon: '🔥', color: '#FF6B00' },
    { name: '21-Day Streak',  criteriaAmount: 21, xpReward: 400,  icon: '🔥', color: '#FF6B00' },
    { name: '28-Day Streak',  criteriaAmount: 28, xpReward: 800,  icon: '🔥', color: '#FF6B00' },
    { name: '1-Month Streak', criteriaAmount: 30, xpReward: 1600, icon: '🔥', color: '#FF8C00' },
    { name: '2-Month Streak', criteriaAmount: 60, xpReward: 3200, icon: '🏆', color: '#C0C0C0' },
    { name: '3-Month Streak', criteriaAmount: 90, xpReward: 6400, icon: '🏆', color: '#FFD700' },
  ];
  for (const b of streakBadges) {
    const exists = await prisma.badge.findFirst({ where: { name: b.name, badgeType: 'STREAK' } });
    if (!exists) await prisma.badge.create({ data: { ...b, badgeType: 'STREAK', criteriaType: 'STREAK_DAYS' } });
  }
}

// ─── Entry point ───────────────────────────────────────────────────────────────

const resetOnly = process.argv.includes('--reset');
(resetOnly ? clear() : seed())
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
