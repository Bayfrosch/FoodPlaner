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

const resetDatabase = async () => {
  try {
    console.log('🔄 Lösche alte Tabellen...');

    // Lösche alte Tabellen
    await pool.query('DROP TABLE IF EXISTS list_collaborators CASCADE');
    await pool.query('DROP TABLE IF EXISTS shopping_list_items CASCADE');
    await pool.query('DROP TABLE IF EXISTS shopping_lists CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');

    console.log('✓ Alte Tabellen gelöscht');
    console.log('📝 Erstelle neue Tabellen...');

    // Erstelle users Tabelle
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ users Tabelle erstellt');

    // Erstelle shopping_lists Tabelle
    await pool.query(`
      CREATE TABLE shopping_lists (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ shopping_lists Tabelle erstellt');

    // Erstelle shopping_list_items Tabelle
    await pool.query(`
      CREATE TABLE shopping_list_items (
        id SERIAL PRIMARY KEY,
        list_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ shopping_list_items Tabelle erstellt');

    // Erstelle list_collaborators Tabelle
    await pool.query(`
      CREATE TABLE list_collaborators (
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
    console.log('✓ list_collaborators Tabelle erstellt');

    console.log('\n✅ Datenbank erfolgreich zurückgesetzt!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fehler beim Zurücksetzen der Datenbank:', error);
    process.exit(1);
  }
};

resetDatabase();
