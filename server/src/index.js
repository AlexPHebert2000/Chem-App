require('dotenv').config();
const app = require('./app');
const prisma = require('./lib/prisma');

const PORT = process.env.PORT || 3000;

prisma.$connect()
  .then(async () => {
    console.log('[db] Connected to MongoDB');
    try {
      await prisma.teacher.findFirst();
      console.log('[db] Test query succeeded');
    } catch (e) {
      console.error('[db] Test query failed:', e.message);
    }
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((e) => {
    console.error('[db] Failed to connect to MongoDB:', e.message);
    process.exit(1);
  });
