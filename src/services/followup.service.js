const cron = require('node-cron');
const { query } = require('../config/database');
const leadModel = require('../models/lead.model');
const convModel = require('../models/conversation.model');
const tenantModel = require('../models/tenant.model');
const geminiService = require('./gemini.service');
const twilioService = require('./twilio.service');
const logger = require('../utils/logger');

let isRunning = false;

async function processAllTenants() {
  if (isRunning) { logger.warn('Follow-up job already running, skipping'); return; }
  isRunning = true;
  logger.info('Follow-up job started across all tenants');

  try {
    const tenants = await tenantModel.getAllTenants();
    const activeTenants = tenants.filter(t => t.is_active && t.whatsapp_number);

    for (const tenant of activeTenants) {
      await processTenantFollowUps(tenant);
    }
  } catch (err) {
    logger.error('Follow-up job error', { error: err.message });
  } finally {
    isRunning = false;
    logger.info('Follow-up job complete');
  }
}

async function processTenantFollowUps(tenant) {
  try {
    const hours = parseInt(process.env.FOLLOWUP_INACTIVE_HOURS || '24', 10);
    const inactiveLeads = await leadModel.getInactiveLeads(tenant.id, hours);
    if (inactiveLeads.length === 0) return;

    logger.info(`Tenant ${tenant.business_name}: ${inactiveLeads.length} inactive leads`);

    for (const lead of inactiveLeads) {
      try {
        const message = await geminiService.generateFollowUpMessage(lead, tenant);
        await twilioService.sendWhatsAppMessage(
          tenant.whatsapp_number,
          twilioService.formatWhatsApp(lead.phone),
          message
        );
        await convModel.logFollowUp(tenant.id, lead.id, message, 'sent');
        await leadModel.updateLead(tenant.id, lead.id, {
          stage: lead.stage === 'new' ? 'follow_up' : lead.stage,
          last_contacted: new Date(),
        });
        logger.info('Follow-up sent', { tenant: tenant.business_name, phone: lead.phone });
        await sleep(1200);
      } catch (e) {
        logger.error('Follow-up failed for lead', { phone: lead.phone, error: e.message });
        try { await convModel.logFollowUp(tenant.id, lead.id, 'FAILED', 'failed'); } catch (_) {}
      }
    }
  } catch (err) {
    logger.error('Tenant follow-up error', { tenant: tenant.business_name, error: err.message });
  }
}

function startFollowUpScheduler() {
  cron.schedule('0 * * * *', () => {
    logger.info('Cron: running follow-ups for all tenants');
    processAllTenants();
  });
  logger.info('Follow-up scheduler started (every hour)');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { startFollowUpScheduler, processAllTenants, processTenantFollowUps };
