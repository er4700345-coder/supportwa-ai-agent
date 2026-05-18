const http = require('http');
const assert = require('assert');
const BASE = process.env.BASE || 'http://localhost:4000';
function get(p){return new Promise((r,j)=>{http.get(BASE+p,(res)=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>r({status:res.statusCode,body:d}));}).on('error',j);});}
async function run(){
  console.log('Smoke: health+db+ai'); const h=await get('/health'); assert(h.status===200); assert(h.body.includes('db') && h.body.includes('ai'));
  console.log('Smoke: metrics'); const m=await get('/metrics'); assert(m.status===200); assert(m.body.includes('inbound'));
  console.log('Smoke: inbound metric'); await new Promise((r,j)=>{const req=http.request({hostname:'localhost',port:4000,path:'/webhooks/openwa',method:'POST',headers:{'Content-Type':'application/json'}},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>r({status:res.statusCode}));});req.on('error',j);req.write(JSON.stringify({from:'+1smoke',body:'test metric'}));req.end();});
  console.log('Smoke: escalation metric'); await new Promise((r,j)=>{const req=http.request({hostname:'localhost',port:4000,path:'/webhooks/openwa',method:'POST',headers:{'Content-Type':'application/json'}},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>r({status:res.statusCode}));});req.on('error',j);req.write(JSON.stringify({from:'+1esc2',body:'human help'}));req.end();});
  console.log('All production smoke passed');
}
run().catch(e=>{console.error(e);process.exit(1);});