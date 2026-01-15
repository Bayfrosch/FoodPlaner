import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function PUT(
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
    const { role } = await req.json();

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

    if (list.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get the collaborator record to verify it belongs to this list
    const collaborator = await prisma.listCollaborator.findUnique({
      where: { id: collaboratorRecordId }
    });

    if (!collaborator || collaborator.listId !== listId) {
      return NextResponse.json(
        { error: 'Collaborator not found' },
        { status: 404 }
      );
    }

    // Update the collaborator role
    const updatedCollaborator = await prisma.listCollaborator.update({
      where: { id: collaboratorRecordId },
      data: { role },
      include: { user: { select: { id: true, username: true } } }
    });

    return NextResponse.json(updatedCollaborator);
  } catch (error) {
    console.error('Update collaborator error:', error);
    return NextResponse.json(
      { error: 'Failed to update collaborator' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    if (list.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get the collaborator record to find the user ID
    const collaborator = await prisma.listCollaborator.findUnique({
      where: { id: collaboratorRecordId }
    });

    if (!collaborator || collaborator.listId !== listId) {
      return NextResponse.json(
        { error: 'Collaborator not found' },
        { status: 404 }
      );
    }

    // Delete the collaborator
    await prisma.listCollaborator.delete({
      where: { id: collaboratorRecordId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete collaborator error:', error);
    return NextResponse.json(
      { error: 'Failed to remove collaborator' },
      { status: 500 }
    );
  }
}
