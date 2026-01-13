import express from 'express';
import { Pool } from 'pg';
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
    const result = await pool.query(
      `SELECT DISTINCT user_id FROM (
        SELECT owner_id as user_id FROM shopping_lists WHERE id = $1
        UNION
        SELECT user_id FROM list_collaborators WHERE list_id = $1
      ) users`,
      [listId]
    );

    const messageStr = JSON.stringify(message);
    result.rows.forEach(row => {
      const connections = userConnections.get(row.user_id);
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

// Datenbank Connection
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME
});

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

// Initialisiere Datenbank beim Start
const initializeDatabase = async () => {
  try {
    // Erstelle users Tabelle
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Erstelle shopping_lists Tabelle
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shopping_lists (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Erstelle shopping_list_items Tabelle
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shopping_list_items (
        id SERIAL PRIMARY KEY,
        list_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE
      )
    `);

    // Erstelle list_collaborators Tabelle
    await pool.query(`
      CREATE TABLE IF NOT EXISTS list_collaborators (
        id SERIAL PRIMARY KEY,
        list_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role VARCHAR(50) DEFAULT 'viewer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(list_id, user_id)
      )
    `);

    console.log('✓ Datenbank-Tabellen sind ready');
  } catch (error) {
    console.error('Fehler beim Initialisieren der Datenbank:', error);
  }
};

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
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email existiert bereits' });
    }

    // Passwort hashen
    const hashedPassword = await bcrypt.hash(password, 10);

    // User erstellen
    const result = await pool.query(
      'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username',
      [email, username, hashedPassword]
    );

    const user = result.rows[0];

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
    const result = await pool.query(
      'SELECT id, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Passwort prüfen
    const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);

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
    const result = await pool.query(
      'SELECT id, email, username FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
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
    const userResult = await pool.query(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [req.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Aktuelles Passwort überprüfen
    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isPasswordCorrect) {
      return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
    }

    // Email-Duplikat prüfen (wenn Email geändert wird)
    if (email !== req.body.currentEmail) {
      const emailExists = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, req.userId]
      );

      if (emailExists.rows.length > 0) {
        return res.status(400).json({ error: 'Email existiert bereits' });
      }
    }

    // Passwort aktualisieren (falls vorhanden)
    let updateQuery = 'UPDATE users SET email = $1';
    let params: any[] = [email, req.userId];

    if (newPassword) {
      if (newPassword.length < 3) {
        return res.status(400).json({ error: 'Neues Passwort muss mindestens 3 Zeichen lang sein' });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateQuery += ', password_hash = $2';
      params = [email, hashedPassword, req.userId];
    }

    updateQuery += ' WHERE id = $' + (params.length) + ' RETURNING id, email, username';

    const result = await pool.query(updateQuery, params);

    res.json({ message: 'Profil erfolgreich aktualisiert', user: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ============ LIST ENDPOINTS ============

// GET alle Listen des aktuellen Users
app.get('/api/lists', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT l.* FROM shopping_lists l
       WHERE l.owner_id = $1 
       OR l.id IN (
         SELECT list_id FROM list_collaborators WHERE user_id = $1
       )
       ORDER BY l.created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET einzelne Liste
app.get('/api/lists/:listId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { listId } = req.params;

    const result = await pool.query(
      `SELECT l.* FROM shopping_lists l
       WHERE l.id = $1 
       AND (l.owner_id = $2 
       OR l.id IN (
         SELECT list_id FROM list_collaborators WHERE user_id = $2
       ))`,
      [listId, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Liste nicht gefunden' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST neue Liste
app.post('/api/lists', authMiddleware, async (req:  AuthRequest, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title erforderlich' });
    }

    const result = await pool.query(
      'INSERT INTO shopping_lists (owner_id, title, description) VALUES ($1, $2, $3) RETURNING *',
      [req.userId, title, description || null]
    );

    // Broadcast an User dass neue Liste erstellt wurde
    broadcastToUser(req.userId!, {
      type: 'list_updated',
      data: result.rows[0]
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    const errorMsg = (error as Error).message;
    
    // Wenn Foreign Key Fehler (User nicht vorhanden), dann 401 Unauthorized
    if (errorMsg.includes('shopping_lists_owner_id_fkey') || errorMsg.includes('users')) {
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
    const ownerCheck = await pool.query(
      'SELECT owner_id FROM shopping_lists WHERE id = $1',
      [listId]
    );

    if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    const result = await pool.query(
      'UPDATE shopping_lists SET title = $1, description = $2 WHERE id = $3 RETURNING *',
      [title, description || null, listId]
    );

    res.json(result.rows[0]);
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
    const ownerCheck = await pool.query(
      'SELECT owner_id FROM shopping_lists WHERE id = $1',
      [listId]
    );

    if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    // Lösche alle Items
    await pool.query(
      'DELETE FROM shopping_list_items WHERE list_id = $1',
      [listId]
    );

    // Lösche alle Collaborators
    await pool.query(
      'DELETE FROM list_collaborators WHERE list_id = $1',
      [listId]
    );

    // Lösche Liste
    await pool.query(
      'DELETE FROM shopping_lists WHERE id = $1',
      [listId]
    );

    res.json({ message: 'Liste gelöscht' });
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

    // Prüfe ob User Zugriff hat
    const accessCheck = await pool.query(
      `SELECT id FROM shopping_lists 
       WHERE id = $1 AND (owner_id = $2 OR id IN (
         SELECT list_id FROM list_collaborators WHERE user_id = $2
       ))`,
      [listId, req.userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'SELECT * FROM shopping_list_items WHERE list_id = $1 ORDER BY completed ASC, id',
      [listId]
    );

    res.json(result.rows);
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

    if (!name) {
      return res.status(400).json({ error: 'Name erforderlich' });
    }

    // Prüfe ob User Editor ist (Owner oder Collaborator)
    const accessCheck = await pool.query(
      `SELECT id FROM shopping_lists 
       WHERE id = $1 AND owner_id = $2
       UNION
       SELECT list_id FROM list_collaborators 
       WHERE list_id = $1 AND user_id = $2`,
      [listId, req.userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Prüfe ob ein Item mit gleichem Namen existiert und hole dessen Kategorie
    const existingItem = await pool.query(
      'SELECT category FROM shopping_list_items WHERE list_id = $1 AND name = $2 LIMIT 1',
      [listId, name]
    );

    let category = existingItem.rows.length > 0 ? existingItem.rows[0].category : null;

    // Falls kein Item mit dieser Kategorie existiert, prüfe die item_categories Tabelle
    if (!category) {
      const savedCategory = await pool.query(
        'SELECT category FROM item_categories WHERE list_id = $1 AND item_name = $2',
        [listId, name]
      );
      category = savedCategory.rows.length > 0 ? savedCategory.rows[0].category : null;
    }

    console.log(`Adding item "${name}" to list ${listId}. Found category:`, category);

    const result = await pool.query(
      'INSERT INTO shopping_list_items (list_id, name, category, completed) VALUES ($1, $2, $3, $4) RETURNING *',
      [listId, name, category, false]
    );

    // Speichere die Kategorie in item_categories falls sie existiert
    if (category) {
      await pool.query(
        'INSERT INTO item_categories (list_id, item_name, category) VALUES ($1, $2, $3) ON CONFLICT (list_id, item_name) DO UPDATE SET category = $3, updated_at = CURRENT_TIMESTAMP',
        [listId, name, category]
      );
    }

    // Broadcast an alle Collaborators dieser Liste
    broadcastToListCollaborators(Number(listId), {
      type: `list_${listId}_updated`,
      data: { action: 'item_added', item: result.rows[0] }
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE Item
app.delete('/api/lists/:listId/items/:itemId', authMiddleware, async (req:  AuthRequest, res) => {
  try {
    const { listId, itemId } = req.params;

    // Prüfe Zugriff
    const accessCheck = await pool.query(
      `SELECT id FROM shopping_lists 
       WHERE id = $1 AND owner_id = $2
       UNION
       SELECT list_id FROM list_collaborators 
       WHERE list_id = $1 AND user_id = $2`,
      [listId, req.userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'DELETE FROM shopping_list_items WHERE id = $1 AND list_id = $2 RETURNING *',
      [itemId, listId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Broadcast an alle Collaborators
    broadcastToListCollaborators(Number(listId), {
      type: `list_${listId}_updated`,
      data: { action: 'item_deleted', itemId: Number(itemId) }
    });

    res.json({ message: 'Item deleted', item: result.rows[0] });
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

    // Prüfe Zugriff
    const accessCheck = await pool.query(
      `SELECT id FROM shopping_lists 
       WHERE id = $1 AND owner_id = $2
       UNION
       SELECT list_id FROM list_collaborators 
       WHERE list_id = $1 AND user_id = $2`,
      [listId, req.userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'UPDATE shopping_list_items SET completed = $1 WHERE id = $2 AND list_id = $3 RETURNING *',
      [completed, itemId, listId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Broadcast an alle Collaborators
    broadcastToListCollaborators(Number(listId), {
      type: `list_${listId}_updated`,
      data: { action: 'item_updated', item: result.rows[0] }
    });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update item category
app.put('/api/lists/:listId/items/:itemId/category', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const listId = Number(req.params.listId);
    const itemId = Number(req.params.itemId);
    const { category } = req.body;

    console.log('Update category - listId:', listId, 'itemId:', itemId, 'category:', category);

    // Prüfe Access zur Liste
    const accessCheck = await pool.query(
      `SELECT id FROM shopping_lists 
       WHERE id = $1 AND owner_id = $2
       UNION
       SELECT list_id FROM list_collaborators 
       WHERE list_id = $1 AND user_id = $2`,
      [listId, req.userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Hole den Namen des Items
    const itemData = await pool.query(
      'SELECT name FROM shopping_list_items WHERE id = $1 AND list_id = $2',
      [itemId, listId]
    );

    if (itemData.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const itemName = itemData.rows[0].name;

    // Update ALLE Items mit gleichem Namen in dieser Liste
    const result = await pool.query(
      'UPDATE shopping_list_items SET category = $1 WHERE list_id = $2 AND name = $3 RETURNING *',
      [category || null, listId, itemName]
    );

    // Speichere auch in item_categories für zukünftige Items mit gleichem Namen
    if (category) {
      await pool.query(
        'INSERT INTO item_categories (list_id, item_name, category) VALUES ($1, $2, $3) ON CONFLICT (list_id, item_name) DO UPDATE SET category = $3, updated_at = CURRENT_TIMESTAMP',
        [listId, itemName, category]
      );
    } else {
      // Falls category null, lösche die gespeicherte Kategorie
      await pool.query(
        'DELETE FROM item_categories WHERE list_id = $1 AND item_name = $2',
        [listId, itemName]
      );
    }

    // Broadcast an alle Collaborators
    broadcastToListCollaborators(listId, {
      type: `list_${listId}_updated`,
      data: { action: 'items_updated', items: result.rows }
    });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Internal Server Error', details: (error as Error).message });
  }
});

// ============ COLLABORATOR ENDPOINTS ============

// POST Collaborator zu Liste hinzufügen
app.post('/api/lists/:listId/collaborators', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { listId } = req.params;
    const { email, role } = req.body;

    // Prüfe ob User Owner ist
    const ownerCheck = await pool.query(
      'SELECT id FROM shopping_lists WHERE id = $1 AND owner_id = $2',
      [listId, req.userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only owner can add collaborators' });
    }

    // Finde User mit Email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const collaboratorId = userResult.rows[0].id;

    // Füge Collaborator hinzu
    const result = await pool.query(
      `INSERT INTO list_collaborators (list_id, user_id, role) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (list_id, user_id) DO UPDATE SET role = $3
       RETURNING *`,
      [listId, collaboratorId, role || 'editor']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET Collaborators einer Liste
app.get('/api/lists/:listId/collaborators', authMiddleware, async (req:  AuthRequest, res) => {
  try {
    const { listId } = req.params;

    // Prüfe ob User Owner oder Collaborator ist
    const accessCheck = await pool.query(
      `SELECT id FROM shopping_lists 
       WHERE id = $1 AND (owner_id = $2 OR id IN (
         SELECT list_id FROM list_collaborators WHERE user_id = $2
       ))`,
      [listId, req.userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT lc.id, lc.role, u.id as user_id, u.email, u.username 
       FROM list_collaborators lc
       JOIN users u ON lc.user_id = u.id
       WHERE lc.list_id = $1`,
      [listId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE Collaborator
app.delete('/api/lists/:listId/collaborators/:collaboratorId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { listId, collaboratorId } = req.params;

    // Prüfe ob User Owner ist
    const ownerCheck = await pool.query(
      'SELECT id FROM shopping_lists WHERE id = $1 AND owner_id = $2',
      [listId, req.userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only owner can remove collaborators' });
    }

    const result = await pool.query(
      'DELETE FROM list_collaborators WHERE id = $1 AND list_id = $2 RETURNING *',
      [collaboratorId, listId]
    );

    if (result.rows.length === 0) {
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

// Get all recipes for the authenticated user
app.get('/api/recipes', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT id, title, description, created_at FROM recipes WHERE owner_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    // Get items for each recipe
    const recipesWithItems = await Promise.all(
      result.rows.map(async (recipe) => {
        const itemsResult = await pool.query(
          `SELECT id, name FROM recipe_items WHERE recipe_id = $1 ORDER BY created_at`,
          [recipe.id]
        );
        return {
          ...recipe,
          items: itemsResult.rows
        };
      })
    );

    res.json(recipesWithItems);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get single recipe with items
app.get('/api/recipes/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const recipeId = parseInt(req.params.id as string);

    const recipeResult = await pool.query(
      `SELECT id, title, description, created_at FROM recipes WHERE id = $1 AND owner_id = $2`,
      [recipeId, userId]
    );

    if (recipeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const itemsResult = await pool.query(
      `SELECT id, name FROM recipe_items WHERE recipe_id = $1 ORDER BY created_at`,
      [recipeId]
    );

    const recipe = {
      ...recipeResult.rows[0],
      items: itemsResult.rows
    };

    res.json(recipe);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create new recipe
app.post('/api/recipes', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { title, description, items } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const recipeResult = await pool.query(
      `INSERT INTO recipes (owner_id, title, description) VALUES ($1, $2, $3) RETURNING id, title, description, created_at`,
      [userId, title, description || null]
    );

    const recipeId = recipeResult.rows[0].id;

    // Add items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      const itemValues = items.map(item => `(${recipeId}, '${item.name.replace(/'/g, "''")}')`).join(',');
      await pool.query(
        `INSERT INTO recipe_items (recipe_id, name) VALUES ${itemValues}`
      );
    }

    const recipe = {
      ...recipeResult.rows[0],
      items: items || []
    };

    res.status(201).json(recipe);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update recipe
app.put('/api/recipes/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const recipeId = parseInt(req.params.id as string);
    const { title, description } = req.body;

    // Check ownership
    const ownerCheck = await pool.query(
      `SELECT id FROM recipes WHERE id = $1 AND owner_id = $2`,
      [recipeId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only owner can update recipe' });
    }

    const result = await pool.query(
      `UPDATE recipes SET title = $1, description = $2 WHERE id = $3 RETURNING id, title, description, created_at`,
      [title, description || null, recipeId]
    );

    // Get items
    const itemsResult = await pool.query(
      `SELECT id, name FROM recipe_items WHERE recipe_id = $1 ORDER BY created_at`,
      [recipeId]
    );

    const recipe = {
      ...result.rows[0],
      items: itemsResult.rows
    };

    res.json(recipe);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete recipe
app.delete('/api/recipes/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const recipeId = parseInt(req.params.id as string);

    // Check ownership
    const ownerCheck = await pool.query(
      `SELECT id FROM recipes WHERE id = $1 AND owner_id = $2`,
      [recipeId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only owner can delete recipe' });
    }

    await pool.query(
      `DELETE FROM recipes WHERE id = $1`,
      [recipeId]
    );

    res.json({ message: 'Recipe deleted' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add item to recipe
app.post('/api/recipes/:id/items', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const recipeId = parseInt(req.params.id as string);
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check ownership
    const ownerCheck = await pool.query(
      `SELECT id FROM recipes WHERE id = $1 AND owner_id = $2`,
      [recipeId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only owner can add items' });
    }

    const result = await pool.query(
      `INSERT INTO recipe_items (recipe_id, name) VALUES ($1, $2) RETURNING id, name`,
      [recipeId, name]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete item from recipe
app.delete('/api/recipes/:id/items/:itemId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const recipeId = parseInt(req.params.id as string);
    const itemId = parseInt(req.params.itemId as string);

    // Check ownership
    const ownerCheck = await pool.query(
      `SELECT r.id FROM recipes r WHERE r.id = $1 AND r.owner_id = $2`,
      [recipeId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only owner can delete items' });
    }

    await pool.query(
      `DELETE FROM recipe_items WHERE id = $1 AND recipe_id = $2`,
      [itemId, recipeId]
    );

    res.json({ message: 'Item deleted' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add recipe items to shopping list
app.post('/api/recipes/:id/add-to-list', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const recipeId = parseInt(req.params.id as string);
    const { listId } = req.body;

    if (!listId) {
      return res.status(400).json({ error: 'listId is required' });
    }

    // Check recipe ownership and get recipe name
    const recipeCheck = await pool.query(
      `SELECT id, title FROM recipes WHERE id = $1 AND owner_id = $2`,
      [recipeId, userId]
    );

    if (recipeCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Recipe not found' });
    }

    const recipeName = recipeCheck.rows[0].title;

    // Check list access (owner or collaborator)
    const listAccessCheck = await pool.query(
      `SELECT id FROM shopping_lists WHERE id = $1 AND owner_id = $2
       UNION
       SELECT list_id as id FROM list_collaborators WHERE list_id = $1 AND user_id = $2`,
      [listId, userId]
    );

    if (listAccessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'No access to list' });
    }

    // Get all items from recipe
    const itemsResult = await pool.query(
      `SELECT name FROM recipe_items WHERE recipe_id = $1`,
      [recipeId]
    );

    // Add items to shopping list with recipe name
    const itemsToAdd = itemsResult.rows;
    for (const item of itemsToAdd) {
      const itemNameWithRecipe = `${item.name} (${recipeName})`;
      await pool.query(
        `INSERT INTO shopping_list_items (list_id, name, completed) VALUES ($1, $2, FALSE)`,
        [listId, itemNameWithRecipe]
      );
    }

    // Broadcast to list collaborators
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
  await initializeDatabase();
  server.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
    console.log(`WebSocket läuft auf ws://localhost:${PORT}`);
  });
};

startServer();