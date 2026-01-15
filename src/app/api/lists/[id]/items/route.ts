import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthToken } from '@/lib/auth';
import { broadcastListUpdate } from '@/lib/sse';

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

    // Check access
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

    if (list.ownerId !== userId && !list.collaborators.some(c => c.userId === userId)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const items = await prisma.shoppingListItem.findMany({
      where: { listId }
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Get items error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items' },
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
    const { name } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check access
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

    // Only owner or editor can create items
    const isOwner = list.ownerId === userId;
    const collaborator = list.collaborators.find(c => c.userId === userId);
    const isEditor = collaborator && collaborator.role === 'editor';

    if (!isOwner && !isEditor) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Check if this item name has a saved category
    const itemCategory = await prisma.itemCategory.findUnique({
      where: {
        listId_itemName: {
          listId,
          itemName: name
        }
      }
    });

    const item = await prisma.shoppingListItem.create({
      data: {
        name,
        listId,
        category: itemCategory?.category || null,
        completed: false
      }
    });

    // Broadcast update to all subscribers
    broadcastListUpdate(listId, {
      type: 'item_created',
      item,
      // Include category mapping if item has a category
      ...(itemCategory?.category && {
        category_updated: {
          itemName: name,
          category: itemCategory.category
        }
      })
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Create item error:', error);
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    );
  }
}
