import express from 'express';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { authMiddleware, AuthRequest } from './middleware/auth';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3001;

// Prisma Client
const prisma = new PrismaClient();

// Map für WebSocket-Verbindungen pro User
const userConnections = new Map<number, Set<any>>();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173'
}));
app.use(express.json());

// ============================================
// WebSocket Broadcast-Funktionen
// ============================================
const broadcastToUser = (userId: number, message: any) => {
  const connections = userConnections.get(userId);
  if (connections) {
    const messageStr = JSON.stringify(message);
    connections.forEach(ws => {
      if (ws.readyState === 1) { // 1 = OPEN
        ws.send(messageStr);
      }
    });
  }
};

const broadcastToListCollaborators = async (listId: number, message: any) => {
  try {
    // Finde Owner und alle Collaborators dieser Liste
    const list = await prisma.shoppingList.findUnique({
      where: { id: listId },
      include: {
        collaborators: {
          select: { userId: true }
        }
      }
    });

    if (!list) return;

    const userIds = new Set<number>();
    userIds.add(list.ownerId);
    list.collaborators.forEach(c => userIds.add(c.userId));

    const messageStr = JSON.stringify(message);
    userIds.forEach(userId => {
      const connections = userConnections.get(userId);
      if (connections) {
        connections.forEach(ws => {
          if (ws.readyState === 1) {
            ws.send(messageStr);
          }
        });
      }
    });
  } catch (error) {
    console.error('Fehler beim Broadcast:', error);
  }
};

// ============================================
// WebSocket Handler
// ============================================
wss.on('connection', (ws: WebSocket, req: any) => {
  try {
    // Token aus URL auslesen
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Token erforderlich');
      return;
    }

    // Token verifizieren
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: number };
    const userId = decoded.userId;

    // Verbindung zur User-Liste hinzufügen
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId)!.add(ws);

    console.log(`User ${userId} verbunden (WebSocket)`);

    ws.on('close', () => {
      const connections = userConnections.get(userId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          userConnections.delete(userId);
        }
      }
      console.log(`User ${userId} getrennt`);
    });

    ws.on('error', (error: any) => {
      console.error('WebSocket Fehler:', error);
    });
  } catch (error) {
    console.error('WebSocket Authentifizierung fehlgeschlagen:', error);
    ws.close(4002, 'Authentifizierung fehlgeschlagen');
  }
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server läuft!' });
});

// ============ AUTH ENDPOINTS ============

// REGISTER
app.post('/api/auth/register', async (req: AuthRequest, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, und password erforderlich' });
    }

    // Prüfe ob Email schon existiert
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email existiert bereits' });
    }

    // Passwort hashen
    const hashedPassword = await bcrypt.hash(password, 10);

    // User erstellen
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash: hashedPassword
      },
      select: {
        id: true,
        email: true,
        username: true
      }
    });

    // Token erstellen
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || '',
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, userId: user.id, ...user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// LOGIN
app.post('/api/auth/login', async (req: AuthRequest, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email und password erforderlich' });
    }

    // User finden
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        passwordHash: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Passwort prüfen
    const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordCorrect) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Token erstellen
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || '',
      { expiresIn: '7d' }
    );

    res.json({ token, userId: user.id });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET aktueller User
app.get('/api/auth/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        username: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT Profil aktualisieren
app.put('/api/auth/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword) {
      return res.status(400).json({ error: 'Email und aktuelles Passwort erforderlich' });
    }

    // User abrufen
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        passwordHash: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Aktuelles Passwort überprüfen
    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isPasswordCorrect) {
      return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
    }

    // Email-Duplikat prüfen (wenn Email geändert wird)
    if (email !== req.body.currentEmail) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser && existingUser.id !== req.userId) {
        return res.status(400).json({ error: 'Email existiert bereits' });
      }
    }

    // Prepare update data
    const updateData: any = { email };

    if (newPassword) {
      if (newPassword.length < 3) {
        return res.status(400).json({ error: 'Neues Passwort muss mindestens 3 Zeichen lang sein' });
      }
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true
      }
    });

    res.json({ message: 'Profil erfolgreich aktualisiert', user: updatedUser });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ============ LIST ENDPOINTS ============

