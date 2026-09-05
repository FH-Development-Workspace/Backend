require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

async function runMigrations() {
  const isReset = process.argv.includes('--reset');

  if (isReset) {
    if (process.env.NODE_ENV === 'production') {
      console.error('CRITICAL: Database reset is NOT permitted in production!');
      process.exit(1);
    }
    console.log('Resetting database schema...');
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  }

  console.log('Running database migrations...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const existing = await pool.query('SELECT filename FROM schema_migrations WHERE filename = $1', [file]);

    if (existing.rows.length === 0) {
      console.log(`Executing migration: ${file}`);
      let sql = fs.readFileSync(filePath, 'utf8');
      if (sql.charCodeAt(0) === 0xFEFF) {
        sql = sql.slice(1);
      }
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`Successfully applied ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error in migration ${file}:`, err);
        client.release();
        process.exit(1);
      } finally {
        client.release();
      }
    } else {
      console.log(`Migration ${file} already applied.`);
    }
  }

  console.log('All migrations completed successfully.');
  await pool.end();
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
