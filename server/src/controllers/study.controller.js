const prisma = require('../lib/prisma');
const workSessionService = require('../services/workSession.service');

async function startWorkSession(req, res) {
  const { courseId } = req.body;
  const studentId = req.user.sub;

  if (!courseId) return res.status(400).json({ error: 'courseId is required' });

  const enrollment = await prisma.studentCourse.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  });
  if (!enrollment) return res.status(403).json({ error: 'Student is not enrolled in this course' });

  const { session, isNew } = await workSessionService.getOrCreateWorkSession(studentId, courseId);
  res.json({ sessionId: session.id, isNew, startedAt: session.startedAt });
}

async function endWorkSession(req, res) {
  const { sessionId } = req.body;
  const studentId = req.user.sub;

  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.studentId !== studentId) {
    return res.status(404).json({ error: 'Session not found' });
  }
  if (session.endedAt) return res.status(400).json({ error: 'Session already ended' });

  await workSessionService.closeWorkSession(sessionId);
  res.json({ message: 'Session ended' });
}

module.exports = { startWorkSession, endWorkSession };
