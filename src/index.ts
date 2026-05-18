import express from 'express';
import axios from 'axios';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = express();
app.use(express.json());

const dbPath = (process.env.DATABASE_URL || 'sqlite:./supportwa.db').replace('sqlite:','');
const db = new Database(dbPath);
db.exec(`CREATE TABLE IF NOT EXISTS conversations (id INTEGER PRIMARY KEY, contact TEXT UNIQUE, state TEXT DEFAULT 'ai', last_message TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, conv_id INTEGER, direction TEXT, content TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`);

const OPENWA_API = process.env.OPENWA_API_URL || 'http://localhost:2785/api';
const KB = fs.readFileSync(process.env.KNOWLEDGE_BASE_PATH || './knowledge.txt', 'utf8');

async function getAIResponse(q: string) {
  const l = q.toLowerCase();
  if (l.includes('billing') || l.includes('password')) return {answer: KB.split('\n')[0], escalate: false};
  if (l.includes('human') || l.includes('complex')) return {answer: 'Escalated to support team.', escalate: true};
  return {answer: 'Thanks for contacting support. Ref: ' + Date.now(), escalate: false};
}

app.get('/health', (_, res) => res.json({status:'ok', openwa:OPENWA_API}));

app.post('/webhooks/openwa', async (req, res) => {
  const {from, body} = req.body;
  if (!from || !body) return res.sendStatus(400);
  let conv: any = db.prepare('SELECT * FROM conversations WHERE contact=?').get(from);
  if (!conv) {
    const r = db.prepare('INSERT INTO conversations (contact) VALUES (?)').run(from);
    conv = {id: r.lastInsertRowid, contact: from, state:'ai'};
  }
  db.prepare('INSERT INTO messages (conv_id,direction,content) VALUES (?,?,?)').run(conv.id,'in',body);
  const {answer, escalate} = await getAIResponse(body);
  if (escalate || conv.state==='human') {
    db.prepare('UPDATE conversations SET state="human", last_message=? WHERE id=?').run(body, conv.id);
    console.log('ESCALATED:', from, body);
    return res.sendStatus(200);
  }
  try {
    await axios.post(`${OPENWA_API}/send`, {to: from, message: answer}, {headers: {'Authorization': `Bearer ${process.env.OPENWA_API_KEY||''}`}});
    db.prepare('INSERT INTO messages (conv_id,direction,content) VALUES (?,?,?)').run(conv.id,'out',answer);
    db.prepare('UPDATE conversations SET last_message=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(body, conv.id);
  } catch(e){console.error('Send fail',e);}
  res.sendStatus(200);
});

app.get('/admin', (_, res) => {
  const rows = db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC').all();
  let h = '<h1>SupportWA Admin</h1><table border="1"><tr><th>ID</th><th>Contact</th><th>State</th><th>Last Msg</th><th>Actions</th></tr>';
  rows.forEach((c:any)=> h += `<tr><td>${c.id}</td><td>${c.contact}</td><td>${c.state}</td><td>${c.last_message||''}</td><td><a href="/admin/escalate/${c.id}">Escalate</a> | <a href="/admin/resolve/${c.id}">Resolve</a></td></tr>`);
  h += '</table><p>API: /api/conversations | PATCH /api/conversations/:id/status</p>';
  res.send(h);
});
app.get('/admin/escalate/:id', (req,res)=>{db.prepare('UPDATE conversations SET state="human" WHERE id=?').run(req.params.id); res.redirect('/admin');});
app.get('/admin/resolve/:id', (req,res)=>{db.prepare('UPDATE conversations SET state="resolved" WHERE id=?').run(req.params.id); res.redirect('/admin');});
app.get('/api/conversations', (_,res)=>res.json(db.prepare('SELECT * FROM conversations').all()));
app.patch('/api/conversations/:id/status', (req,res)=>{db.prepare('UPDATE conversations SET state=? WHERE id=?').run(req.body.status, req.params.id); res.json({ok:true});});

const PORT=process.env.PORT||4000;
app.listen(PORT,()=>console.log(`SupportWA @ ${PORT} | OpenWA: ${OPENWA_API}`));