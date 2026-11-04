require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');
const logger = require('../src/utils/logger');

async function runMigrations() {
  const isReset = process.argv.includes('--reset');

  if (isReset) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('CRITICAL: Database reset is NOT permitted in production!');
      process.exit(1);
    }
    logger.info('Resetting database schema...');
    const tables = await pool.query("SHOW TABLES");
    for (const table of tables.rows) {
      const tableName = Object.values(table)[0];
      await pool.query(`DROP TABLE IF EXISTS ${tableName}`);
    }
  }

  logger.info('Running database migrations...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const existing = await pool.query('SELECT filename FROM schema_migrations WHERE filename = ?', [file]);

    if (existing.rows.length === 0) {
      logger.info(`Executing migration: ${file}`);
      let sql = fs.readFileSync(filePath, 'utf8');
      if (sql.charCodeAt(0) === 0xFEFF) {
        sql = sql.slice(1);
      }

      // Convert PostgreSQL syntax to MySQL
      sql = sql
        .replace(/SERIAL PRIMARY KEY/g, 'INT AUTO_INCREMENT PRIMARY KEY')
        .replace(/TIMESTAMPTZ/g, 'TIMESTAMP')
        .replace(/NOW\(\)/g, 'CURRENT_TIMESTAMP')
        .replace(/\$1/g, '?')
        .replace(/\$2/g, '?')
        .replace(/\$3/g, '?')
        .replace(/\$4/g, '?')
        .replace(/\$5/g, '?')
        .replace(/\$6/g, '?')
        .replace(/\$7/g, '?')
        .replace(/\$8/g, '?')
        .replace(/\$9/g, '?')
        .replace(/TRUE/g, '1')
        .replace(/FALSE/g, '0')
        .replace(/::text/g, '')
        .replace(/::jsonb/g, '')
        .replace(/::json/g, '')
        .replace(/::uuid/g, '')
        .replace(/gen_random_uuid\(\)/g, 'UUID()')
        .replace(/RETURNING \*/g, '')
        .replace(/ON CONFLICT.*DO NOTHING/g, 'ON DUPLICATE KEY UPDATE id=id')
        .replace(/ON CONFLICT.*DO UPDATE/g, (match) => {
          // Simple ON DUPLICATE KEY UPDATE conversion
          return 'ON DUPLICATE KEY UPDATE id=id';
        });

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.query(sql);
        await connection.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
        await connection.commit();
        logger.info(`Successfully applied ${file}`);
      } catch (err) {
        await connection.rollback();
        logger.error(`Error in migration ${file}:`, err);
        connection.release();
        process.exit(1);
      } finally {
        connection.release();
      }
    } else {
      logger.info(`Migration ${file} already applied.`);
    }
  }

  logger.info('All migrations completed successfully.');
  await pool.end();
}

runMigrations().catch(err => {
  logger.error('Migration failed:', err);
  process.exit(1);
});
