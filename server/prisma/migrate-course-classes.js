const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const studentCourses = await prisma.studentCourse.findMany();

  for (const sc of studentCourses) {
    // Find or create a default CourseClass for this course
    let courseClass = await prisma.courseClass.findFirst({ where: { courseId: sc.courseId } });

    if (!courseClass) {
      courseClass = await prisma.courseClass.create({
        data: { courseId: sc.courseId, sectionNumber: '001', meetingTimes: 'TBD' },
      });
      console.log(`Created CourseClass for course ${sc.courseId}`);
    }

    // Create StudentEnrollment if it doesn't exist
    const existing = await prisma.studentEnrollment.findUnique({
      where: { studentId_courseClassId: { studentId: sc.studentId, courseClassId: courseClass.id } },
    });

    if (!existing) {
      await prisma.studentEnrollment.create({
        data: {
          studentId: sc.studentId,
          courseClassId: courseClass.id,
          currentPoints: sc.currentPoints,
          lifetimePoints: sc.lifetimePoints,
          streak: sc.streak,
          currentSectionId: sc.currentSectionId,
          lastActivityDate: sc.lastActivityDate,
        },
      });
      console.log(`Migrated enrollment for student ${sc.studentId} → class ${courseClass.id}`);
    }
  }

  console.log('Migration complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
