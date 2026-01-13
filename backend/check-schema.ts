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

const checkSchema = async () => {
  try {
    const result = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'shopping_list_items' ORDER BY ordinal_position`
    );
    
    console.log('Spalten in shopping_list_items:');
    result.rows.forEach(row => console.log('  -', row.column_name));
    
    process.exit(0);
  } catch (error) {
    console.error('Fehler:', error);
    process.exit(1);
  }
};

checkSchema();