// GET alle Listen des aktuellen Users
app.get('/api/lists', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const lists = await prisma.shoppingList.findMany({
      where: {
        OR: [
          { ownerId: req.userId },
          { collaborators: { some: { userId: req.userId } } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(lists);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET einzelne Liste
app.get('/api/lists/:listId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { listId } = req.params;

    const list = await prisma.shoppingList.findFirst({
      where: {
        id: parseInt(listId),
        OR: [
          { ownerId: req.userId },
          { collaborators: { some: { userId: req.userId } } }
        ]
      }
    });

    if (!list) {
      return res.status(404).json({ error: 'Liste nicht gefunden' });
    }

    res.json(list);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST neue Liste
app.post('/api/lists', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title erforderlich' });
    }

    const list = await prisma.shoppingList.create({
      data: {
        ownerId: req.userId!,
        title,
        description: description || null
      }
    });

    // Broadcast an User dass neue Liste erstellt wurde
    broadcastToUser(req.userId!, {
      type: 'list_updated',
      data: list
    });

    res.status(201).json(list);
  } catch (error) {
    console.error('Error:', error);
    const errorMsg = (error as Error).message;
    
    if (errorMsg.includes('users') || errorMsg.includes('Foreign key')) {
      return res.status(401).json({ error: 'User-Sitzung ungültig. Bitte melden Sie sich neu an.' });
    }
    
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT Liste aktualisieren
app.put('/api/lists/:listId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { listId } = req.params;
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title erforderlich' });
    }

    // Prüfe ob User Owner ist
    const list = await prisma.shoppingList.findUnique({
      where: { id: parseInt(listId) }
    });

    if (!list || list.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    const updatedList = await prisma.shoppingList.update({
      where: { id: parseInt(listId) },
      data: {
        title,
        description: description || null
      }
    });

    res.json(updatedList);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE Liste löschen
app.delete('/api/lists/:listId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { listId } = req.params;

    // Prüfe ob User Owner ist
    const list = await prisma.shoppingList.findUnique({
      where: { id: parseInt(listId) }
    });

    if (!list || list.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    // Cascading delete wird durch Prisma schema gehandhabt
    await prisma.shoppingList.delete({
      where: { id: parseInt(listId) }
    });

    res.json({ message: 'Liste gelöscht' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET alle Kategorien einer Liste
app.get('/api/lists/:listId/categories', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { listId } = req.params;
    const listIdNum = parseInt(listId);

    // Prüfe ob User Zugriff hat
    const list = await prisma.shoppingList.findFirst({
      where: {
        id: listIdNum,
        OR: [
          { ownerId: req.userId },
          { collaborators: { some: { userId: req.userId } } }
        ]
      }
    });

    if (!list) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Hole alle eindeutigen Kategorien
    const categories = await prisma.itemCategory.findMany({
      where: { 
        listId: listIdNum,
        category: { not: null }
      },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });

    res.json(categories.map(c => c.category));
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE eine Kategorie
app.delete('/api/lists/:listId/categories/:category', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const listId = parseInt(req.params.listId);
    const category = decodeURIComponent(req.params.category);

    // Prüfe ob User Zugriff hat
    const list = await prisma.shoppingList.findFirst({
      where: {
        id: listId,
        OR: [
          { ownerId: req.userId },
          { collaborators: { some: { userId: req.userId } } }
        ]
      }
    });

    if (!list) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update items mit dieser Kategorie
    await prisma.shoppingListItem.updateMany({
      where: { listId, category },
      data: { category: null }
    });

    // Lösche Kategorien
    await prisma.itemCategory.deleteMany({
      where: { listId, category }
    });

    res.json({ message: 'Kategorie gelöscht' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ============ ITEM ENDPOINTS ============

// GET Items einer Liste
app.get('/api/lists/:listId/items', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { listId } = req.params;
    const listIdNum = parseInt(listId);

    // Prüfe ob User Zugriff hat
    const list = await prisma.shoppingList.findFirst({
      where: {
        id: listIdNum,
        OR: [
          { ownerId: req.userId },
          { collaborators: { some: { userId: req.userId } } }
        ]
      }
    });

    if (!list) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const items = await prisma.shoppingListItem.findMany({
      where: { listId: listIdNum },
      orderBy: [{ completed: 'asc' }, { id: 'asc' }]
    });

    res.json(items);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST neues Item in Liste
app.post('/api/lists/:listId/items', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { listId } = req.params;
    const { name } = req.body;
    const listIdNum = parseInt(listId);

    if (!name) {
      return res.status(400).json({ error: 'Name erforderlich' });
    }

    // Prüfe ob User Editor ist
    const hasAccess = await prisma.shoppingList.count({
      where: {
        id: listIdNum,
        OR: [
          { ownerId: req.userId },
          { collaborators: { some: { userId: req.userId } } }
        ]
      }
    });

    if (hasAccess === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Finde Kategorie von existierendem Item oder item_categories
    let category = null;
    
    const existingItem = await prisma.shoppingListItem.findFirst({
      where: { listId: listIdNum, name },
      select: { category: true }
    });

    if (existingItem?.category) {
      category = existingItem.category;
    } else {
      const savedCategory = await prisma.itemCategory.findFirst({
        where: { listId: listIdNum, itemName: name },
        select: { category: true }
      });
      category = savedCategory?.category || null;
    }

    console.log(`Adding item "${name}" to list ${listId}. Found category:`, category);

    const item = await prisma.shoppingListItem.create({
      data: {
        listId: listIdNum,
        name,
        category,
        completed: false
      }
    });

    // Speichere in item_categories falls Kategorie existiert
    if (category) {
      await prisma.itemCategory.upsert({
        where: { listId_itemName: { listId: listIdNum, itemName: name } },
        create: { listId: listIdNum, itemName: name, category },
        update: { category, updatedAt: new Date() }
      });
    }

    // Broadcast
    broadcastToListCollaborators(listIdNum, {
      type: `list_${listIdNum}_updated`,
      data: { action: 'item_added', item }
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE Item
app.delete('/api/lists/:listId/items/:itemId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { listId, itemId } = req.params;
    const listIdNum = parseInt(listId);
    const itemIdNum = parseInt(itemId);

    // Prüfe Zugriff
    const hasAccess = await prisma.shoppingList.count({
      where: {
        id: listIdNum,
        OR: [
          { ownerId: req.userId },
          { collaborators: { some: { userId: req.userId } } }
        ]
      }
    });

    if (hasAccess === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const item = await prisma.shoppingListItem.delete({
      where: {
        id: itemIdNum
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Broadcast
    broadcastToListCollaborators(listIdNum, {
      type: `list_${listIdNum}_updated`,
      data: { action: 'item_deleted', itemId: itemIdNum }
    });

    res.json({ message: 'Item deleted', item });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT Item (toggle completed)
app.put('/api/lists/:listId/items/:itemId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { listId, itemId } = req.params;
    const { completed } = req.body;
    const listIdNum = parseInt(listId);
    const itemIdNum = parseInt(itemId);

    // Prüfe Zugriff
    const hasAccess = await prisma.shoppingList.count({
      where: {
        id: listIdNum,
        OR: [
          { ownerId: req.userId },
          { collaborators: { some: { userId: req.userId } } }
        ]
      }
    });

    if (hasAccess === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const item = await prisma.shoppingListItem.update({
      where: { id: itemIdNum },
      data: { completed }
    });

    // Broadcast
    broadcastToListCollaborators(listIdNum, {
      type: `list_${listIdNum}_updated`,
      data: { action: 'item_updated', item }
    });

    res.json(item);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update item category
app.put('/api/lists/:listId/items/:itemId/category', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const listId = parseInt(req.params.listId);
    const itemId = parseInt(req.params.itemId);
    const { category } = req.body;

    console.log('Update category - listId:', listId, 'itemId:', itemId, 'category:', category);

    // Prüfe Access
    const hasAccess = await prisma.shoppingList.count({
      where: {
        id: listId,
        OR: [
          { ownerId: req.userId },
          { collaborators: { some: { userId: req.userId } } }
        ]
      }
    });

    if (hasAccess === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Hole Item-Namen
    const item = await prisma.shoppingListItem.findUnique({
      where: { id: itemId },
      select: { name: true }
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Update alle Items mit gleichem Namen
    const items = await prisma.shoppingListItem.updateMany({
      where: { listId, name: item.name },
      data: { category: category || null }
    });

    // Speichere in item_categories
    if (category) {
      await prisma.itemCategory.upsert({
        where: { listId_itemName: { listId, itemName: item.name } },
        create: { listId, itemName: item.name, category },
        update: { category, updatedAt: new Date() }
      });
    } else {
      await prisma.itemCategory.deleteMany({
        where: { listId, itemName: item.name }
      });
    }

    // Broadcast
    broadcastToListCollaborators(listId, {
      type: `list_${listId}_updated`,
      data: { action: 'items_updated', items }
    });

    const updatedItem = await prisma.shoppingListItem.findUnique({
      where: { id: itemId }
    });

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Internal Server Error', details: (error as Error).message });
  }
});

// ============ COLLABORATOR ENDPOINTS ============

// POST Collaborator hinzufügen
app.post('/api/lists/:listId/collaborators', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { listId } = req.params;
    const { email, role } = req.body;
    const listIdNum = parseInt(listId);

    // Prüfe ob User Owner ist
    const list = await prisma.shoppingList.findUnique({
      where: { id: listIdNum }
    });

    if (!list || list.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Only owner can add collaborators' });
    }

    // Finde User
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Füge Collaborator hinzu
    const collaborator = await prisma.listCollaborator.upsert({
      where: { listId_userId: { listId: listIdNum, userId: user.id } },
      create: { listId: listIdNum, userId: user.id, role: role || 'editor' },
      update: { role: role || 'editor' }
    });

    res.status(201).json(collaborator);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET Collaborators einer Liste
app.get('/api/lists/:listId/collaborators', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { listId } = req.params;
    const listIdNum = parseInt(listId);

    // Prüfe ob User Zugriff hat
    const hasAccess = await prisma.shoppingList.count({
      where: {
        id: listIdNum,
        OR: [
          { ownerId: req.userId },
          { collaborators: { some: { userId: req.userId } } }
        ]
      }
    });

    if (hasAccess === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const collaborators = await prisma.listCollaborator.findMany({
      where: { listId: listIdNum },
      select: {
        id: true,
        role: true,
        user: {
          select: { id: true, email: true, username: true }
        }
      }
    });

    const formattedCollaborators = collaborators.map(c => ({
      id: c.id,
      role: c.role,
      user_id: c.user.id,
      email: c.user.email,
      username: c.user.username
    }));

    res.json(formattedCollaborators);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE Collaborator
app.delete('/api/lists/:listId/collaborators/:collaboratorId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { listId, collaboratorId } = req.params;
    const listIdNum = parseInt(listId);
    const collaboratorIdNum = parseInt(collaboratorId);

    // Prüfe ob User Owner ist
    const list = await prisma.shoppingList.findUnique({
      where: { id: listIdNum }
    });

    if (!list || list.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Only owner can remove collaborators' });
    }

    const collaborator = await prisma.listCollaborator.delete({
      where: { id: collaboratorIdNum }
    });

    if (!collaborator) {
      return res.status(404).json({ error: 'Collaborator not found' });
    }

    res.json({ message: 'Collaborator removed' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ============================================
// RECIPES API
// ============================================

// Get all recipes
app.get('/api/recipes', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const recipes = await prisma.recipe.findMany({
      where: { ownerId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    res.json(recipes);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get single recipe
app.get('/api/recipes/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const recipeId = parseInt(req.params.id);

    const recipe = await prisma.recipe.findFirst({
      where: {
        id: recipeId,
        ownerId: req.userId
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.json(recipe);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create recipe
app.post('/api/recipes', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title, description, items } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const recipe = await prisma.recipe.create({
      data: {
        ownerId: req.userId!,
        title,
        description: description || null,
        items: {
          create: items && Array.isArray(items) 
            ? items.map((item: any) => ({
                name: item.name,
                category: item.category || null
              }))
            : []
        }
      },
      include: {
        items: true
      }
    });

    res.status(201).json(recipe);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update recipe
app.put('/api/recipes/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    const { title, description } = req.body;

    // Check ownership
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, ownerId: req.userId }
    });

    if (!recipe) {
      return res.status(403).json({ error: 'Only owner can update recipe' });
    }

    const updatedRecipe = await prisma.recipe.update({
      where: { id: recipeId },
      data: {
        title,
        description: description || null
      },
      include: {
        items: true
      }
    });

    res.json(updatedRecipe);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete recipe
app.delete('/api/recipes/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const recipeId = parseInt(req.params.id);

    // Check ownership
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, ownerId: req.userId }
    });

    if (!recipe) {
      return res.status(403).json({ error: 'Only owner can delete recipe' });
    }

    await prisma.recipe.delete({
      where: { id: recipeId }
    });

    res.json({ message: 'Recipe deleted' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add item to recipe
app.post('/api/recipes/:id/items', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    const { name, category } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check ownership
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, ownerId: req.userId }
    });

    if (!recipe) {
      return res.status(403).json({ error: 'Only owner can add items' });
    }

    const item = await prisma.recipeItem.create({
      data: {
        recipeId,
        name,
        category: category || null
      }
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete item from recipe
app.delete('/api/recipes/:id/items/:itemId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);

    // Check ownership
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, ownerId: req.userId }
    });

    if (!recipe) {
      return res.status(403).json({ error: 'Only owner can delete items' });
    }

    await prisma.recipeItem.delete({
      where: { id: itemId }
    });

    res.json({ message: 'Item deleted' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add recipe items to shopping list
app.post('/api/recipes/:id/add-to-list', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    const { listId } = req.body;

    if (!listId) {
      return res.status(400).json({ error: 'listId is required' });
    }

    // Check recipe ownership
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, ownerId: req.userId },
      include: { items: true }
    });

    if (!recipe) {
      return res.status(403).json({ error: 'Recipe not found' });
    }

    // Check list access
    const hasListAccess = await prisma.shoppingList.count({
      where: {
        id: listId,
        OR: [
          { ownerId: req.userId },
          { collaborators: { some: { userId: req.userId } } }
        ]
      }
    });

    if (hasListAccess === 0) {
      return res.status(403).json({ error: 'No access to list' });
    }

    // Add items to shopping list
    const itemsToAdd = recipe.items.map(item => ({
      listId,
      name: `${item.name} (${recipe.title})`,
      category: item.category || null,
      completed: false
    }));

    for (const itemData of itemsToAdd) {
      await prisma.shoppingListItem.create({
        data: itemData
      });

      // Save category
      if (itemData.category) {
        await prisma.itemCategory.upsert({
          where: { listId_itemName: { listId, itemName: itemData.name } },
          create: { listId, itemName: itemData.name, category: itemData.category },
          update: { category: itemData.category, updatedAt: new Date() }
        });
      }
    }

    // Broadcast
    await broadcastToListCollaborators(listId, {
      type: 'LIST_UPDATED',
      listId
    });

    res.json({ message: 'Items added to list', count: itemsToAdd.length });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Server starten
const startServer = async () => {
  server.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
    console.log(`WebSocket läuft auf ws://localhost:${PORT}`);
  });
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Fahre Server herunter...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
