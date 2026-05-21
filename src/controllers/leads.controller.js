const leadModel = require('../models/lead.model');
const convModel = require('../models/conversation.model');
const { processTenantFollowUps } = require('../services/followup.service');
const logger = require('../utils/logger');

async function getLeads(req, res) {
  try {
    const { limit = 50, offset = 0, stage, search } = req.query;
    const tenantId = req.tenant.id;
    const [leads, total] = await Promise.all([
      leadModel.getAllLeads(tenantId, { limit: parseInt(limit), offset: parseInt(offset), stage, search }),
      leadModel.countLeads(tenantId, stage),
    ]);
    res.json({ success: true, total, data: leads });
  } catch (err) {
    logger.error('getLeads error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
}

async function getLead(req, res) {
  try {
    const lead = await leadModel.getLeadById(req.tenant.id, req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    const history = await convModel.getHistory(req.tenant.id, lead.id, 50);
    res.json({ success: true, data: { lead, history } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
}

async function updateLead(req, res) {
  try {
    const { stage, name, intent, budget } = req.body;
    const lead = await leadModel.updateLead(req.tenant.id, req.params.id, { stage, name, intent, budget });
    res.json({ success: true, data: lead });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update lead' });
  }
}

async function getStats(req, res) {
  try {
    const tenantId = req.tenant.id;
    const [total, stageStats] = await Promise.all([
      leadModel.countLeads(tenantId),
      leadModel.getStageStats(tenantId),
    ]);
    res.json({
      success: true,
      data: {
        total,
        stageStats,
        ai_replies_used: req.tenant.ai_reply_count,
        monthly_limit: req.tenant.monthly_limit,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}

async function triggerFollowUps(req, res) {
  res.json({ success: true, message: 'Follow-up job triggered. Check logs.' });
  processTenantFollowUps(req.tenant);
}

module.exports = { getLeads, getLead, updateLead, getStats, triggerFollowUps };
