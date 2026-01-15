import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthToken } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { categories } = await req.json();

    if (!Array.isArray(categories)) {
      return NextResponse.json(
        { error: 'Categories must be an array' },
        { status: 400 }
      );
    }

    // Verify user has access to this list
    const list = await prisma.shoppingList.findUnique({
      where: { id: listId },
      select: { ownerId: true }
    });

    if (!list) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      );
    }

    const collaborator = await prisma.listCollaborator.findFirst({
      where: { listId, userId }
    });

    const isOwner = list.ownerId === userId;
    const isEditor = collaborator?.role === 'editor';

    if (!isOwner && !isEditor) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Update or create category order
    const categoryOrder = await prisma.categoryOrder.upsert({
      where: { listId },
      update: { categories },
      create: { listId, categories }
    });

    return NextResponse.json(categoryOrder);
  } catch (error) {
    console.error('Update category order error:', error);
    return NextResponse.json(
      { error: 'Failed to update category order' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Verify user has access to this list
    const list = await prisma.shoppingList.findUnique({
      where: { id: listId },
      select: { ownerId: true }
    });

    if (!list) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      );
    }

    const collaborator = await prisma.listCollaborator.findFirst({
      where: { listId, userId }
    });

    if (list.ownerId !== userId && !collaborator) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const categoryOrder = await prisma.categoryOrder.findUnique({
      where: { listId }
    });

    return NextResponse.json(categoryOrder || { categories: [] });
  } catch (error) {
    console.error('Get category order error:', error);
    return NextResponse.json(
      { error: 'Failed to get category order' },
      { status: 500 }
    );
  }
}
