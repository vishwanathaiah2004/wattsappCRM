const { query } = require('../config/database');

async function saveMessage(tenantId, leadId, direction, message) {
  const r = await query(
    `INSERT INTO conversations (tenant_id, lead_id, direction, message) VALUES ($1,$2,$3,$4) RETURNING *`,
    [tenantId, leadId, direction, message]
  );
  return r.rows[0];
}

async function getHistory(tenantId, leadId, limit = 20) {
  const r = await query(
    `SELECT direction, message, created_at FROM conversations
     WHERE tenant_id=$1 AND lead_id=$2 ORDER BY created_at DESC LIMIT $3`,
    [tenantId, leadId, limit]
  );
  return r.rows.reverse();
}

async function logFollowUp(tenantId, leadId, message, status = 'sent') {
  const r = await query(
    `INSERT INTO followup_logs (tenant_id, lead_id, message, status) VALUES ($1,$2,$3,$4) RETURNING *`,
    [tenantId, leadId, message, status]
  );
  return r.rows[0];
}

module.exports = { saveMessage, getHistory, logFollowUp };
