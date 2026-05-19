const prisma = require('../lib/prisma');

async function computeProgress(studentId, criteriaType) {
  if (criteriaType === 'SECTIONS_COMPLETED') {
    return prisma.studentSection.count({
      where: { studentId, completedAt: { not: null } },
    });
  }

  if (criteriaType === 'XP_EARNED') {
    const enrollments = await prisma.studentCourse.findMany({
      where: { studentId },
      select: { lifetimePoints: true },
    });
    return enrollments.reduce((sum, e) => sum + e.lifetimePoints, 0);
  }

  if (criteriaType === 'QUESTIONS_ANSWERED') {
    return prisma.questionAttempt.count({ where: { studentId } });
  }

  if (criteriaType === 'STREAK_DAYS') {
    const max = await prisma.studentEnrollment.aggregate({
      where: { studentId },
      _max: { streak: true },
    });
    return max._max.streak ?? 0;
  }

  return 0;
}

async function awardBadges(studentId) {
  const badges = await prisma.badge.findMany();
  if (!badges.length) return;

  for (const badge of badges) {
    const existing = await prisma.studentBadge.findUnique({
      where: { studentId_badgeId: { studentId, badgeId: badge.id } },
    });

    if (existing?.dateAchieved) continue;

    const progress = await computeProgress(studentId, badge.criteriaType);
    const earned = progress >= badge.criteriaAmount;

    await prisma.studentBadge.upsert({
      where: { studentId_badgeId: { studentId, badgeId: badge.id } },
      update: {
        progress,
        ...(earned && { dateAchieved: new Date() }),
      },
      create: {
        studentId,
        badgeId: badge.id,
        progress,
        dateAchieved: earned ? new Date() : null,
      },
    });
  }
}

async function awardStreakBadges(studentId, currentStreak) {
  const badges = await prisma.badge.findMany({
    where: { badgeType: 'STREAK', criteriaAmount: { lte: currentStreak } },
  });

  for (const badge of badges) {
    const existing = await prisma.studentBadge.findUnique({
      where: { studentId_badgeId: { studentId, badgeId: badge.id } },
    });

    if (existing?.dateAchieved) continue;

    await prisma.studentBadge.upsert({
      where: { studentId_badgeId: { studentId, badgeId: badge.id } },
      update: { dateAchieved: new Date() },
      create: { studentId, badgeId: badge.id, dateAchieved: new Date(), progress: currentStreak },
    });

    if (badge.xpReward > 0) {
      await prisma.studentEnrollment.updateMany({
        where: { studentId },
        data: {
          currentPoints: { increment: badge.xpReward },
          lifetimePoints: { increment: badge.xpReward },
        },
      });
    }
  }
}

module.exports = { awardBadges, awardStreakBadges };
