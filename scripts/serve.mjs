import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('_precision_site'),port=Number(process.env.PORT||8000);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
await fs.access(path.join(root,'index.html')).catch(()=>{throw Error('Run npm run build first');});
const server=http.createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  const u=new URL(req.url,'http://localhost'),full=path.resolve(root,'.'+decodeURIComponent(u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname));
  if(!full.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  const body=await fs.readFile(full);res.writeHead(200,{'Cache-Control':'no-store','Content-Type':{'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.md':'text/plain; charset=utf-8'}[path.extname(full)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log('Local site: http://127.0.0.1:'+port+'/ (no key configured)'));
server.on('error',e=>{console.error(e.code||'SERVER_ERROR');process.exitCode=1;});
