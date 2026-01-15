import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const userId = getAuthToken(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, itemId: itemIdStr } = await params;
    const recipeId = parseInt(id);
    const itemId = parseInt(itemIdStr);

    // Check if user owns the recipe
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId }
    });

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    if (recipe.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    await prisma.recipeItem.delete({
      where: { id: itemId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete recipe item error:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}
