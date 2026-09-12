import {checkHostedBundle} from './integrity.mjs';
// Representative coordinates from existing draft POIs. No boundary/entrance assertions.
export const CHECKPOINTS=Object.freeze([
 {id:'gwandeok',name:'관덕정',lon:126.52155,lat:33.51325,height:450},
 {id:'dongmun',name:'동문시장',lon:126.5266,lat:33.5114,height:500},
 {id:'sanjicheon',name:'산지천',lon:126.52885,lat:33.5134,height:450},
 {id:'tapdong',name:'탑동광장',lon:126.5282,lat:33.51935,height:650},
 {id:'cju',name:'공항 주변',lon:126.4936,lat:33.5062,height:1500}
]);
export const PHASES=Object.freeze({'sdk-requested':'SDK 요청','script-loaded':'SDK 스크립트 수신','map-start-requested':'지도 시작 요청','viewer-ready':'뷰어 초기화','model-picked':'3D 객체 선택','error':'연결 오류','disconnect':'연결 종료'});
export function recordPhase(log,name,at=Date.now()){
 if(!Object.hasOwn(PHASES,name)||!Number.isFinite(at)||at<0||at>8640000000000000)return log;
 return [...log.slice(-19),{phase:name,at:new Date(at).toISOString()}];
}
export function cameraPosition(id,mode='oblique'){
 const p=CHECKPOINTS.find(p=>p.id===id);if(!p)throw Error('UNKNOWN_CHECKPOINT');
 if(!['oblique','overhead'].includes(mode))throw Error('UNKNOWN_VIEW');
 return {lon:p.lon,lat:p.lat,height:p.height,pitch:mode==='overhead'?-90:-50};
}
export function environmentProbe(win=window,doc=document){
 let webgl=0,gl;try{const canvas=doc.createElement('canvas');gl=canvas.getContext('webgl2');if(gl)webgl=2;else{gl=canvas.getContext('webgl');if(gl)webgl=1;}gl?.getExtension('WEBGL_lose_context')?.loseContext();}catch{}
 return {checkedAt:new Date().toISOString(),secureContext:win.isSecureContext===true,webgl,fetchAvailable:typeof win.fetch==='function',cryptoAvailable:typeof win.crypto?.subtle?.digest==='function',geometryVerified:false};
}
export function mountInspection({getState,fly,notice}){
 let log=[],environment=null,integrity=null,current='gwandeok';
 const doc=document,el=doc.createElement('details');el.id='inspection-panel';el.open=true;
 const summary=doc.createElement('summary');summary.textContent='연결 점검 · 우선 확인 지점';el.append(summary);
 const progress=doc.createElement('p');progress.id='connection-progress';progress.setAttribute('aria-live','polite');el.append(progress);
 const row=doc.createElement('div');row.className='row';
 const envButton=doc.createElement('button');envButton.id='check-environment';envButton.type='button';envButton.textContent='기기 지원 점검';
 const filesButton=doc.createElement('button');filesButton.id='check-bundle';filesButton.type='button';filesButton.textContent='게시 파일 점검';row.append(envButton,filesButton);el.append(row);
 const result=doc.createElement('p');result.id='inspection-result';result.setAttribute('aria-live','polite');el.append(result);
 const label=doc.createElement('label');label.htmlFor='inspection-view';label.textContent='원본 지도의 카메라 각도';el.append(label);
 const angle=doc.createElement('select');angle.id='inspection-view';for(const [value,text] of [['oblique','항공 3D 시점'],['overhead','수직 지도 시점']]){const o=doc.createElement('option');o.value=value;o.textContent=text;angle.append(o);}el.append(angle);
 const points=doc.createElement('div');points.className='row';points.id='inspection-checkpoints';el.append(points);
 function go(){if(!getState().sdkReady)return;fly(cameraPosition(current,angle.value));notice('원본 확인 지점으로 이동 요청했습니다. 좌표는 초안이며, 공항 보행·높이·형상 검증을 뜻하지 않습니다.');}
 for(const p of CHECKPOINTS){const b=doc.createElement('button');b.type='button';b.textContent=p.name;b.dataset.checkpoint=p.id;b.addEventListener('click',()=>{current=p.id;go();update();});points.append(b);}
 angle.addEventListener('change',go);
 const caution=doc.createElement('p');caution.textContent='공항은 위에서 보기만 지원합니다. 정밀 배경의 3인칭 도보·제한구역 차단은 미구현이며 보행은 활성화하지 않습니다.';el.append(caution);
 doc.querySelector('#connect-form').after(el);
 envButton.addEventListener('click',()=>{environment=environmentProbe();result.textContent='보안 접속 '+(environment.secureContext?'확인':'미지원')+' · WebGL '+(environment.webgl||'미지원')+' · 실제 지도 연결은 별도 확인';});
 filesButton.addEventListener('click',async()=>{filesButton.disabled=true;result.textContent='현재 사이트의 정적 파일 일치 여부를 확인합니다. 브이월드에는 요청하지 않습니다.';
  try{const base=new URL('./',location.href);base.search='';base.hash='';integrity=await checkHostedBundle(base.href);result.textContent='게시 파일 '+integrity.passed+'/'+integrity.total+'개 일치 · 실제 건물 정확도 검증과 별개';}
  catch{integrity={ok:false,error:'BUNDLE_CHECK_UNAVAILABLE'};result.textContent='게시 파일 점검 실패. 사이트 게시 상태·네트워크를 확인하세요.';}
  finally{filesButton.disabled=false;}
 });
 function update(){for(const b of points.children){b.disabled=!getState().sdkReady;b.setAttribute('aria-pressed',String(b.dataset.checkpoint===current));}angle.disabled=!getState().sdkReady;progress.textContent=log.length?log.map(e=>PHASES[e.phase]).join(' → '):'SDK 요청 전 · 원본 객체 미확인';}
 update();
 return {update,phase(name){if(name==='sdk-requested')log=[];log=recordPhase(log,name);update();},report(){return {environment,staticBundle:integrity,connectionTimeline:log.map(e=>({...e})),selectedCheckpoint:current,requestedView:angle.value,walkingEnabled:false,geometryVerified:false};}};
}
