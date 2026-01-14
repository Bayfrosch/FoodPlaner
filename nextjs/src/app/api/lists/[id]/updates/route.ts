import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthToken } from '@/lib/auth';
import { addListSubscriber, createSSEResponse } from '@/lib/sse';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[SSE] Connection attempt to list updates');
    
    const userId = getAuthToken(req);
    if (!userId) {
      console.log('[SSE] Unauthorized - no token');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const listId = parseInt(id);
    console.log('[SSE] User authenticated, listId:', listId, 'userId:', userId);

    // Verify user has access to this list
    const list = await prisma.shoppingList.findUnique({
      where: { id: listId },
      include: { collaborators: true }
    });

    if (!list) {
      console.log('[SSE] List not found:', listId);
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      );
    }

    if (list.ownerId !== userId && !list.collaborators.some(c => c.userId === userId)) {
      console.log('[SSE] Forbidden - user', userId, 'does not have access to list', listId);
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    console.log('[SSE] User authorized, creating stream for list', listId);

    // Create SSE response
    const { stream, writer } = createSSEResponse();
    
    // Add this client as a subscriber
    const unsubscribe = addListSubscriber(listId, writer);

    // Handle client disconnect cleanup
    let isConnected = true;
    const cleanup = () => {
      if (isConnected) {
        isConnected = false;
        console.log('[SSE] Client disconnected from list', listId);
        unsubscribe();
      }
    };

    req.signal.addEventListener('abort', cleanup);

    // Send initial connection confirmation
    writer(`data: ${JSON.stringify({ type: 'connected', listId })}\n\n`);
    console.log('[SSE] Connection established for list', listId);

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[SSE] Connection error:', error);
    return NextResponse.json(
      { error: 'Failed to establish connection' },
      { status: 500 }
    );
  }
}
