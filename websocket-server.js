const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const http = require('http');

const PORT = process.env.WEBSOCKET_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('ERROR: JWT_SECRET environment variable is required');
  process.exit(1);
}

// Create a simple HTTP server for WebSocket
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Map to track connected users and their WebSocket connections
const userConnections = new Map();

// Map to track which users are subscribed to which lists
const listSubscriptions = new Map();

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');
  
  // Extract token from URL query
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  
  if (!token) {
    ws.close(1008, 'Token required');
    return;
  }

  // Verify JWT
  let userId;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    userId = decoded.userId;
    console.log(`User ${userId} connected via WebSocket`);
  } catch (error) {
    ws.close(1008, 'Invalid token');
    return;
  }

  // Store connection
  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }
  userConnections.get(userId).add(ws);

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(userId, message, ws);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    console.log(`User ${userId} disconnected`);
    const connections = userConnections.get(userId);
    if (connections) {
      connections.delete(ws);
      if (connections.size === 0) {
        userConnections.delete(userId);
      }
    }

    // Remove from all list subscriptions
    for (const [listId, subscribers] of listSubscriptions.entries()) {
      subscribers.delete(userId);
      if (subscribers.size === 0) {
        listSubscriptions.delete(listId);
      }
    }
  });

  // Send welcome message
  ws.send(JSON.stringify({ type: 'connected', userId }));
});

// Handle messages from clients
function handleMessage(userId, message, ws) {
  if (message.type === 'subscribe') {
    // Subscribe to list updates
    const listId = message.listId;
    if (!listSubscriptions.has(listId)) {
      listSubscriptions.set(listId, new Set());
    }
    listSubscriptions.get(listId).add(userId);
    console.log(`User ${userId} subscribed to list ${listId}`);
  } else if (message.type === 'unsubscribe') {
    // Unsubscribe from list updates
    const listId = message.listId;
    if (listSubscriptions.has(listId)) {
      listSubscriptions.get(listId).delete(userId);
      if (listSubscriptions.get(listId).size === 0) {
        listSubscriptions.delete(listId);
      }
    }
    console.log(`User ${userId} unsubscribed from list ${listId}`);
  }
}

// Broadcast function - called from Next.js API routes via HTTP
function broadcastToListSubscribers(listId, message) {
  const subscribers = listSubscriptions.get(listId);
  if (!subscribers) return;

  const messageStr = JSON.stringify(message);
  for (const userId of subscribers) {
    const connections = userConnections.get(userId);
    if (connections) {
      for (const ws of connections) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      }
    }
  }
}

// HTTP endpoint for Next.js to broadcast messages
server.on('request', (req, res) => {
  if (req.method === 'POST' && req.url === '/broadcast') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { listId, message } = JSON.parse(body);
        broadcastToListSubscribers(listId, message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(400);
        res.end('Bad request');
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
