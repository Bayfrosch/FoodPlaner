import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Setze Datenbank zurück (reset)...');

    // Delete in reverse order of foreign key dependencies
    await prisma.listCollaborator.deleteMany();
    await prisma.shoppingListItem.deleteMany();
    await prisma.itemCategory.deleteMany();
    await prisma.shoppingList.deleteMany();
    await prisma.recipeItem.deleteMany();
    await prisma.recipe.deleteMany();
    await prisma.user.deleteMany();

    console.log('✓ Datenbank erfolgreich zurückgesetzt!');
  } catch (error) {
    console.error('Fehler beim Zurücksetzen der Datenbank:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
