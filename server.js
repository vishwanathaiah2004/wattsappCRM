require('dotenv').config();
const fs = require('fs');
const app = require('./src/app');
const logger = require('./src/utils/logger');
const { pool } = require('./src/config/database');
const { startFollowUpScheduler } = require('./src/services/followup.service');

if (!fs.existsSync('logs')) fs.mkdirSync('logs');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await pool.query('SELECT 1');
    logger.info('Database connected ✓');

    app.listen(PORT, () => {
      logger.info(`🚀 WhatsApp CRM SaaS running → http://localhost:${PORT}`);
      logger.info(`📊 Dashboard  → http://localhost:${PORT}`);
      logger.info(`🔗 Webhook    → http://localhost:${PORT}/api/webhook`);
      logger.info(`🔑 Admin login → POST /api/auth/admin/login`);
    });

    startFollowUpScheduler();
  } catch (err) {
    logger.error('Startup failed', { error: err.message });
    process.exit(1);
  }
}

start();
