const crypto = require('crypto');
const prisma = require('../lib/prisma');

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hashToken(plaintext) {
  return crypto.createHash('sha256').update(plaintext).digest('hex');
}

async function createAuthSession(userId, userRole) {
  const plaintext = crypto.randomBytes(32).toString('hex');
  const token = hashToken(plaintext);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await prisma.authSession.create({ data: { token, userId, userRole, expiresAt } });
  return plaintext;
}

async function validateAuthSession(plaintext) {
  const token = hashToken(plaintext);
  const session = await prisma.authSession.findUnique({ where: { token } });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.authSession.delete({ where: { token } });
    return null;
  }
  await prisma.authSession.update({ where: { token }, data: { lastUsedAt: new Date() } });
  return session;
}

async function deleteAuthSession(plaintext) {
  const token = hashToken(plaintext);
  // deleteMany avoids throwing if token not found (e.g. already expired/deleted)
  await prisma.authSession.deleteMany({ where: { token } });
}

module.exports = { createAuthSession, validateAuthSession, deleteAuthSession };
