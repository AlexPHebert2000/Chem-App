const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const authSessionService = require('../services/authSession.service');

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
  const { role, email, password, courseId, stayLoggedIn } = req.body;
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

  if (role === 'STUDENT') {
    const enrollment = await prisma.studentCourse.findUnique({
      where: { studentId_courseId: { studentId: user.id, courseId } },
    });
    if (!enrollment) return res.status(403).json({ error: 'Student is not enrolled in this course' });
  }

  const token = signToken(user.id, role);
  const responseBody = { token, user: { id: user.id, name: user.name, email: user.email, role } };

  if (stayLoggedIn === true) {
    responseBody.sessionToken = await authSessionService.createAuthSession(user.id, role);
  }

  res.json(responseBody);
}

async function refresh(req, res) {
  const { sessionToken } = req.body;
  if (!sessionToken) return res.status(400).json({ error: 'sessionToken is required' });

  const session = await authSessionService.validateAuthSession(sessionToken);
  if (!session) return res.status(401).json({ error: 'SESSION_EXPIRED' });

  const model = getModel(session.userRole);
  if (!model) return res.status(401).json({ error: 'SESSION_EXPIRED' });

  const user = await model.findUnique({
    where: { id: session.userId },
    omit: { password: true },
  });
  if (!user) return res.status(401).json({ error: 'SESSION_EXPIRED' });

  const token = signToken(user.id, session.userRole);
  res.json({ token, user: { ...user, role: session.userRole } });
}

async function logout(req, res) {
  const { sessionToken } = req.body;
  if (sessionToken) {
    await authSessionService.deleteAuthSession(sessionToken);
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

module.exports = { signup, login, refresh, logout, me };
