import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthToken } from '@/lib/auth';
import { broadcastListUpdate } from '@/lib/sse';

const prisma = new PrismaClient();

export async function PUT(
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
    const listId = parseInt(id);
    const itemId = parseInt(itemIdStr);
    const { completed, category } = await req.json();

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

    // Only owner or editor can modify items
    const isOwner = list.ownerId === userId;
    const collaborator = list.collaborators.find(c => c.userId === userId);
    const isEditor = collaborator && collaborator.role === 'editor';

    if (!isOwner && !isEditor) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (typeof completed === 'boolean') {
      updateData.completed = completed;
    }
    if (category !== undefined) {
      updateData.category = category;
    }

    const item = await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: updateData
    });

    // If category changed, update the ItemCategory mapping
    if (category !== undefined) {
      await prisma.itemCategory.upsert({
        where: {
          listId_itemName: {
            listId,
            itemName: item.name
          }
        },
        update: { category },
        create: {
          listId,
          itemName: item.name,
          category
        }
      });
    }

    // Broadcast update to all subscribers
    broadcastListUpdate(listId, {
      type: 'item_updated',
      item
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Update item error:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
  }
}

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
    const listId = parseInt(id);
    const itemId = parseInt(itemIdStr);

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

    // Only owner or editor can delete items
    const isOwner = list.ownerId === userId;
    const collaborator = list.collaborators.find(c => c.userId === userId);
    const isEditor = collaborator && collaborator.role === 'editor';

    if (!isOwner && !isEditor) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get the item before deleting (to preserve category mapping)
    const item = await prisma.shoppingListItem.findUnique({
      where: { id: itemId }
    });

    await prisma.shoppingListItem.delete({
      where: { id: itemId }
    });

    // Category mapping is preserved - NOT deleted
    // Future items with the same name will get this category

    // Broadcast update to all subscribers
    broadcastListUpdate(listId, {
      type: 'item_deleted',
      itemId,
      itemName: item?.name
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete item error:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}
