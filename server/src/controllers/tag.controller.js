const prisma = require('../lib/prisma');

const TAG_COLORS = ['#9B6EF5', '#FFC107', '#26C6B0', '#FF6E50', '#2F9EE8', '#66BB3A', '#E59A00', '#6C3FC4'];

async function getAllTags(req, res) {
  const tags = await prisma.questionTag.findMany({ orderBy: { name: 'asc' } });
  res.json(tags);
}

async function createOrGetTag(req, res) {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

  const trimmed = name.trim();

  const existing = await prisma.questionTag.findFirst({
    where: { name: { equals: trimmed, mode: 'insensitive' } },
  });
  if (existing) return res.json(existing);

  const count = await prisma.questionTag.count();
  const color = TAG_COLORS[count % TAG_COLORS.length];

  const tag = await prisma.questionTag.create({
    data: { name: trimmed, color, questionIds: [] },
  });
  res.status(201).json(tag);
}

module.exports = { getAllTags, createOrGetTag };
