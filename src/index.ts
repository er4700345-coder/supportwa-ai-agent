import express from 'express';
import axios from 'axios';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = express();
app.use(express.json());

const db = new Database((process.env.DATABASE_URL||'sqlite:./supportwa.db').replace('sqlite:',''));
db.exec(`CREATE TABLE IF NOT EXISTS conversations(id INTEGER PRIMARY KEY,contact TEXT UNIQUE,state TEXT DEFAULT 'ai',last_message TEXT,updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY,conv_id INTEGER,direction TEXT,content TEXT,created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`);

const OPENWA = process.env.OPENWA_API_URL || 'http://localhost:2785/api';
const AI_KEY = process.env.AI_API_KEY || '';
const AI_BASE = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const KB = fs.readFileSync(process.env.KNOWLEDGE_BASE_PATH || './knowledge.txt','utf8');

async function aiResponse(q:string){ if(!AI_KEY) return {answer:'[STUB] '+ (KB.split('\n')[0]||'Thanks for contacting support.'),escalate:q.toLowerCase().includes('human')}; try{ const r=await axios.post(`${AI_BASE}/chat/completions`,{model:AI_MODEL,messages:[{role:'system',content:'You are concise customer support. Use KB: '+KB},{role:'user',content:q}],max_tokens:120}, {headers:{Authorization:`Bearer ${AI_KEY}`}}); return {answer:r.data.choices[0].message.content,escalate:false}; }catch(e){return {answer:'[FALLBACK] Support will reply shortly.',escalate:true}; } }

function parsePayload(b:any){ if(b.from && b.body) return {from:b.from,body:b.body}; if(b.sender && b.message) return {from:b.sender,body:b.message}; if(b.phone && b.text) return {from:b.phone,body:b.text}; if(b.message && b.message.from) return {from:b.message.from,body:b.message.body||b.message.text||''}; return {from:b.from||b.sender||b.phone||'unknown',body:b.body||b.message||b.text||JSON.stringify(b)}; }

app.get('/health',(_,res)=>res.json({status:'ok',openwa:OPENWA,ai:!!AI_KEY?'live':'stub'}));

app.post('/webhooks/openwa',async(req,res)=>{ const p=parsePayload(req.body); if(!p.from||!p.body) return res.sendStatus(400); if(p.body.length>500) return res.sendStatus(413); // guard size
  let conv:any=db.prepare('SELECT*FROM conversations WHERE contact=?').get(p.from); if(!conv){const r=db.prepare('INSERT INTO conversations(contact)VALUES(?)').run(p.from);conv={id:r.lastInsertRowid,contact:p.from,state:'ai'};}
  db.prepare('INSERT INTO messages(conv_id,direction,content)VALUES(?,?,?)').run(conv.id,'in',p.body);
  const {answer,escalate}=await aiResponse(p.body);
  if(escalate||conv.state==='human'){ db.prepare('UPDATE conversations SET state="human",last_message=? WHERE id=?').run(p.body,conv.id); console.log('[ESCALATE]',p.from,p.body); return res.sendStatus(200); }
  try{ await axios.post(`${OPENWA}/send`,{to:p.from,message:answer},{headers:{Authorization:`Bearer ${process.env.OPENWA_API_KEY||''}`}}); db.prepare('INSERT INTO messages(conv_id,direction,content)VALUES(?,?,?)').run(conv.id,'out',answer); db.prepare('UPDATE conversations SET last_message=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(p.body,conv.id); }catch(e){console.error('[SEND FAIL]',e);}
  res.sendStatus(200);
});

app.get('/admin',(_,res)=>{const rows=db.prepare('SELECT*FROM conversations ORDER BY updated_at DESC').all(); let h='<h1>SupportWA Admin</h1><table border=1><tr><th>ID</th><th>Contact</th><th>State</th><th>Last</th><th>Actions</th></tr>'; rows.forEach((c:any)=>h+=`<tr><td>${c.id}</td><td>${c.contact}</td><td>${c.state}</td><td>${c.last_message||''}</td><td><a href="/admin/escalate/${c.id}">Escalate</a> | <a href="/admin/resolve/${c.id}">Resolve</a></td></tr>`); h+='</table>'; res.send(h);});
app.get('/admin/escalate/:id',(req,res)=>{db.prepare('UPDATE conversations SET state="human" WHERE id=?').run(req.params.id);res.redirect('/admin');});
app.get('/admin/resolve/:id',(req,res)=>{db.prepare('UPDATE conversations SET state="resolved" WHERE id=?').run(req.params.id);res.redirect('/admin');});
app.get('/api/conversations',(_,res)=>res.json(db.prepare('SELECT*FROM conversations').all()));
app.patch('/api/conversations/:id/status',(req,res)=>{db.prepare('UPDATE conversations SET state=? WHERE id=?').run(req.body.status,req.params.id);res.json({ok:true});});

const PORT=process.env.PORT||4000; app.listen(PORT,()=>console.log(`SupportWA ${PORT} | OpenWA:${OPENWA} | AI:${AI_KEY?'live':'stub'}`));