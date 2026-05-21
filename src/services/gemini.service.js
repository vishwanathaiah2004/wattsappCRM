const { getGeminiModel } = require('../config/gemini');
const logger = require('../utils/logger');

const BASE_INSTRUCTIONS = `
Analyze the customer message and respond ONLY with a valid JSON object. No extra text. No markdown fences. Raw JSON only.

Required keys:
{
  "reply": "Your response to the customer (2-3 sentences, warm and professional, ask ONE question if needed)",
  "intent": "One of: inquiry, support, purchase, complaint, follow_up, booking, general, unknown",
  "name": "Customer's name if mentioned, else null",
  "budget": "Budget if mentioned (e.g. '₹50,000'), else null",
  "stage": "One of: new, interested, qualified, proposal, negotiating, closed_won, closed_lost, follow_up"
}

Stage rules:
- new: first contact, no info yet
- interested: exploring options
- qualified: intent AND budget both known
- proposal: asked for quote/proposal
- negotiating: discussing price/terms
- closed_won: confirmed purchase/booking
- closed_lost: not interested/gone elsewhere
- follow_up: asked to be contacted later

Reply in the same language the customer used.`;

async function analyzeMessage(userMessage, conversationHistory = [], existingLead = null, tenant = null) {
  try {
    const model = getGeminiModel();

    const customPrompt = tenant?.gemini_prompt || 'You are a helpful sales assistant.';
    const businessName = tenant?.business_name || 'our business';

    let historyCtx = '';
    if (conversationHistory.length > 0) {
      historyCtx = '\n\nRecent conversation:\n' +
        conversationHistory.slice(-6).map(m =>
          `${m.direction === 'inbound' ? 'Customer' : 'Assistant'}: ${m.message}`
        ).join('\n');
    }

    let leadCtx = '';
    if (existingLead) {
      leadCtx = `\n\nKnown about this customer: Name=${existingLead.name||'?'}, Intent=${existingLead.intent||'?'}, Budget=${existingLead.budget||'?'}, Stage=${existingLead.stage||'new'}`;
    }

    const prompt = `Business context for ${businessName}:
${customPrompt}

${BASE_INSTRUCTIONS}${leadCtx}${historyCtx}

Customer message: "${userMessage}"

JSON response:`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim()
      .replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();

    const parsed = JSON.parse(raw);
    return {
      reply: parsed.reply || defaultReply(businessName),
      intent: parsed.intent || 'unknown',
      name: parsed.name || null,
      budget: parsed.budget || null,
      stage: parsed.stage || 'new',
    };
  } catch (err) {
    logger.error('Gemini analysis failed', { error: err.message });
    return {
      reply: defaultReply(tenant?.business_name),
      intent: 'unknown', name: null, budget: null, stage: 'new',
    };
  }
}

async function generateFollowUpMessage(lead, tenant) {
  try {
    const model = getGeminiModel();
    const name = lead.name || 'there';
    const biz = tenant?.business_name || 'us';

    const prompt = `Write a short warm WhatsApp follow-up message for ${biz}.
Customer: Name=${name}, Intent=${lead.intent||'general inquiry'}, Stage=${lead.stage||'new'}.
Rules: Under 3 sentences. Friendly not pushy. Ask if still interested. Sound human. No "I hope this finds you well".
Return ONLY the message text, nothing else.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    logger.error('Follow-up generation failed', { error: err.message });
    return `Hi${lead.name ? ', ' + lead.name : ''}! 👋 Just checking in — still interested? We're here to help anytime!`;
  }
}

function defaultReply(businessName) {
  return `Thanks for contacting ${businessName || 'us'}! 😊 We've received your message and will get back to you shortly. Could you share a bit more about what you're looking for?`;
}

module.exports = { analyzeMessage, generateFollowUpMessage };
