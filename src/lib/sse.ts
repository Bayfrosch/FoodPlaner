import { NextResponse } from 'next/server';

// Store active SSE connections per list
// Map<listId, Set<{ writer: (data: string) => void, closed: boolean }>>
const listSubscribers = new Map<number, Set<{ 
  writer: (data: string) => void;
  closed: boolean;
}>>();

export function addListSubscriber(listId: number, writer: (data: string) => void) {
  if (!listSubscribers.has(listId)) {
    listSubscribers.set(listId, new Set());
  }
  
  const subscriber = { writer, closed: false };
  listSubscribers.get(listId)!.add(subscriber);
  
  // Return unsubscribe function
  return () => {
    subscriber.closed = true;
    listSubscribers.get(listId)?.delete(subscriber);
  };
}

export function broadcastListUpdate(listId: number, message: any) {
  const subscribers = listSubscribers.get(listId);
  if (!subscribers) return;
  
  const data = JSON.stringify(message);
  const messageStr = `data: ${data}\n\n`;
  
  // Send to all active subscribers
  for (const subscriber of subscribers) {
    if (!subscriber.closed) {
      try {
        subscriber.writer(messageStr);
      } catch (error) {
        // Connection closed, mark for cleanup
        subscriber.closed = true;
      }
    }
  }
  
  // Cleanup closed connections
  for (const subscriber of subscribers) {
    if (subscriber.closed) {
      subscribers.delete(subscriber);
    }
  }
}

export function createSSEResponse() {
  const encoder = new TextEncoder();
  
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  
  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
  });
  
  const writer = (data: string) => {
    if (controller) {
      controller.enqueue(encoder.encode(data));
    }
  };
  
  return {
    stream,
    writer,
    close: () => {
      if (controller) {
        controller.close();
      }
    },
  };
}
