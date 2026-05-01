const prisma = require('../lib/prisma');

const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 1 hour

async function getOrCreateWorkSession(studentId, courseId) {
  const existing = await prisma.session.findFirst({
    where: { studentId, courseId, endedAt: null },
    orderBy: { startedAt: 'desc' },
  });

  if (existing) {
    const lastActivity = existing.lastActivityAt ?? existing.startedAt;
    const inactive = Date.now() - new Date(lastActivity).getTime() > INACTIVITY_LIMIT_MS;

    if (!inactive) return { session: existing, isNew: false };

    // Stale session — close it before opening a new one
    await prisma.session.update({
      where: { id: existing.id },
      data: { endedAt: new Date() },
    });
  }

  const now = new Date();
  const session = await prisma.session.create({
    data: { studentId, courseId, startedAt: now, lastActivityAt: now },
  });
  return { session, isNew: true };
}

async function recordActivity(sessionId, pointsDelta = 0) {
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      lastActivityAt: new Date(),
      questionsAnswered: { increment: 1 },
      pointsEarned: { increment: pointsDelta },
    },
  });
}

async function closeWorkSession(sessionId) {
  await prisma.session.update({
    where: { id: sessionId },
    data: { endedAt: new Date() },
  });
}

module.exports = { getOrCreateWorkSession, recordActivity, closeWorkSession };
