const twilio = require('twilio');
const logger = require('../utils/logger');
let client;

function getTwilioClient() {
  if (!client) {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN)
      throw new Error('Twilio credentials not set');
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    logger.info('Twilio client initialized');
  }
  return client;
}

module.exports = { getTwilioClient };
