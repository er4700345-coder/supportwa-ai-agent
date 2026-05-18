import axios from 'axios';
import fs from 'fs';
const AI_KEY = process.env.AI_API_KEY || '';
const AI_BASE = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const KB = fs.readFileSync(process.env.KNOWLEDGE_BASE_PATH || './knowledge.txt', 'utf8');
const POLICY = 'Do not make unsupported claims. Escalate uncertain cases. Keep replies short and helpful.';
export async function getAIResponse(question: string): Promise<{answer: string, escalate: boolean, provider: string}> {
  if (!AI_KEY) {
    console.log('[AI] stub fallback (no key)');
    return { answer: KB.split('\n')[0] || 'Support will assist shortly.', escalate: question.toLowerCase().includes('human'), provider: 'stub' };
  }
  let attempt = 0;
  const max = 2;
  while (attempt <= max) {
    try {
      console.log(`[AI] provider call attempt ${attempt + 1}`);
      const r = await axios.post(`${AI_BASE}/chat/completions`, { model: AI_MODEL, messages: [{ role: 'system', content: POLICY }, { role: 'user', content: question + ' | KB: ' + KB }], max_tokens: 120 }, { headers: { Authorization: `Bearer ${AI_KEY}` }, timeout: 8000 });
      const answer = r.data.choices?.[0]?.message?.content?.trim() || 'Follow up soon.';
      console.log('[AI] success');
      return { answer, escalate: false, provider: 'openai-compatible' };
    } catch (e: any) {
      attempt++;
      console.error(`[AI] error attempt ${attempt}: ${e.response?.status || e.code || 'unknown'}`);
      if (attempt > max) return { answer: 'AI temporarily unavailable. Team notified.', escalate: true, provider: 'fallback' };
      await new Promise(r => setTimeout(r, 400 * attempt));
    }
  }
  return { answer: 'Support will reply.', escalate: true, provider: 'fallback' };
}