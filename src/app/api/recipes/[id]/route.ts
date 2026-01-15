import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getAuthToken(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const recipeId = parseInt(id);

    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { 
        items: true,
        collaborators: { where: { userId } }
      }
    });

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // Check if user owns this recipe or is a collaborator
    if (recipe.ownerId !== userId && recipe.collaborators.length === 0) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json(recipe);
  } catch (error) {
    console.error('Get recipe error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getAuthToken(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const recipeId = parseInt(id);
    const { title, description, items } = await req.json();

    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { collaborators: { where: { userId } } }
    });

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // Check if user owns this recipe or is an editor
    const isOwner = recipe.ownerId === userId;
    const isEditor = recipe.collaborators.length > 0 && recipe.collaborators[0].role === 'editor';
    
    if (!isOwner && !isEditor) {
      return NextResponse.json(
        { error: 'Forbidden - you need editor permission' },
        { status: 403 }
      );
    }

    // If items are provided, delete old items and create new ones
    if (items && items.length > 0) {
      // Delete old recipe items
      await prisma.recipeItem.deleteMany({
        where: { recipeId }
      });

      const updated = await prisma.recipe.update({
        where: { id: recipeId },
        data: {
          title: title || recipe.title,
          description: description || recipe.description,
          items: {
            create: items.map((item: any) => ({
              name: item.name,
              category: item.category || null,
              count: item.count || 1
            }))
          }
        },
        include: { items: true }
      });

      return NextResponse.json(updated);
    } else {
      // Only update title and description
      const updated = await prisma.recipe.update({
        where: { id: recipeId },
        data: {
          title: title || recipe.title,
          description: description || recipe.description
        },
        include: { items: true }
      });

      return NextResponse.json(updated);
    }
  } catch (error) {
    console.error('Update recipe error:', error);
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getAuthToken(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const recipeId = parseInt(id);

    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId }
    });

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // Only owner can delete recipes
    if (recipe.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden - only owner can delete' },
        { status: 403 }
      );
    }

    // Delete associated items first
    await prisma.recipeItem.deleteMany({
      where: { recipeId }
    });

    // Delete recipe
    await prisma.recipe.delete({
      where: { id: recipeId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete recipe error:', error);
    return NextResponse.json(
      { error: 'Failed to delete recipe' },
      { status: 500 }
    );
  }
}
