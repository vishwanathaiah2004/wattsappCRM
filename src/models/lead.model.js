const { query } = require('../config/database');
const logger = require('../utils/logger');

async function findByPhone(tenantId, phone) {
  const r = await query('SELECT * FROM leads WHERE tenant_id=$1 AND phone=$2 LIMIT 1', [tenantId, phone]);
  return r.rows[0] || null;
}

async function upsertLead(tenantId, phone, data) {
  const existing = await findByPhone(tenantId, phone);
  if (existing) {
    return updateLead(tenantId, existing.id, { ...data, last_contacted: new Date() });
  }
  const r = await query(
    `INSERT INTO leads (tenant_id, phone, name, message, intent, budget, stage, last_contacted)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *`,
    [tenantId, phone, data.name||null, data.message||null, data.intent||null, data.budget||null, data.stage||'new']
  );
  logger.info('Lead created', { tenantId, phone });
  return r.rows[0];
}

async function updateLead(tenantId, leadId, data) {
  const allowed = ['name','message','intent','budget','stage','last_contacted'];
  const fields = [], values = [];
  let idx = 1;
  for (const f of allowed) {
    if (data[f] !== undefined && data[f] !== null) {
      fields.push(`${f} = $${idx++}`);
      values.push(data[f]);
    }
  }
  if (!data.last_contacted) fields.push('last_contacted = NOW()');
  if (fields.length === 0) return findByPhone(tenantId, data.phone);
  values.push(tenantId, leadId);
  const r = await query(
    `UPDATE leads SET ${fields.join(',')} WHERE tenant_id=$${idx} AND id=$${idx+1} RETURNING *`,
    values
  );
  return r.rows[0];
}

async function getAllLeads(tenantId, { limit=50, offset=0, stage, search } = {}) {
  let where = 'WHERE tenant_id=$1';
  const values = [tenantId];
  let idx = 2;
  if (stage) { where += ` AND stage=$${idx++}`; values.push(stage); }
  if (search) { where += ` AND (name ILIKE $${idx} OR phone ILIKE $${idx} OR intent ILIKE $${idx})`; values.push(`%${search}%`); idx++; }
  const r = await query(
    `SELECT * FROM leads ${where} ORDER BY last_contacted DESC LIMIT $${idx} OFFSET $${idx+1}`,
    [...values, limit, offset]
  );
  return r.rows;
}

async function countLeads(tenantId, stage) {
  let where = 'WHERE tenant_id=$1';
  const values = [tenantId];
  if (stage) { where += ' AND stage=$2'; values.push(stage); }
  const r = await query(`SELECT COUNT(*) AS total FROM leads ${where}`, values);
  return parseInt(r.rows[0].total, 10);
}

async function getInactiveLeads(tenantId, hours) {
  const r = await query(
    `SELECT * FROM leads WHERE tenant_id=$1
     AND last_contacted < NOW() - INTERVAL '${parseInt(hours)} hours'
     AND stage NOT IN ('closed_won','closed_lost')
     ORDER BY last_contacted ASC`,
    [tenantId]
  );
  return r.rows;
}

async function getStageStats(tenantId) {
  const r = await query(
    `SELECT stage, COUNT(*) as count FROM leads WHERE tenant_id=$1 GROUP BY stage`,
    [tenantId]
  );
  const stats = {};
  for (const row of r.rows) stats[row.stage] = parseInt(row.count, 10);
  return stats;
}

async function getLeadById(tenantId, leadId) {
  const r = await query('SELECT * FROM leads WHERE tenant_id=$1 AND id=$2', [tenantId, leadId]);
  return r.rows[0] || null;
}

module.exports = { findByPhone, upsertLead, updateLead, getAllLeads, countLeads, getInactiveLeads, getStageStats, getLeadById };
