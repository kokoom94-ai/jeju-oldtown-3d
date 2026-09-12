// Checks this static bundle only. No provider requests and no geometry certification.
export function validateManifest(m) {
  if (m?.schema!==1 || m.repository!=='kokoom94-ai/jeju-oldtown-3d' || !Array.isArray(m.files) || !m.files.length || m.files.length>100) throw Error('INVALID_MANIFEST');
  const seen=new Set();let total=0;
  const files=m.files.map(f=>{
    if(typeof f?.path!=='string'||! /^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+$/.test(f.path)||f.path.split('/').some(p=>p==='.'||p==='..'||(p.startsWith('.')&&p!=='.nojekyll'))||! /(?:\.(?:html|mjs|js|json|jpg|txt|md)|^\.nojekyll)$/.test(f.path)||seen.has(f.path)) throw Error('INVALID_PATH');
    if(!/^[a-f0-9]{64}$/.test(f.sha256)||!Number.isSafeInteger(f.bytes)||f.bytes<0||f.bytes>20*1024*1024) throw Error('INVALID_ENTRY');
    seen.add(f.path);total+=f.bytes;return {path:f.path,sha256:f.sha256,bytes:f.bytes};
  });
  if(total>32*1024*1024)throw Error('BUNDLE_TOO_LARGE');
  return {schema:1,repository:m.repository,files};
}
export async function readLimited(response,limit) {
  if(Number(response.headers.get('content-length'))>limit)throw Error('BODY_LIMIT');
  if(!response.body)return new Uint8Array();
  const reader=response.body.getReader(),parts=[];let length=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){await reader.cancel();throw Error('BODY_LIMIT');}parts.push(value);}}
  finally{reader.releaseLock();}
  const out=new Uint8Array(length);let at=0;for(const p of parts){out.set(p,at);at+=p.byteLength;}return out;
}
export async function sha256(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');}
function baseURL(value){const u=new URL(value);if(u.username||u.password||u.search||u.hash||!u.pathname.endsWith('/')||!(u.protocol==='https:'||(u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname))))throw Error('INVALID_BASE');return u;}
function mimeOK(path,type){
 const t=type.split(';')[0].trim().toLowerCase();
 if(/\.m?js$/.test(path))return ['application/javascript','text/javascript','application/x-javascript'].includes(t);
 if(path.endsWith('.html'))return t==='text/html';
 if(path.endsWith('.json'))return t==='application/json';
 if(path.endsWith('.jpg'))return t==='image/jpeg';
 return true;
}
export async function verifyBundle(base,manifest,{fetchImpl=globalThis.fetch,signal,timeoutMs=15000}={}) {
 const u=baseURL(base),{files}=validateManifest(manifest),checks=new Array(files.length);let cursor=0;
 async function worker(){while(cursor<files.length){const index=cursor++,f=files[index],controller=new AbortController();
  const abort=()=>controller.abort();if(signal?.aborted)abort();signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(abort,timeoutMs);
  try{
   const r=await fetchImpl(new URL(f.path,u).href,{cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});
   const validMime=mimeOK(f.path,r.headers.get('content-type')||'');
   if(!r.ok){checks[index]={file:f.path,status:r.status,matchesStaged:false,mimeOK:validMime};continue;}
   const bytes=await readLimited(r,Math.max(f.bytes,1024));
   checks[index]={file:f.path,status:r.status,mimeOK:validMime,matchesStaged:validMime&&bytes.byteLength===f.bytes&&await sha256(bytes)===f.sha256};
  }catch(e){checks[index]={file:f.path,status:null,matchesStaged:false,error:e.message==='BODY_LIMIT'?'BODY_LIMIT':'NETWORK_OR_TIMEOUT'};}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }}
 await Promise.all([worker(),worker(),worker()]);
 return {checkedAt:new Date().toISOString(),total:files.length,passed:checks.filter(c=>c.matchesStaged).length,ok:checks.every(c=>c.matchesStaged),checks,scope:'Static bundle consistency only; not VWorld authentication, geometry or survey accuracy.'};
}
export async function checkHostedBundle(base,options={}) {
 const u=baseURL(base),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 let manifest;
 try{const r=await (options.fetchImpl||fetch)(new URL('integrity.json',u),{cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});if(!r.ok)throw Error('MANIFEST_UNAVAILABLE');manifest=JSON.parse(new TextDecoder().decode(await readLimited(r,65536)));}
 finally{clearTimeout(timer);}
 return verifyBundle(u.href,manifest,options);
}
