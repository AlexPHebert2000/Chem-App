const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

function signToken(id, role) {
  return jwt.sign({ sub: id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
}

function getModel(role) {
  if (role === 'TEACHER') return prisma.teacher;
  if (role === 'STUDENT') return prisma.student;
  return null;
}

async function signup(req, res) {
  const { role, name, email, password } = req.body;
  const errors = [];

  if (!role || !['TEACHER', 'STUDENT'].includes(role)) errors.push('role must be TEACHER or STUDENT');
  if (!name || !name.trim()) errors.push('name is required');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('valid email is required');
  if (!password || password.length < 8) errors.push('password must be at least 8 characters');
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const model = getModel(role);
  const existing = await model.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already in use' });

  const hashed = await bcrypt.hash(password, 12);
  const user = await model.create({
    data: { name: name.trim(), email, password: hashed },
  });

  const token = signToken(user.id, role);
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role } });
}

async function login(req, res) {
  const { role, email, password, courseId } = req.body;
  const errors = [];

  if (!role || !['TEACHER', 'STUDENT'].includes(role)) errors.push('role must be TEACHER or STUDENT');
  if (!email) errors.push('email is required');
  if (!password) errors.push('password is required');
  if (role === 'STUDENT' && !courseId) errors.push('courseId is required for student login');
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const model = getModel(role);
  const user = await model.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken(user.id, role);
  const responseBody = { token, user: { id: user.id, name: user.name, email: user.email, role } };

  if (role === 'STUDENT') {
    const enrollment = await prisma.studentCourse.findUnique({
      where: { studentId_courseId: { studentId: user.id, courseId } },
    });
    if (!enrollment) return res.status(403).json({ error: 'Student is not enrolled in this course' });

    const session = await prisma.session.create({
      data: { studentId: user.id, courseId, startedAt: new Date() },
    });
    responseBody.sessionId = session.id;
  }

  res.json(responseBody);
}

async function logout(req, res) {
  const { role, sub: studentId } = req.user;

  if (role === 'STUDENT') {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.studentId !== studentId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    });
  }

  res.json({ message: 'Logged out successfully' });
}

async function me(req, res) {
  const { sub: id, role } = req.user;
  const model = getModel(role);
  if (!model) return res.status(400).json({ error: 'Invalid role in token' });

  const user = await model.findUnique({
    where: { id },
    omit: { password: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({ ...user, role });
}

module.exports = { signup, login, logout, me };
