import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> }
) {
  try {
    const userId = getAuthToken(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, collaboratorId: collabIdStr } = await params;
    const listId = parseInt(id);
    const collaboratorRecordId = parseInt(collabIdStr);

    // Check if list exists
    const list = await prisma.shoppingList.findUnique({
      where: { id: listId }
    });

    if (!list) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      );
    }

    // Get the collaborator record
    const collaborator = await prisma.listCollaborator.findUnique({
      where: { id: collaboratorRecordId }
    });

    if (!collaborator || collaborator.listId !== listId) {
      return NextResponse.json(
        { error: 'Collaborator not found' },
        { status: 404 }
      );
    }

    // Allow acceptance only if user is the invited collaborator
    if (collaborator.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Update the collaborator status to accepted
    const updatedCollaborator = await prisma.listCollaborator.update({
      where: { id: collaboratorRecordId },
      data: { status: 'accepted' },
      include: { user: { select: { id: true, username: true } } }
    });

    return NextResponse.json(updatedCollaborator);
  } catch (error) {
    console.error('Accept invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}
