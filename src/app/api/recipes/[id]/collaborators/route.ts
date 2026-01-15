import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthToken } from '@/lib/auth';

const prisma = new PrismaClient();

// GET all collaborators for a recipe
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getAuthToken(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const recipeId = parseInt(id);

    // Check if user is owner or collaborator
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { collaborators: { where: { userId } } }
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    if (recipe.ownerId !== userId && recipe.collaborators.length === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const collaborators = await prisma.recipeCollaborator.findMany({
      where: { recipeId },
      include: { user: { select: { id: true, username: true } } }
    });

    return NextResponse.json(collaborators);
  } catch (error) {
    console.error('Get recipe collaborators error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaborators' },
      { status: 500 }
    );
  }
}

// POST - Invite a user to a recipe
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getAuthToken(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const recipeId = parseInt(id);
    const { username, role = 'viewer' } = await req.json();

    // Verify ownership
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId }
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    if (recipe.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only the owner can share this recipe' },
        { status: 403 }
      );
    }

    // Find user by username
    const targetUser = await prisma.user.findUnique({
      where: { username }
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }

    if (targetUser.id === userId) {
      return NextResponse.json(
        { error: 'Du kannst dich nicht selbst einladen' },
        { status: 400 }
      );
    }

    // Check if already a collaborator
    const existing = await prisma.recipeCollaborator.findUnique({
      where: { recipeId_userId: { recipeId, userId: targetUser.id } }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Benutzer hat bereits Zugriff auf dieses Rezept' },
        { status: 400 }
      );
    }

    // Create collaborator
    const collaborator = await prisma.recipeCollaborator.create({
      data: {
        recipeId,
        userId: targetUser.id,
        role
      },
      include: { user: { select: { id: true, username: true } } }
    });

    return NextResponse.json(collaborator, { status: 201 });
  } catch (error) {
    console.error('Invite recipe collaborator error:', error);
    return NextResponse.json(
      { error: 'Failed to invite collaborator' },
      { status: 500 }
    );
  }
}
