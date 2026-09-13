import {hostPolicy} from './session.mjs';
// Keep a real HTTPS document URL while retaining parser-inserted SDK script loading.
// This does not alter, forge or bypass provider authentication.
let used=false;
try{
 const parentURL=parent.location.href;
 if(parent!==window&&hostPolicy(parentURL).canConnect&&new URL(parentURL).origin===location.origin){
  const nonce=crypto.randomUUID(),origin=location.origin;
  const receive=e=>{
   if(used||e.source!==parent||e.origin!==origin||e.data?.type!=='jeju-sdk-frame-render'||e.data?.nonce!==nonce)return;
   if(!hostPolicy(parent.location.href).canConnect)return;
   let html=e.data.html;
   if(typeof html!=='string'||html.length>500000||!html.startsWith('<!doctype html>'))return;
   used=true;removeEventListener('message',receive);
   // Called inside this actual document, not from a srcdoc/blank parent context.
   document.open();document.write(html);document.close();html='';
  };
  addEventListener('message',receive);
  parent.postMessage({type:'jeju-sdk-frame-ready',nonce},origin);
 }
}catch{/* A cross-origin or unapproved parent receives no handshake and no key. */}
