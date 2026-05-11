const prisma = require('../lib/prisma');

async function ownedCourse(courseId, teacherId, res) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) { res.status(404).json({ error: 'Course not found' }); return null; }
  if (course.teacherId !== teacherId) { res.status(403).json({ error: 'You do not own this course' }); return null; }
  return course;
}

async function createReward(req, res) {
  const { courseId } = req.params;
  const teacherId = req.user.sub;
  const { name, redemptionLimit } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  if (redemptionLimit == null || !Number.isInteger(redemptionLimit) || redemptionLimit < 1) {
    return res.status(400).json({ error: 'redemptionLimit must be a positive integer' });
  }

  if (!await ownedCourse(courseId, teacherId, res)) return;

  const reward = await prisma.reward.create({
    data: { courseId, name: name.trim(), redemptionLimit },
  });

  res.status(201).json(reward);
}

async function getCourseRewards(req, res) {
  const { courseId } = req.params;
  const teacherId = req.user.sub;

  if (!await ownedCourse(courseId, teacherId, res)) return;

  const rewards = await prisma.reward.findMany({
    where: { courseId },
    include: { _count: { select: { students: true } } },
    orderBy: { name: 'asc' },
  });

  const result = rewards.map(({ _count, ...r }) => ({
    ...r,
    redemptionCount: _count.students,
  }));

  res.json(result);
}

async function deleteReward(req, res) {
  const { rewardId } = req.params;
  const teacherId = req.user.sub;

  const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
  if (!reward) return res.status(404).json({ error: 'Reward not found' });

  if (!await ownedCourse(reward.courseId, teacherId, res)) return;

  await prisma.reward.delete({ where: { id: rewardId } });

  res.status(204).end();
}

async function getStudentCourseRewards(req, res) {
  const { courseId } = req.params;
  const studentId = req.user.sub;

  const enrollment = await prisma.studentCourse.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  });
  if (!enrollment) return res.status(403).json({ error: 'Not enrolled in this course' });

  const rewards = await prisma.reward.findMany({
    where: { courseId },
    include: { students: { where: { studentId } } },
    orderBy: { name: 'asc' },
  });

  const result = rewards.map(({ students, ...r }) => ({
    ...r,
    myRedemption: students[0] ?? null,
  }));

  res.json(result);
}

async function redeemReward(req, res) {
  const { rewardId } = req.params;
  const studentId = req.user.sub;

  const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
  if (!reward) return res.status(404).json({ error: 'Reward not found' });

  const enrollment = await prisma.studentCourse.findUnique({
    where: { studentId_courseId: { studentId, courseId: reward.courseId } },
  });
  if (!enrollment) return res.status(403).json({ error: 'Not enrolled in this course' });

  const existing = await prisma.studentReward.findUnique({
    where: { studentId_rewardId: { studentId, rewardId } },
  });
  if (existing) return res.status(409).json({ error: 'Already redeemed this reward' });

  const approvedCount = await prisma.studentReward.count({
    where: { rewardId, teacherConfirmation: true },
  });
  if (approvedCount >= reward.redemptionLimit) {
    return res.status(409).json({ error: 'Redemption limit reached for this reward' });
  }

  const redemption = await prisma.studentReward.create({
    data: { studentId, rewardId },
  });

  res.status(201).json(redemption);
}

async function getCourseRedemptions(req, res) {
  const { courseId } = req.params;
  const teacherId = req.user.sub;
  const { status } = req.query;

  if (!await ownedCourse(courseId, teacherId, res)) return;

  const where = {
    reward: { courseId },
    ...(status === 'PENDING' && { teacherConfirmation: false }),
    ...(status === 'APPROVED' && { teacherConfirmation: true }),
  };

  const redemptions = await prisma.studentReward.findMany({
    where,
    include: {
      student: { omit: { password: true } },
      reward: true,
    },
    orderBy: { redeemedAt: 'asc' },
  });

  res.json(redemptions);
}

async function updateRedemption(req, res) {
  const { redemptionId } = req.params;
  const teacherId = req.user.sub;
  const { action } = req.body;

  if (action !== 'approve' && action !== 'reject') {
    return res.status(400).json({ error: 'action must be "approve" or "reject"' });
  }

  const redemption = await prisma.studentReward.findUnique({
    where: { id: redemptionId },
    include: { reward: true },
  });
  if (!redemption) return res.status(404).json({ error: 'Redemption not found' });

  if (!await ownedCourse(redemption.reward.courseId, teacherId, res)) return;

  if (redemption.teacherConfirmation) {
    return res.status(409).json({ error: 'Redemption already approved' });
  }

  if (action === 'approve') {
    const updated = await prisma.studentReward.update({
      where: { id: redemptionId },
      data: { teacherConfirmation: true, redeemedAt: new Date() },
    });
    return res.json(updated);
  }

  await prisma.studentReward.delete({ where: { id: redemptionId } });
  res.status(204).end();
}

module.exports = {
  createReward, getCourseRewards, deleteReward,
  getStudentCourseRewards, redeemReward, getCourseRedemptions, updateRedemption,
};
