import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthToken } from '@/lib/auth';
import { broadcastListUpdate } from '@/lib/sse';

const prisma = new PrismaClient();

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
    const recipeId = parseInt(id);
    const { listId, selectedItemIds } = await req.json();

    if (!listId) {
      return NextResponse.json(
        { error: 'List ID is required' },
        { status: 400 }
      );
    }

    // Check if user owns the recipe
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { items: true }
    });

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    if (recipe.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Check if user has access to the list
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

    // Only owner or editor can add items to list
    const isOwner = list.ownerId === userId;
    const collaborator = list.collaborators.find(c => c.userId === userId);
    const isEditor = collaborator && collaborator.role === 'editor';

    if (!isOwner && !isEditor) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Filter items based on selectedItemIds (if provided, otherwise use all)
    const itemsToAdd = selectedItemIds && selectedItemIds.length > 0
      ? recipe.items.filter((_, idx) => selectedItemIds.includes(idx))
      : recipe.items;

    // Add selected recipe items to the list
    const createdItems = await Promise.all(
      itemsToAdd.map(item =>
        prisma.shoppingListItem.create({
          data: {
            listId,
            name: item.name,
            category: item.category || null,
            completed: false,
            recipeId: recipe.id,
            recipeName: recipe.title
          }
        })
      )
    );

    // Create ItemCategory mappings for items with categories
    const categoryUpdates = await Promise.all(
      itemsToAdd.map(item => {
        if (item.category) {
          return prisma.itemCategory.upsert({
            where: {
              listId_itemName: {
                listId,
                itemName: item.name
              }
            },
            update: { category: item.category },
            create: {
              listId,
              itemName: item.name,
              category: item.category
            }
          });
        }
        return Promise.resolve(null);
      })
    );

    // Broadcast update to all subscribers
    broadcastListUpdate(listId, {
      type: 'items_added',
      count: createdItems.length,
      items: createdItems,
      // Include category updates for items with categories
      categoryUpdates: categoryUpdates.filter(u => u !== null).map(u => ({
        itemName: u?.itemName,
        category: u?.category
      }))
    });

    return NextResponse.json({ 
      success: true, 
      itemsAdded: createdItems.length 
    }, { status: 201 });
  } catch (error) {
    console.error('Add recipe to list error:', error);
    return NextResponse.json(
      { error: 'Failed to add recipe to list' },
      { status: 500 }
    );
  }
}
