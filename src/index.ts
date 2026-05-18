import express from 'express';
import axios from 'axios';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { getAIResponse } from './ai/provider';
import { log, reqId } from './utils/logger';

dotenv.config();

const app = express();
app.use(express.json());

const db = new Database((process.env.DATABASE_URL || 'sqlite:./supportwa.db').replace('sqlite:', ''));
db.exec(`CREATE TABLE IF NOT EXISTS conversations (id INTEGER PRIMARY KEY, contact TEXT UNIQUE, state TEXT DEFAULT 'ai', last_message TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, conv_id INTEGER, direction TEXT, content TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`);

const OPENWA = process.env.OPENWA_API_URL || 'http://localhost:2785/api';
let metrics = { inbound: 0, outbound: 0, escalations: 0, aiFallback: 0, providerError: 0, openwaFail: 0, start: Date.now() };
const rate = new Map<string, number[]>();

function rateLimit(contact: string) {
  const now = Date.now();
  const window = rate.get(contact) || [];
  const recent = window.filter(t => now - t < 60000);
  if (recent.length >= 10) { log('rate_limit_block', { contact }); return false; }
  rate.set(contact, [...recent, now]);
  return true;
}

function updateHealth() { return { status: 'ok', db: 'connected', openwa: !!OPENWA, ai: !!process.env.AI_API_KEY, uptime: Math.floor((Date.now() - metrics.start) / 1000) }; }

app.use((req, res, next) => { (req as any).reqId = reqId(); next(); });
app.use((err: any, req: any, res: any, next: any) => { log('error', { reqId: req.reqId, msg: err.message }); res.status(500).json({ error: 'internal', reqId: req.reqId }); });

app.get('/health', (req, res) => { const h = updateHealth(); log('health_check', { reqId: (req as any).reqId, ...h }); res.json(h); });
app.get('/metrics', (req, res) => { log('metrics', { reqId: (req as any).reqId }); res.json({ ...metrics, uptime: Math.floor((Date.now() - metrics.start) / 1000) }); });

app.post('/webhooks/openwa', async (req, res) => {
  const rid = (req as any).reqId;
  const { from, body } = req.body;
  if (!from || !body) { log('webhook_invalid', { reqId: rid }); return res.sendStatus(400); }
  if (!rateLimit(from)) return res.status(429).json({ error: 'rate_limited', reqId: rid });
  metrics.inbound++;
  log('webhook_inbound', { reqId: rid, from, body: body.slice(0, 100) });
  let conv: any = db.prepare('SELECT * FROM conversations WHERE contact = ?').get(from);
  if (!conv) { const r = db.prepare('INSERT INTO conversations (contact) VALUES (?)').run(from); conv = { id: r.lastInsertRowid, contact: from, state: 'ai' }; }
  db.prepare('INSERT INTO messages (conv_id, direction, content) VALUES (?, ?, ?)').run(conv.id, 'in', body);
  let aiRes;
  try { aiRes = await getAIResponse(body); } catch (e) { metrics.providerError++; log('ai_error', { reqId: rid, err: (e as Error).message }); aiRes = { answer: 'Support will reply.', escalate: true, provider: 'error' }; }
  if (aiRes.escalate || conv.state === 'human') { metrics.escalations++; db.prepare('UPDATE conversations SET state = "human", last_message = ? WHERE id = ?').run(body, conv.id); log('escalation', { reqId: rid, from }); return res.sendStatus(200); }
  if (aiRes.provider !== 'openai-compatible') metrics.aiFallback++;
  try {
    await axios.post(`${OPENWA}/send`, { to: from, message: aiRes.answer }, { headers: { Authorization: `Bearer ${process.env.OPENWA_API_KEY || ''}` } });
    metrics.outbound++;
    log('openwa_send_success', { reqId: rid, to: from });
    db.prepare('INSERT INTO messages (conv_id, direction, content) VALUES (?, ?, ?)').run(conv.id, 'out', aiRes.answer);
    db.prepare('UPDATE conversations SET last_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(body, conv.id);
  } catch (e) { metrics.openwaFail++; log('openwa_send_fail', { reqId: rid, err: (e as Error).message }); }
  res.sendStatus(200);
});

app.get('/admin', (_, res) => { const rows = db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC').all(); let h = '<h1>SupportWA Admin</h1><table border="1"><tr><th>ID</th><th>Contact</th><th>State</th><th>Last</th><th>Actions</th></tr>'; rows.forEach((c: any) => h += `<tr><td>${c.id}</td><td>${c.contact}</td><td>${c.state}</td><td>${c.last_message || ''}</td><td><a href="/admin/escalate/${c.id}">Escalate</a> | <a href="/admin/resolve/${c.id}">Resolve</a></td></tr>`); h += '</table>'; res.send(h); });
app.get('/admin/escalate/:id', (req, res) => { db.prepare('UPDATE conversations SET state="human" WHERE id=?').run(req.params.id); res.redirect('/admin'); });
app.get('/admin/resolve/:id', (req, res) => { db.prepare('UPDATE conversations SET state="resolved" WHERE id=?').run(req.params.id); res.redirect('/admin'); });
app.get('/api/conversations', (_, res) => res.json(db.prepare('SELECT * FROM conversations').all()));
app.patch('/api/conversations/:id/status', (req, res) => { db.prepare('UPDATE conversations SET state=? WHERE id=?').run(req.body.status, req.params.id); res.json({ ok: true }); });

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => log('server_start', { port: PORT, openwa: OPENWA }));
