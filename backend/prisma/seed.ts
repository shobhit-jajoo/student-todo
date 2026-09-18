import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'student@example.com';
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    console.log('Seed user already exists');
    return;
  }

  const user = await prisma.user.create({
    data: {
      name: 'Demo Student',
      email,
      passwordHash: await bcrypt.hash('Password123!', 10),
    },
  });

  await prisma.task.createMany({
    data: [
      {
        title: 'Prepare DBMS Assignment',
        description: 'Complete the database systems assignment and review schema diagrams.',
        completed: false,
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
        category: 'Academic',
        userId: user.id,
      },
      {
        title: 'Review DAA Notes',
        description: 'Go through dynamic programming examples for the upcoming quiz.',
        completed: true,
        priority: 'MEDIUM',
        dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
        category: 'Study',
        userId: user.id,
      },
      {
        title: 'Pay Library Fine',
        description: 'Submit library due payment before the end of the week.',
        completed: false,
        priority: 'LOW',
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
        category: 'Admin',
        userId: user.id,
      },
      {
        title: 'Workout Session',
        description: '30-minute workout and stretching routine.',
        completed: false,
        priority: 'MEDIUM',
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1),
        category: 'Personal',
        userId: user.id,
      },
      {
        title: 'Submit Seminar Summary',
        description: 'Upload the seminar recap and checklist to the LMS.',
        completed: true,
        priority: 'HIGH',
        dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        category: 'Academic',
        userId: user.id,
      },
    ],
  });

  console.log('Database seeded successfully');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
