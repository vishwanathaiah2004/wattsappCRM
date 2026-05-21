const { getTwilioClient } = require('../config/twilio');
const logger = require('../utils/logger');

async function sendWhatsAppMessage(from, to, body) {
  try {
    const client = getTwilioClient();
    const fromFmt = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
    const toFmt = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const msg = await client.messages.create({ from: fromFmt, to: toFmt, body });
    logger.info('WhatsApp sent', { from: fromFmt, to: toFmt, sid: msg.sid });
    return msg;
  } catch (err) {
    logger.error('WhatsApp send failed', { to, error: err.message });
    throw err;
  }
}

function normalizePhone(phone) {
  return phone.replace(/^whatsapp:/i, '').trim();
}

function formatWhatsApp(phone) {
  return phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
}

module.exports = { sendWhatsAppMessage, normalizePhone, formatWhatsApp };
