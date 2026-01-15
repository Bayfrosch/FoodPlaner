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

    // Get all unique categories from ItemCategory mappings
    const categoryMappings = await prisma.itemCategory.findMany({
      where: { listId },
      select: { category: true },
      distinct: ['category']
    });

    const categories = categoryMappings
      .map(mapping => mapping.category)
      .filter((cat): cat is string => cat !== null && cat !== undefined);

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
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
    const { itemName, category } = await req.json();

    if (!itemName || category === undefined) {
      return NextResponse.json(
        { error: 'itemName and category are required' },
        { status: 400 }
      );
    }

    // Check access - only owner or editor can modify categories
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

    const isOwner = list.ownerId === userId;
    const collaborator = list.collaborators.find(c => c.userId === userId);
    const isEditor = collaborator && collaborator.role === 'editor';

    if (!isOwner && !isEditor) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Create or update the ItemCategory mapping
    const categoryMapping = await prisma.itemCategory.upsert({
      where: {
        listId_itemName: {
          listId,
          itemName
        }
      },
      update: { category },
      create: {
        listId,
        itemName,
        category
      }
    });

    // Broadcast category update to all list subscribers
    broadcastListUpdate(listId, {
      type: 'category_updated',
      itemName,
      category,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(categoryMapping);
  } catch (error) {
    console.error('Update category error:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}
