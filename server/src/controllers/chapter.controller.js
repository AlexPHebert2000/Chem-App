const prisma = require('../lib/prisma');

async function ownedCourse(courseId, teacherId) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { error: 'Course not found', status: 404 };
  if (course.teacherId !== teacherId) return { error: 'You do not own this course', status: 403 };
  return { course };
}

async function getCourseChapters(req, res) {
  const { courseId } = req.params;
  const { error, status } = await ownedCourse(courseId, req.user.sub);
  if (error) return res.status(status).json({ error });

  const chapters = await prisma.chapter.findMany({
    where: { courseId },
    orderBy: { orderIndex: 'asc' },
    include: { _count: { select: { sections: true } } },
  });
  res.json(chapters);
}

async function createChapter(req, res) {
  const { courseId } = req.params;
  const { name, description } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  if (!description || !description.trim()) return res.status(400).json({ error: 'description is required' });

  const { error, status, course } = await ownedCourse(courseId, req.user.sub);
  if (error) return res.status(status).json({ error });

  const orderIndex = await prisma.chapter.count({ where: { courseId } });

  const chapter = await prisma.chapter.create({
    data: { courseId: course.id, name: name.trim(), description: description.trim(), orderIndex },
  });

  res.status(201).json(chapter);
}

async function swapChapters(req, res) {
  const { courseId } = req.params;
  const { chapterIdA, chapterIdB } = req.body;

  if (!chapterIdA || !chapterIdB) return res.status(400).json({ error: 'chapterIdA and chapterIdB are required' });
  if (chapterIdA === chapterIdB) return res.status(400).json({ error: 'chapterIdA and chapterIdB must be different' });

  const { error, status } = await ownedCourse(courseId, req.user.sub);
  if (error) return res.status(status).json({ error });

  const [chapterA, chapterB] = await Promise.all([
    prisma.chapter.findUnique({ where: { id: chapterIdA } }),
    prisma.chapter.findUnique({ where: { id: chapterIdB } }),
  ]);

  if (!chapterA || chapterA.courseId !== courseId) return res.status(404).json({ error: 'chapterIdA not found in this course' });
  if (!chapterB || chapterB.courseId !== courseId) return res.status(404).json({ error: 'chapterIdB not found in this course' });

  await Promise.all([
    prisma.chapter.update({ where: { id: chapterIdA }, data: { orderIndex: chapterB.orderIndex } }),
    prisma.chapter.update({ where: { id: chapterIdB }, data: { orderIndex: chapterA.orderIndex } }),
  ]);

  res.json({ chapterIdA, orderIndexA: chapterB.orderIndex, chapterIdB, orderIndexB: chapterA.orderIndex });
}

async function getChapterSections(req, res) {
  const { chapterId } = req.params;
  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

  const { error, status } = await ownedCourse(chapter.courseId, req.user.sub);
  if (error) return res.status(status).json({ error });

  const sections = await prisma.section.findMany({
    where: { chapterId },
    orderBy: { orderIndex: 'asc' },
    include: { _count: { select: { questions: true } } },
  });
  res.json(sections);
}

async function createSection(req, res) {
  const { chapterId } = req.params;
  const { name, description } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  if (!description || !description.trim()) return res.status(400).json({ error: 'description is required' });

  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

  const { error, status } = await ownedCourse(chapter.courseId, req.user.sub);
  if (error) return res.status(status).json({ error });

  const orderIndex = await prisma.section.count({ where: { chapterId } });

  const section = await prisma.section.create({
    data: { chapterId, name: name.trim(), description: description.trim(), orderIndex },
  });

  res.status(201).json(section);
}

async function swapSections(req, res) {
  const { chapterId } = req.params;
  const { sectionIdA, sectionIdB } = req.body;

  if (!sectionIdA || !sectionIdB) return res.status(400).json({ error: 'sectionIdA and sectionIdB are required' });
  if (sectionIdA === sectionIdB) return res.status(400).json({ error: 'sectionIdA and sectionIdB must be different' });

  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

  const { error, status } = await ownedCourse(chapter.courseId, req.user.sub);
  if (error) return res.status(status).json({ error });

  const [sectionA, sectionB] = await Promise.all([
    prisma.section.findUnique({ where: { id: sectionIdA } }),
    prisma.section.findUnique({ where: { id: sectionIdB } }),
  ]);

  if (!sectionA || sectionA.chapterId !== chapterId) return res.status(404).json({ error: 'sectionIdA not found in this chapter' });
  if (!sectionB || sectionB.chapterId !== chapterId) return res.status(404).json({ error: 'sectionIdB not found in this chapter' });

  await Promise.all([
    prisma.section.update({ where: { id: sectionIdA }, data: { orderIndex: sectionB.orderIndex } }),
    prisma.section.update({ where: { id: sectionIdB }, data: { orderIndex: sectionA.orderIndex } }),
  ]);

  res.json({ sectionIdA, orderIndexA: sectionB.orderIndex, sectionIdB, orderIndexB: sectionA.orderIndex });
}

module.exports = { getCourseChapters, createChapter, swapChapters, getChapterSections, createSection, swapSections };
