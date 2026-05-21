const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');
let genAI;

function getGeminiModel() {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    logger.info('Gemini initialized');
  }
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

module.exports = { getGeminiModel };
