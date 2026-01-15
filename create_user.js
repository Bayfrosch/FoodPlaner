const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  try {
    // Delete existing test user
    await prisma.user.deleteMany({
      where: { email: 'test@example.com' }
    });

    // Create new test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: hashedPassword
      }
    });

    console.log('✅ Test user created:', user);
    console.log('\nLogin with:');
    console.log('Email: test@example.com');
    console.log('Password: password123');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
