import {hostPolicy} from './session.mjs';
export function mountSDKFrame(frame,html,onFailure){
 if(!hostPolicy(location.href).canConnect)throw Error('Unapproved SDK host');
 const target=new URL('sdk-frame.html?v=3.7.1',location.href);target.hash='';
 let pending=html,done=false,timer;
 const cleanup=()=>{clearTimeout(timer);removeEventListener('message',receive);pending='';done=true;};
 const receive=e=>{
  if(done||e.source!==frame.contentWindow||e.origin!==location.origin||e.data?.type!=='jeju-sdk-frame-ready'||!/^[A-Za-z0-9-]{10,80}$/.test(e.data?.nonce||''))return;
  try{if(frame.contentWindow.location.href!==target.href)return;}catch{return;}
  frame.contentWindow.postMessage({type:'jeju-sdk-frame-render',nonce:e.data.nonce,html:pending},location.origin);cleanup();
 };
 addEventListener('message',receive);
 timer=setTimeout(()=>{if(done)return;cleanup();onFailure('FRAME_LOAD_FAILED');},12000);
 frame.removeAttribute('srcdoc');frame.src=target.href;
 return cleanup;
}
