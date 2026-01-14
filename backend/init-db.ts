import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Initialisiere Prisma-Datenbank...');

    // Erstelle Test-Account für Entwicklung
    const testPassword = 'test123';
    const testPasswordHash = await bcrypt.hash(testPassword, 10);
    
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        username: 'Test User',
        passwordHash: testPasswordHash
      }
    });

    console.log('✓ Test-Account erstellt (test@example.com / test123)');
    console.log('✓ Datenbank erfolgreich initialisiert!');
  } catch (error) {
    console.error('Fehler beim Initialisieren der Datenbank:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
