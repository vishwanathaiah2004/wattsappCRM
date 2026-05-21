const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => logger.error('PG pool error', { error: err.message }));

async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    logger.debug('Query', { ms: Date.now() - start, rows: result.rowCount });
    return result;
  } catch (err) {
    logger.error('Query error', { text: text.slice(0, 80), error: err.message });
    throw err;
  }
}

module.exports = { query, pool };
