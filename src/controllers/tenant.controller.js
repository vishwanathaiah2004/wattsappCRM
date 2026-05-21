const tenantModel = require('../models/tenant.model');
const logger = require('../utils/logger');

// ── Tenant: update own settings ───────────────────────────────────────────
async function updateSettings(req, res) {
  try {
    const { business_name, owner_name, whatsapp_number, gemini_prompt, business_type } = req.body;
    const updated = await tenantModel.updateTenant(req.tenant.id, {
      business_name, owner_name, whatsapp_number, gemini_prompt, business_type,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error('updateSettings error', { error: err.message });
    res.status(500).json({ error: 'Failed to update settings' });
  }
}

// ── Super Admin: list all tenants ─────────────────────────────────────────
async function listAllTenants(req, res) {
  try {
    const tenants = await tenantModel.getAllTenants();
    res.json({ success: true, total: tenants.length, data: tenants });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
}

// ── Super Admin: create tenant ────────────────────────────────────────────
async function createTenant(req, res) {
  try {
    const { business_name, owner_name, email, password, business_type, plan } = req.body;
    if (!business_name || !email || !password)
      return res.status(400).json({ error: 'business_name, email, password required' });

    const existing = await tenantModel.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already exists' });

    const tenant = await tenantModel.createTenant({ business_name, owner_name, email, password, business_type, plan });
    res.status(201).json({ success: true, data: tenant });
  } catch (err) {
    logger.error('createTenant error', { error: err.message });
    res.status(500).json({ error: 'Failed to create tenant' });
  }
}

// ── Super Admin: toggle tenant active/inactive ────────────────────────────
async function toggleTenant(req, res) {
  try {
    const tenant = await tenantModel.findById(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    const updated = await tenantModel.updateTenant(req.params.id, { is_active: !tenant.is_active });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle tenant' });
  }
}

// ── Super Admin: update tenant plan ──────────────────────────────────────
async function updatePlan(req, res) {
  try {
    const { plan } = req.body;
    const limits = { starter: 500, growth: 999999, agency: 999999 };
    const updated = await tenantModel.updateTenant(req.params.id, {
      plan,
      monthly_limit: limits[plan] || 500,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update plan' });
  }
}

module.exports = { updateSettings, listAllTenants, createTenant, toggleTenant, updatePlan };
