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

    // Get all unique categories from items in this list
    const items = await prisma.shoppingListItem.findMany({
      where: { listId },
      select: { category: true },
      distinct: ['category']
    });

    const categories = items
      .map(item => item.category)
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
