const tenantModel = require('../models/tenant.model');
const leadModel = require('../models/lead.model');
const convModel = require('../models/conversation.model');
const geminiService = require('../services/gemini.service');
const twilioService = require('../services/twilio.service');
const logger = require('../utils/logger');

/**
 * POST /webhook
 * Twilio sends ALL WhatsApp messages here.
 * We look up which tenant owns the "To" number and route accordingly.
 */
async function handleIncomingMessage(req, res) {
  res.status(200).send('OK'); // Always respond immediately to Twilio

  try {
    const { Body: messageBody, From: from, To: to, ProfileName } = req.body;
    if (!messageBody || !from || !to) {
      logger.warn('Webhook missing required fields', { body: req.body });
      return;
    }

    const phone = twilioService.normalizePhone(from);
    const toNumber = twilioService.normalizePhone(to);

    // Find which tenant owns this WhatsApp number
    const tenant = await tenantModel.findByWhatsAppNumber(toNumber);
    if (!tenant) {
      logger.warn('No active tenant found for number', { toNumber });
      return;
    }

    logger.info('Incoming message', { tenant: tenant.business_name, phone });

    // Check monthly AI reply limit
    if (tenant.ai_reply_count >= tenant.monthly_limit) {
      logger.warn('Tenant hit monthly limit', { tenant: tenant.business_name });
      await twilioService.sendWhatsAppMessage(
        toNumber, from,
        `Hi! We've reached our messaging limit for this month. Please contact us directly. Thank you for your patience!`
      );
      return;
    }

    // Get or create lead
    let lead = await leadModel.findByPhone(tenant.id, phone);
    const history = lead ? await convModel.getHistory(tenant.id, lead.id, 10) : [];

    if (!lead) {
      lead = await leadModel.upsertLead(tenant.id, phone, {
        name: ProfileName || null,
        message: messageBody,
        stage: 'new',
      });
    }

    // Save inbound message
    await convModel.saveMessage(tenant.id, lead.id, 'inbound', messageBody);

    // AI analysis with tenant's custom prompt
    const analysis = await geminiService.analyzeMessage(messageBody, history, lead, tenant);

    // Update lead with extracted info
    const updates = { message: messageBody };
    if (analysis.name && !lead.name) updates.name = analysis.name;
    if (analysis.intent) updates.intent = analysis.intent;
    if (analysis.budget) updates.budget = analysis.budget;
    if (analysis.stage) updates.stage = analysis.stage;

    lead = await leadModel.upsertLead(tenant.id, phone, updates);

    // Save outbound reply & send
    await convModel.saveMessage(tenant.id, lead.id, 'outbound', analysis.reply);
    await twilioService.sendWhatsAppMessage(toNumber, from, analysis.reply);

    // Increment usage counter
    await tenantModel.incrementReplyCount(tenant.id);

    logger.info('Message processed', {
      tenant: tenant.business_name,
      phone,
      stage: analysis.stage,
      intent: analysis.intent,
    });
  } catch (err) {
    logger.error('Webhook error', { error: err.message, stack: err.stack });
  }
}

module.exports = { handleIncomingMessage };
