const prisma = require('../lib/prisma');

async function createCourse(req, res) {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const course = await prisma.course.create({
    data: { name: name.trim(), teacherId: req.user.sub },
  });

  res.status(201).json(course);
}

async function requestJoin(req, res) {
  const { courseId } = req.params;
  const studentId = req.user.sub;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const alreadyEnrolled = await prisma.studentCourse.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  });
  if (alreadyEnrolled) return res.status(409).json({ error: 'Already enrolled in this course' });

  const existing = await prisma.joinRequest.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  });
  if (existing) return res.status(409).json({ error: 'Join request already submitted' });

  const joinRequest = await prisma.joinRequest.create({
    data: { studentId, courseId },
  });

  res.status(201).json(joinRequest);
}

async function approveJoin(req, res) {
  const { courseId, requestId } = req.params;
  const teacherId = req.user.sub;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (course.teacherId !== teacherId) return res.status(403).json({ error: 'You do not own this course' });

  const joinRequest = await prisma.joinRequest.findUnique({ where: { id: requestId } });
  if (!joinRequest || joinRequest.courseId !== courseId) return res.status(404).json({ error: 'Join request not found' });
  if (joinRequest.status !== 'PENDING') return res.status(409).json({ error: `Join request is already ${joinRequest.status.toLowerCase()}` });

  await prisma.joinRequest.update({
    where: { id: requestId },
    data: { status: 'APPROVED' },
  });

  const enrollment = await prisma.studentCourse.create({
    data: { studentId: joinRequest.studentId, courseId },
  });

  res.status(201).json(enrollment);
}

async function getPendingJoinRequests(req, res) {
  const { courseId } = req.params;
  const teacherId = req.user.sub;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (course.teacherId !== teacherId) return res.status(403).json({ error: 'You do not own this course' });

  const requests = await prisma.joinRequest.findMany({
    where: { courseId, status: 'PENDING' },
    include: { student: { omit: { password: true } } },
    orderBy: { createdAt: 'asc' },
  });

  res.json(requests);
}

module.exports = { createCourse, requestJoin, approveJoin, getPendingJoinRequests };
