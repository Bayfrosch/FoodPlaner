import express from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173'
}));
app.use(express.json());

// Datenbank Connection
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME
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

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
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

    const result = await pool.query(
      'INSERT INTO shopping_list_items (list_id, name, completed) VALUES ($1, $2, $3) RETURNING *',
      [listId, name, false]
    );

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

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
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

// Server starten
const startServer = async () => {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
  });
};

startServer();