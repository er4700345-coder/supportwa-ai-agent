const http = require('http');
const assert = require('assert');

const BASE = process.env.BASE || 'http://localhost:4000';

function get(p){ return new Promise((r,j)=>{ http.get(BASE+p,(res)=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>r({status:res.statusCode,body:d}));}).on('error',j); }); }

async function run(){
  console.log('Smoke: health'); const h=await get('/health'); assert(h.status===200,'health fail'); assert(h.body.includes('ok'),'health ok');
  console.log('Smoke: webhook store'); const w=await new Promise((r,j)=>{ const req=http.request({hostname:'localhost',port:4000,path:'/webhooks/openwa',method:'POST',headers:{'Content-Type':'application/json'}},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>r({status:res.statusCode,body:d}));}); req.on('error',j); req.write(JSON.stringify({from:'+15551234567',body:'test billing query'})); req.end(); });
  assert(w.status===200,'webhook fail');
  console.log('Smoke: escalation'); const e=await new Promise((r,j)=>{ const req=http.request({hostname:'localhost',port:4000,path:'/webhooks/openwa',method:'POST',headers:{'Content-Type':'application/json'}},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>r({status:res.statusCode}));}); req.on('error',j); req.write(JSON.stringify({from:'+15559876543',body:'need human help complex issue'})); req.end(); });
  assert(e.status===200,'escalate fail');
  console.log('All smoke checks passed');
}
run().catch(e=>{console.error(e);process.exit(1);});