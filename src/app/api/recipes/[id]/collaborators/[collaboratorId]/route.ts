import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthToken } from '@/lib/auth';

const prisma = new PrismaClient();

// DELETE - Remove a collaborator from a recipe
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> }
) {
  try {
    const userId = getAuthToken(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, collaboratorId } = await params;
    const recipeId = parseInt(id);
    const collabId = parseInt(collaboratorId);

    // Get collaborator to check permissions
    const collaborator = await prisma.recipeCollaborator.findUnique({
      where: { id: collabId },
      include: { recipe: true }
    });

    if (!collaborator) {
      return NextResponse.json(
        { error: 'Collaborator not found' },
        { status: 404 }
      );
    }

    // Check if recipe matches
    if (collaborator.recipeId !== recipeId) {
      return NextResponse.json(
        { error: 'Collaborator does not belong to this recipe' },
        { status: 400 }
      );
    }

    // Only owner can remove collaborators, or collaborator can remove themselves
    if (collaborator.recipe.ownerId !== userId && collaborator.userId !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to remove this collaborator' },
        { status: 403 }
      );
    }

    await prisma.recipeCollaborator.delete({
      where: { id: collabId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete recipe collaborator error:', error);
    return NextResponse.json(
      { error: 'Failed to remove collaborator' },
      { status: 500 }
    );
  }
}
