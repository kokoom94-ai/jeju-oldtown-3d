// Serialized before the parser-inserted official script. Never stores raw errors, URLs or keys.
export function installBootstrapGuard(channel,origin){
 const state={stage:'bootstrap-requested',exceptionName:null,mapClass:false,coordinateClasses:false,cesium:false,viewer:false,frameDocument:location.protocol==='https:'?'https-page':location.protocol==='http:'?'http-page':location.href==='about:srcdoc'?'srcdoc':'other',webgl:null};
 let failed=false,ready=false;
 const send=(type,payload={})=>parent.postMessage({channel,type,...payload},origin);
 const update=(phase,fields={})=>{state.stage=phase;for(const k of ['mapClass','coordinateClasses','cesium','viewer'])if(typeof fields[k]==='boolean')state[k]=fields[k];send('sdk-diagnostic',{diagnostic:{...state}});};
 const fail=(code,e)=>{if(failed)return;failed=true;state.exceptionName=['Error','TypeError','ReferenceError','SyntaxError','SecurityError','RangeError'].includes(e?.name)?e.name:null;send('error',{code,diagnostic:{...state}});};
 const classify=(text,fallback)=>{
  if(/webgl|webgl2|graphics context|rendering context/i.test(text))return 'ENV_WEBGL_UNAVAILABLE';
  if(/domain|도메인|등록.{0,12}(url|주소)|허용.{0,12}(url|주소)/i.test(text))return 'PROVIDER_DOMAIN_REJECTED';
  if(/인증|권한|api.?key|unauthori[sz]ed|invalid key/i.test(text))return 'PROVIDER_AUTH_REJECTED';
  return fallback;
 };
 const originalAlert=window.alert;
 window.alert=function(message){if(ready){originalAlert.call(window,message);return;}fail(classify(String(message),'PROVIDER_NOTICE'));};
 addEventListener('error',e=>{
  if(ready||failed)return;
  if(e.target?.tagName==='SCRIPT'){
   let primary=false;try{primary=new URL(e.target.src).pathname==='/js/webglMapInit.js.do';}catch{}
   fail(primary?'SDK_NETWORK_FAILED':'SDK_DEPENDENCY_FAILED');return;
  }
  fail(classify(String(e.message||''),'SDK_SCRIPT_ERROR'),e.error);
 },true);
 addEventListener('unhandledrejection',e=>{if(!ready&&!failed)fail(classify(String(e.reason?.message||''),'SDK_SCRIPT_ERROR'),e.reason);});
 try{const c=document.createElement('canvas');let gl=c.getContext('webgl2');state.webgl=gl?2:0;if(!gl){gl=c.getContext('webgl');if(gl)state.webgl=1;}gl?.getExtension('WEBGL_lose_context')?.loseContext();}catch{state.webgl=0;}
 update('bootstrap-requested');
 return {update,fail,get failed(){return failed;},snapshot:()=>({...state}),markReady(){ready=true;update('viewer-ready',{viewer:true});},loaded(){update('script-loaded');}};
}
