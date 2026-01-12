import express from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3001;

// Middleware - JSON Body parsen
app.use(express.json());

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME
});

// Health-Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server läuft!' });
});

// Mock-Endpoint:  ALLE Items abrufen (GET)
app.get('/api/items', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM shopping_items ORDER BY completed ASC, id'
    );
    res.json(result.rows);
    } catch (error) {
        console.error('Fehler beim Abrufen der Items:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// Einzelnes Item abrufen (GET mit ID)
app.get('/api/items/:id', (req, res) => {
  const itemId = req.params.id;
  
  const item = {
    id: itemId,
    name: 'Beispiel Item',
    completed: false
  };
  
  res.json(item);
});

// Neues Item erstellen (POST)
app.post('/api/items', async (req, res) => {
  try {
    const { name } = req.body;

    if(!name || name.trim() === '') {
        return res.status(400).json({ error: 'Name des Items ist erforderlich' });
  }

  const result = await pool.query(
    'INSERT INTO shopping_items (name, completed) VALUES ($1, $2) RETURNING *',
    [name, false]
  );
  res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Fehler beim Erstellen des Items:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Löschen eines Items (DELETE)
app.delete('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM shopping_items WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res. status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted', item: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Aktualisieren eines Items (PUT)
app.put('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;

    const result = await pool.query(
      'UPDATE shopping_items SET completed = $1 WHERE id = $2 RETURNING *',
      [completed, id]
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

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});