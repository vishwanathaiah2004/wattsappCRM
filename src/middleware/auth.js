const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../utils/logger');

const SECRET = () => process.env.JWT_SECRET || 'changeme';

// ── Token helpers ─────────────────────────────────────────────────────────

function signToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, SECRET(), { expiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET());
}

// ── Middleware: require tenant login ──────────────────────────────────────

async function requireTenant(req, res, next) {
  try {
    const token = extractToken(req);
    const decoded = verifyToken(token);
    if (decoded.role !== 'tenant') return res.status(403).json({ error: 'Access denied' });

    const result = await query(
      'SELECT id, business_name, email, plan, is_active, business_type, gemini_prompt, whatsapp_number, ai_reply_count, monthly_limit FROM tenants WHERE id = $1',
      [decoded.id]
    );
    if (!result.rows[0] || !result.rows[0].is_active) {
      return res.status(403).json({ error: 'Account inactive or not found' });
    }
    req.tenant = result.rows[0];
    next();
  } catch (err) {
    logger.warn('Auth failed', { error: err.message });
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// ── Middleware: require super admin login ─────────────────────────────────

async function requireSuperAdmin(req, res, next) {
  try {
    const token = extractToken(req);
    const decoded = verifyToken(token);
    if (decoded.role !== 'super_admin') return res.status(403).json({ error: 'Super admin only' });

    const result = await query('SELECT id, email FROM super_admins WHERE id = $1', [decoded.id]);
    if (!result.rows[0]) return res.status(403).json({ error: 'Admin not found' });
    req.admin = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  throw new Error('No token');
}

module.exports = { requireTenant, requireSuperAdmin, signToken, verifyToken };
