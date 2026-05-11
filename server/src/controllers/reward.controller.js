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

module.exports = { createReward, getCourseRewards, deleteReward };
