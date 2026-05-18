const http = require('http');
const assert = require('assert');
const BASE = process.env.BASE || 'http://localhost:4000';
function get(p){return new Promise((r,j)=>{http.get(BASE+p,(res)=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>r({status:res.statusCode,body:d}));}).on('error',j);});}
async function run(){
  console.log('Smoke: health'); const h=await get('/health'); assert(h.status===200);
  console.log('Smoke: stub fallback'); const w1=await new Promise((r,j)=>{const req=http.request({hostname:'localhost',port:4000,path:'/webhooks/openwa',method:'POST',headers:{'Content-Type':'application/json'}},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>r({status:res.statusCode}));});req.on('error',j);req.write(JSON.stringify({from:'+1stub',body:'billing query'}));req.end();});
  assert(w1.status===200);
  console.log('Smoke: escalation'); const w2=await new Promise((r,j)=>{const req=http.request({hostname:'localhost',port:4000,path:'/webhooks/openwa',method:'POST',headers:{'Content-Type':'application/json'}},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>r({status:res.statusCode}));});req.on('error',j);req.write(JSON.stringify({from:'+1esc',body:'need human complex'}));req.end();});
  assert(w2.status===200);
  console.log('All smoke passed');
}
run().catch(e=>{console.error(e);process.exit(1);});