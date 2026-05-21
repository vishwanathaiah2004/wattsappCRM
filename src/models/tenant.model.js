const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

const DEFAULT_PROMPTS = {
  general: `You are a helpful sales assistant. Extract name, intent, and budget from the conversation.
Reply professionally and warmly. Ask one clarifying question at a time.`,

  real_estate: `You are a property sales assistant. Help customers find their ideal property.
Ask about: location preference, budget, BHK/property type, possession timeline, purpose (own use/investment).
Mention EMI options when budget is discussed. Be enthusiastic about properties.`,

  coaching: `You are an admissions counselor. Help students find the right course.
Ask about: which course/exam they're preparing for, current qualification, preferred batch timing, location.
Highlight success rates and faculty. Offer a free demo class to interested students.`,

  clinic: `You are a patient coordinator. Help patients book appointments.
Ask about: symptoms/concern, preferred doctor (if applicable), preferred date/time, insurance.
Always be empathetic and reassuring. Never give medical advice. Maintain strict confidentiality.`,

  ecommerce: `You are a shopping assistant. Help customers find and buy products.
Ask about: what they're looking for, size/variant preferences, budget range, delivery timeline.
Mention current offers, return policy, and free shipping thresholds.`,

  travel: `You are a travel consultant. Help plan perfect trips.
Ask about: destination, travel dates, number of travelers, budget, accommodation preference, visa needs.
Suggest packages proactively. Mention seasonal deals.`,

  legal: `You are a legal inquiry assistant. Help clients understand if they need legal help.
Ask about: type of legal matter, urgency, location. Never give legal advice.
Always recommend a consultation. Be professional and confidential.`,

  car_dealership: `You are a car sales assistant. Help customers find their ideal vehicle.
Ask about: car type/model interest, budget, fuel preference, usage (city/highway), EMI interest.
Mention test drive availability and exchange offers.`,
};

async function findByEmail(email) {
  const r = await query('SELECT * FROM tenants WHERE email = $1', [email]);
  return r.rows[0] || null;
}

async function findById(id) {
  const r = await query('SELECT * FROM tenants WHERE id = $1', [id]);
  return r.rows[0] || null;
}

async function findByWhatsAppNumber(number) {
  const normalized = number.replace(/^whatsapp:/i, '').trim();
  const r = await query('SELECT * FROM tenants WHERE whatsapp_number = $1 AND is_active = true', [normalized]);
  return r.rows[0] || null;
}

async function createTenant({ business_name, owner_name, email, password, business_type, plan }) {
  const hash = await bcrypt.hash(password, 10);
  const prompt = DEFAULT_PROMPTS[business_type] || DEFAULT_PROMPTS.general;
  const limit = plan === 'growth' ? 999999 : plan === 'agency' ? 999999 : 500;

  const r = await query(
    `INSERT INTO tenants (business_name, owner_name, email, password_hash, business_type, gemini_prompt, plan, monthly_limit)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [business_name, owner_name || null, email, hash, business_type || 'general', prompt, plan || 'starter', limit]
  );
  logger.info('Tenant created', { email, plan });
  return r.rows[0];
}

async function updateTenant(id, updates) {
  const allowed = ['business_name', 'owner_name', 'whatsapp_number', 'gemini_prompt', 'plan', 'is_active', 'business_type', 'monthly_limit'];
  const fields = [], values = [];
  let idx = 1;
  for (const f of allowed) {
    if (updates[f] !== undefined) {
      fields.push(`${f} = $${idx++}`);
      values.push(updates[f]);
    }
  }
  fields.push(`updated_at = NOW()`);
  if (fields.length === 1) return findById(id);
  values.push(id);
  const r = await query(`UPDATE tenants SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
  return r.rows[0];
}

async function incrementReplyCount(id) {
  await query('UPDATE tenants SET ai_reply_count = ai_reply_count + 1 WHERE id = $1', [id]);
}

async function getAllTenants() {
  const r = await query('SELECT id, business_name, email, business_type, plan, is_active, whatsapp_number, ai_reply_count, monthly_limit, created_at FROM tenants ORDER BY created_at DESC');
  return r.rows;
}

async function verifyPassword(tenant, password) {
  return bcrypt.compare(password, tenant.password_hash);
}

module.exports = { findByEmail, findById, findByWhatsAppNumber, createTenant, updateTenant, incrementReplyCount, getAllTenants, verifyPassword, DEFAULT_PROMPTS };
