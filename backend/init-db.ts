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

    console.log(' Datenbank erfolgreich initialisiert!');
    process.exit(0);
  } catch (error) {
    console.error('Fehler beim Initialisieren der Datenbank:', error);
    process.exit(1);
  }
};

initDb();
