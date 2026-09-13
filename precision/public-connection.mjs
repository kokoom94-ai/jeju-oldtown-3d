// Browser-visible JavaScript key configuration, never treated as a server secret.
export const PUBLIC_SERVICE_URL='https://kokoom94-ai.github.io/jeju-oldtown-3d/';
export function parsePublicConnection(value){
 if(!value||value.schema!==1)throw Error('PUBLIC_CONFIG_INVALID');if(value.enabled===false)return {enabled:false};
 if(value.enabled!==true||value.browserVisibleKey!==true||value.serviceUrl!==PUBLIC_SERVICE_URL||!/^[A-Za-z0-9-]{20,128}$/.test(value.apiKey||''))throw Error('PUBLIC_CONFIG_INVALID');
 return {enabled:true,apiKey:value.apiKey,imagery:value.imagery===true,serviceUrl:PUBLIC_SERVICE_URL};
}
export async function loadPublicConnection(href,fetchImpl=fetch){
 const u=new URL(href),local=['localhost','127.0.0.1','[::1]'].includes(u.hostname),target=new URL('public-connection.json',u);
 if(!local&&(u.origin!=='https://kokoom94-ai.github.io'||target.href!==PUBLIC_SERVICE_URL+'public-connection.json'))return {enabled:false,reason:'HOST_NOT_APPROVED'};
 const r=await fetchImpl(target.href,{cache:'no-store',redirect:'error',credentials:'omit',signal:AbortSignal.timeout(8000)});
 if(r.status===404)return {enabled:false,reason:'PUBLISHER_NOT_CONFIGURED'};
 if(!r.ok||!r.headers.get('content-type')?.includes('application/json'))throw Error('PUBLIC_CONFIG_UNAVAILABLE');
 if(Number(r.headers.get('content-length'))>4096)throw Error('PUBLIC_CONFIG_TOO_LARGE');
 const reader=r.body.getReader();let count=0,parts=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;count+=value.byteLength;if(count>4096){await reader.cancel();throw Error('PUBLIC_CONFIG_TOO_LARGE');}parts.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(count);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
 try{return parsePublicConnection(JSON.parse(new TextDecoder().decode(bytes)));}catch{throw Error('PUBLIC_CONFIG_INVALID');}
}
