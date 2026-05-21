const express = require('express');
const router = express.Router();

const { requireTenant, requireSuperAdmin } = require('../middleware/auth');
const authCtrl = require('../controllers/auth.controller');
const leadsCtrl = require('../controllers/leads.controller');
const tenantCtrl = require('../controllers/tenant.controller');
const webhookCtrl = require('../controllers/webhook.controller');

// ── Webhook (public — Twilio calls this) ──────────────────────────────────
router.post('/webhook', webhookCtrl.handleIncomingMessage);

// ── Auth ──────────────────────────────────────────────────────────────────
router.post('/auth/register', authCtrl.register);
router.post('/auth/login', authCtrl.login);
router.post('/auth/admin/login', authCtrl.adminLogin);
router.get('/auth/me', requireTenant, authCtrl.me);

// ── Tenant: leads (protected) ─────────────────────────────────────────────
router.get('/leads', requireTenant, leadsCtrl.getLeads);
router.get('/leads/stats', requireTenant, leadsCtrl.getStats);
router.post('/leads/followup/trigger', requireTenant, leadsCtrl.triggerFollowUps);
router.get('/leads/:id', requireTenant, leadsCtrl.getLead);
router.patch('/leads/:id', requireTenant, leadsCtrl.updateLead);

// ── Tenant: settings (protected) ─────────────────────────────────────────
router.patch('/settings', requireTenant, tenantCtrl.updateSettings);

// ── Super Admin (protected) ───────────────────────────────────────────────
router.get('/admin/tenants', requireSuperAdmin, tenantCtrl.listAllTenants);
router.post('/admin/tenants', requireSuperAdmin, tenantCtrl.createTenant);
router.patch('/admin/tenants/:id/toggle', requireSuperAdmin, tenantCtrl.toggleTenant);
router.patch('/admin/tenants/:id/plan', requireSuperAdmin, tenantCtrl.updatePlan);

module.exports = router;
