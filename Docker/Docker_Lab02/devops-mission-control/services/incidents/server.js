const http = require('http');
const { Pool } = require('pg');
const { createClient } = require('redis');
const port = Number(process.env.PORT || 3001);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = createClient({ url: process.env.REDIS_URL });
redis.on('error', err => console.error('Redis error:', err.message));

async function init() {
  for (let i=0; i<20; i++) {
    try { await pool.query('SELECT 1'); break; }
    catch (e) { if(i===19) throw e; await new Promise(r=>setTimeout(r,1500)); }
  }
  await redis.connect();
}
function send(res, code, body) { res.writeHead(code, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}); res.end(body===null?'':JSON.stringify(body)); }
function readBody(req) { return new Promise((resolve,reject)=>{let raw='';req.on('data',c=>raw+=c);req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{})}catch(e){reject(e)}});req.on('error',reject)}); }
const server = http.createServer(async (req,res)=>{
  try {
    const url = new URL(req.url, 'http://localhost');
    if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type'});return res.end();}
    if(url.pathname==='/health') {
      let db=false, cache=false;
      try{await pool.query('SELECT 1');db=true}catch{}
      try{cache=await redis.ping()==='PONG'}catch{}
      return send(res,db&&cache?200:503,{service:'incidents',database:db,redis:cache});
    }
    if(url.pathname==='/incidents' && req.method==='GET') {
      await redis.incr('mission:incident:list-views');
      const {rows}=await pool.query('SELECT id,title,severity,created_at FROM incidents ORDER BY id DESC LIMIT 50');
      return send(res,200,rows);
    }
    if(url.pathname==='/incidents' && req.method==='POST') {
      const body=await readBody(req), title=String(body.title||'').trim(), severity=String(body.severity||'MEDIUM').toUpperCase();
      if(!title || title.length>120 || !['LOW','MEDIUM','HIGH','CRITICAL'].includes(severity)) return send(res,400,{error:'Provide a title (1-120 chars) and valid severity.'});
      const {rows}=await pool.query('INSERT INTO incidents(title,severity) VALUES($1,$2) RETURNING id,title,severity,created_at',[title,severity]);
      return send(res,201,rows[0]);
    }
    const match=url.pathname.match(/^\/incidents\/(\d+)$/);
    if(match && req.method==='DELETE') {const result=await pool.query('DELETE FROM incidents WHERE id=$1',[match[1]]);return send(res,result.rowCount?200:404,{deleted:!!result.rowCount});}
    return send(res,404,{error:'Not found'});
  } catch(e) { console.error(e); return send(res,500,{error:'Internal service error'}); }
});
init().then(()=>server.listen(port,'0.0.0.0',()=>console.log(`Incident service listening on ${port}`))).catch(e=>{console.error('Startup failed:',e);process.exit(1)});
