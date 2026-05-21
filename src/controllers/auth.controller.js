const tenantModel = require('../models/tenant.model');
const { query } = require('../config/database');
const { signToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// ── Tenant Register ───────────────────────────────────────────────────────
async function register(req, res) {
  try {
    const { business_name, owner_name, email, password, business_type, plan } = req.body;
    if (!business_name || !email || !password)
      return res.status(400).json({ error: 'business_name, email, and password are required' });

    const existing = await tenantModel.findByEmail(email);
    if (existing)
      return res.status(409).json({ error: 'Email already registered' });

    const tenant = await tenantModel.createTenant({ business_name, owner_name, email, password, business_type, plan });
    const token = signToken({ id: tenant.id, role: 'tenant' });

    logger.info('Tenant registered', { email, plan: tenant.plan });
    res.status(201).json({
      success: true,
      token,
      tenant: {
        id: tenant.id,
        business_name: tenant.business_name,
        email: tenant.email,
        plan: tenant.plan,
        business_type: tenant.business_type,
      },
    });
  } catch (err) {
    logger.error('Register error', { error: err.message });
    res.status(500).json({ error: 'Registration failed' });
  }
}

// ── Tenant Login ──────────────────────────────────────────────────────────
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const tenant = await tenantModel.findByEmail(email);
    if (!tenant || !(await tenantModel.verifyPassword(tenant, password)))
      return res.status(401).json({ error: 'Invalid credentials' });

    if (!tenant.is_active)
      return res.status(403).json({ error: 'Account is inactive. Contact support.' });

    const token = signToken({ id: tenant.id, role: 'tenant' });
    res.json({
      success: true,
      token,
      tenant: {
        id: tenant.id,
        business_name: tenant.business_name,
        email: tenant.email,
        plan: tenant.plan,
        business_type: tenant.business_type,
        whatsapp_number: tenant.whatsapp_number,
        ai_reply_count: tenant.ai_reply_count,
        monthly_limit: tenant.monthly_limit,
      },
    });
  } catch (err) {
    logger.error('Login error', { error: err.message });
    res.status(500).json({ error: 'Login failed' });
  }
}

// ── Super Admin Login ─────────────────────────────────────────────────────
async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;
    const result = await query('SELECT * FROM super_admins WHERE email=$1', [email]);
    const admin = result.rows[0];
    if (!admin || !(await bcrypt.compare(password, admin.password_hash)))
      return res.status(401).json({ error: 'Invalid admin credentials' });

    const token = signToken({ id: admin.id, role: 'super_admin' });
    res.json({ success: true, token, admin: { id: admin.id, email: admin.email } });
  } catch (err) {
    logger.error('Admin login error', { error: err.message });
    res.status(500).json({ error: 'Login failed' });
  }
}

// ── Get current tenant profile ────────────────────────────────────────────
async function me(req, res) {
  res.json({ success: true, tenant: req.tenant });
}

module.exports = { register, login, adminLogin, me };
