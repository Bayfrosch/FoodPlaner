import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME
});

const initDb = async () => {
  try {
    console.log('Initialisiere Datenbank...');

    // Lösche alte Tabellen und erstelle neu (für Schema-Änderungen)
    await pool.query('DROP TABLE IF EXISTS recipe_items CASCADE');
    await pool.query('DROP TABLE IF EXISTS recipes CASCADE');
    await pool.query('DROP TABLE IF EXISTS list_collaborators CASCADE');
    await pool.query('DROP TABLE IF EXISTS shopping_list_items CASCADE');
    await pool.query('DROP TABLE IF EXISTS shopping_lists CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');

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
    console.log('users Tabelle erstellt');

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
    console.log('shopping_lists Tabelle erstellt');

    // Erstelle shopping_list_items Tabelle
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shopping_list_items (
        id SERIAL PRIMARY KEY,
        list_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE
      )
    `);
    console.log('shopping_list_items Tabelle erstellt');

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
    console.log('list_collaborators Tabelle erstellt');

    // Erstelle recipes Tabelle
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('recipes Tabelle erstellt');

    // Erstelle recipe_items Tabelle
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recipe_items (
        id SERIAL PRIMARY KEY,
        recipe_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
      )
    `);
    console.log('recipe_items Tabelle erstellt');

    // Erstelle item_categories Tabelle (speichert Standard-Kategorien für Item-Namen pro Liste)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS item_categories (
        id SERIAL PRIMARY KEY,
        list_id INTEGER NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE,
        UNIQUE(list_id, item_name)
      )
    `);
    console.log('item_categories Tabelle erstellt');
    // Erstelle Test-Account für Entwicklung
    const bcrypt = require('bcrypt');
    const testPassword = 'test123';
    const testPasswordHash = await bcrypt.hash(testPassword, 10);
    
    try {
      await pool.query(
        'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3)',
        ['test@example.com', 'Test User', testPasswordHash]
      );
      console.log('✓ Test-Account erstellt (test@example.com / test123)');
    } catch (err) {
      // Account existiert bereits, ignorieren
    }
    console.log(' Datenbank erfolgreich initialisiert!');
    process.exit(0);
  } catch (error) {
    console.error('Fehler beim Initialisieren der Datenbank:', error);
    process.exit(1);
  }
};

initDb();
