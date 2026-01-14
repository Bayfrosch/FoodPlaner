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
    const listId = parseInt(id);

    // Check if user has access to this list (owner or collaborator)
    const list = await prisma.shoppingList.findUnique({
      where: { id: listId },
      include: { collaborators: true }
    });

    if (!list) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      );
    }

    // Allow viewing collaborators if user is owner or any type of collaborator
    const isOwner = list.ownerId === userId;
    const isCollaborator = list.collaborators.some(c => c.userId === userId);

    if (!isOwner && !isCollaborator) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get all collaborators
    const collaborators = await prisma.listCollaborator.findMany({
      where: { listId },
      include: { user: { select: { id: true, email: true, username: true } } }
    });

    return NextResponse.json(collaborators);
  } catch (error) {
    console.error('Get collaborators error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaborators' },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const listId = parseInt(id);
    const { email, role = 'viewer' } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user owns the list
    const list = await prisma.shoppingList.findUnique({
      where: { id: listId }
    });

    if (!list) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      );
    }

    console.log(`[Collaborators] User ${userId} trying to add collaborator to list ${listId}. List owner: ${list.ownerId}`);

    if (list.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden - only list owner can add collaborators' },
        { status: 403 }
      );
    }

    // Find user by email
    const invitedUser = await prisma.user.findUnique({
      where: { email }
    });

    if (!invitedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already collaborator
    const existing = await prisma.listCollaborator.findUnique({
      where: {
        listId_userId: {
          listId,
          userId: invitedUser.id
        }
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'User is already a collaborator' },
        { status: 400 }
      );
    }

    // Add collaborator
    const collaborator = await prisma.listCollaborator.create({
      data: {
        listId,
        userId: invitedUser.id,
        role
      },
      include: { user: { select: { id: true, email: true, username: true } } }
    });

    return NextResponse.json(collaborator, { status: 201 });
  } catch (error) {
    console.error('Add collaborator error:', error);
    return NextResponse.json(
      { error: 'Failed to add collaborator' },
      { status: 500 }
    );
  }
}
