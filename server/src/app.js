const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const courseRoutes = require('./routes/course.routes');
const chapterRoutes = require('./routes/chapter.routes');
const sectionRoutes = require('./routes/section.routes');
const questionRoutes = require('./routes/question.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/questions', questionRoutes);

module.exports = app;
