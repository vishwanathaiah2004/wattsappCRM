require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, '../../schema.sql'), 'utf8');
  console.log('Running migration...');
  try {
    await pool.query(sql);
    console.log('✅ Schema applied.');

    // Seed super admin
    const email = process.env.SUPER_ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'admin123';
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO super_admins (email, password_hash) VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING`,
      [email, hash]
    );
    console.log(`✅ Super admin created: ${email}`);
    console.log('✅ Migration complete. Run: npm run dev');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
