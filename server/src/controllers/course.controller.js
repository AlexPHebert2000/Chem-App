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

module.exports = { createCourse };
