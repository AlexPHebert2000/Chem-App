/**
 * One-time migration: backfill correctExplanation and incorrectExplanation
 * from the old solutionExplanation field on Question documents.
 *
 * Run once: node server/prisma/migrate-explanations.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$runCommandRaw({
    update: 'Question',
    updates: [
      {
        q: { solutionExplanation: { $exists: true } },
        u: [
          {
            $set: {
              correctExplanation: {
                $cond: [
                  { $or: [{ $eq: ['$correctExplanation', null] }, { $not: ['$correctExplanation'] }] },
                  '$solutionExplanation',
                  '$correctExplanation',
                ],
              },
              incorrectExplanation: {
                $cond: [
                  { $or: [{ $eq: ['$incorrectExplanation', null] }, { $not: ['$incorrectExplanation'] }] },
                  { $concat: ['Review: ', '$solutionExplanation'] },
                  '$incorrectExplanation',
                ],
              },
            },
          },
        ],
        multi: true,
      },
    ],
  });

  console.log('Migration result:', JSON.stringify(result, null, 2));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
