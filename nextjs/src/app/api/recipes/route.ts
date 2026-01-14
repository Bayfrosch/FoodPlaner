import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const userId = getAuthToken(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all recipes owned by the user
    const recipes = await prisma.recipe.findMany({
      where: { ownerId: userId },
      include: { items: true }
    });

    return NextResponse.json(recipes);
  } catch (error) {
    console.error('Get recipes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getAuthToken(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { title, description = '', items = [] } = await req.json();

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Create recipe with items
    const recipe = await prisma.recipe.create({
      data: {
        ownerId: userId,
        title,
        description,
        items: {
          create: items.map((item: any) => ({
            name: item.name,
            category: item.category || null
          }))
        }
      },
      include: { items: true }
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    console.error('Create recipe error:', error);
    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    );
  }
}
