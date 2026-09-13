import {loadPublicConnection} from './public-connection.mjs';
import {mountSDKFrame} from './sdk-frame-host.mjs';
import {SDK_PHASES,errorCode,errorText,cleanSDKDiagnostic,connectionReport} from './sdk-diagnostics.mjs';
import {installAtlasUI} from './atlas-ui.mjs';
import {validateKey,frameHTML,initialState,transition} from './bridge.mjs';
import {hostPolicy,PLANNED_URL,SETTINGS_URL,cleanObject,cleanProperties,VERSION} from './session.mjs';
import {parsePlaceSeed} from './places.mjs';
import {readView,shareView} from './view.mjs';
export const SCENES=Object.freeze([
 {id:'gwandeok',name:'관덕정',title:'관덕정과 오래된 제주',district:'삼도동',tag:'HISTORY',lon:126.52155,lat:33.51325,height:700,description:'관덕정에서 제주목 관아까지. 원도심의 중심을 위에서 살펴보세요.'},
 {id:'dongmun',name:'동문시장',title:'골목이 모이는 동문시장',district:'일도동',tag:'MARKET',lon:126.5266,lat:33.5114,height:700,description:'시장과 주변 골목의 배치를 먼저 살펴보세요. 개별 점포 정보는 아직 없습니다.'},
 {id:'sanjicheon',name:'산지천',title:'도시를 잇는 물길',district:'일도동',tag:'RIVERSIDE',lon:126.52885,lat:33.5134,height:800,description:'산지천 주변에서 해안으로 이어지는 도시의 윤곽을 둘러보세요.'},
 {id:'tapdong',name:'탑동',title:'도시가 바다를 만나는 곳',district:'건입동',tag:'SEASIDE',lon:126.5282,lat:33.51935,height:1100,description:'탑동광장과 해안 일대의 관계를 한눈에. 지형과 실제 시설은 검증 전입니다.'},
 {id:'yongduam',name:'용두암·용연',title:'제주의 서쪽 해안',district:'용담동',tag:'COASTLINE',lon:126.5129,lat:33.5154,height:1000,description:'용두암과 용연 일대의 위치를 살펴보세요. 바위의 실제 외형을 재현한 모델은 아닙니다.'},
 {id:'airport',name:'공항 주변',title:'여행이 시작되는 곳',district:'제주국제공항',tag:'ARRIVAL',lon:126.4936,lat:33.5062,height:2200,description:'공항은 조감으로만 확인합니다. 활주로·계류장·제한구역을 걷는 기능은 제공하지 않습니다.'}
]);
const $=s=>document.querySelector(s),preview=$('#preview'),provider=$('#provider'),policy=hostPolicy(location.href);
let cancelSDK=null;
let publisherConfigured=false,navigationStatus=null,walkStatus={active:false,code:'IDLE'};
let state=initialState(),source='preview',channel=null,timeout=null,toastTimer=null,tourTimer=null,previewTimer=null,previewReady=false,orbit=false,places=[],category='all',scene=SCENES[0],distance=scene.height,pitch=-50;
let markersVisible=true,lightQuality=true;
const shared=readView(location.hash,SCENES.map(s=>s.id));
if(shared){scene={...SCENES.find(s=>s.id===shared.scene),height:shared.range};distance=shared.range;pitch=shared.pitch;}
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function toast(t){clearTimeout(toastTimer);$('#toast').textContent=t;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,5500);}
function stopTour(){clearInterval(tourTimer);tourTimer=null;$('#tour').textContent='▷ 자동 둘러보기';$('#tour').setAttribute('aria-pressed','false');}
function emit(type,extra={}){
 if(source==='provider'&&channel&&state.sdkReady)provider.contentWindow.postMessage({channel,type,...extra},location.origin);
 if(source==='preview'&&previewReady)preview.contentWindow.postMessage({channel:'jeju-osm-preview-v1',type,...extra},location.origin);
}
function setOrbit(enabled){if(enabled&&!previewReady&&!state.sdkReady){toast('지도가 준비된 뒤 사용할 수 있습니다.');return;}orbit=enabled;emit('orbit',{enabled});$('#orbit').setAttribute('aria-pressed',String(enabled));}
function go(p=scene,{manual=true}={}){
 // Scene buttons use the supported flight presets; free-drag state remains continuous.
 if(![-90,-50,-25].includes(pitch))pitch=-50;
 if(manual)stopTour();setOrbit(false);scene=p;distance=p.height;
 $('#scene-name').textContent=p.title||p.name;$('#scene-description').textContent=p.description||'등록 장소의 좌표와 출입구는 검증 전입니다.';
 // All visible copy below is Korean; provider coordinates remain unverified.
 if(!p.description)$('#scene-description').textContent='등록된 장소의 위치를 조감합니다. 실제 건물·출입구 매칭은 검증 전입니다.';
 $('#scene-district').textContent=p.district||'제주시 원도심';$('#view-distance').textContent='관찰 거리 '+Math.round(distance).toLocaleString()+' m';
 for(const b of $('#scene-list').children)b.setAttribute('aria-pressed',String(b.dataset.id===p.id));
 emit('fly',{position:{lon:p.lon,lat:p.lat,height:distance,pitch,heading:0}});syncControls();
}
function syncControls(){
 $('#oblique').setAttribute('aria-pressed',String(pitch===-50));$('#overhead').setAttribute('aria-pressed',String(pitch===-90));$('#low-angle').setAttribute('aria-pressed',String(pitch===-25));
 $('#markers').setAttribute('aria-pressed',String(markersVisible));$('#quality').setAttribute('aria-pressed',String(lightQuality));$('#quality').disabled=source!=='preview'&&!state.sdkReady;
 $('#walk-start').disabled=!state.sdkReady;$('#drag-mode').disabled=!state.sdkReady&&!previewReady;
 atlas?.render();
}
function applyExtras(){emit('markers',{visible:markersVisible});if(source==='preview')emit('quality',{light:lightQuality});else if(state.sdkReady)emit('aerial-control',{action:'quality',value:lightQuality});syncControls();}
function updateView(){syncControls();setOrbit(false);if(navigationStatus){emit('navigation-angle',{pitch});return;}$('#view-distance').textContent='관찰 거리 '+Math.round(distance).toLocaleString()+' m';emit('fly',{position:{lon:scene.lon,lat:scene.lat,height:distance,pitch,heading:0}});}
function showPlace(p){go({...p,height:600});$('#detail').hidden=false;$('#detail-name').textContent=p.name;$('#detail-address').textContent=p.address;$('#detail-note').textContent='좌표 초안 · 실제 건물·출입구·운영 정보 미검증';$('#naver').hidden=false;$('#naver').href='https://map.naver.com/p/search/'+encodeURIComponent('제주 '+p.name);$('#places-panel').hidden=true;$('#open-places').setAttribute('aria-expanded','false');}
function renderPlaces(){
 const q=$('#search').value.trim();$('#places-list').replaceChildren();
 for(const p of places.filter(p=>(category==='all'||p.category===category)&&p.name.includes(q))){const b=document.createElement('button');b.type='button';b.textContent=p.name;const s=document.createElement('small');s.textContent=p.address;b.append(s);b.onclick=()=>showPlace(p);$('#places-list').append(b);}
 if(!$('#places-list').children.length){const p=document.createElement('p');p.className='muted';p.textContent='일치하는 등록 장소가 없습니다.';$('#places-list').append(p);}
}
function teardown(keepEvidence=false){navigationStatus=null;walkStatus={active:false,code:'IDLE'};document.body.classList.remove('walking');$('#walk-hud').hidden=true;cancelSDK?.();cancelSDK=null;clearTimeout(timeout);timeout=null;channel=null;provider.removeAttribute('srcdoc');provider.src='about:blank';provider.hidden=true;state=initialState();if(!keepEvidence)atlas.reset();setOrbit(false);stopTour();$('#api-key').value='';}
function startPreview(){
 teardown();$('#api-key').disabled=!policy.canConnect;$('#connect').disabled=!policy.canConnect;$('#connect-status').textContent='';source='preview';document.body.dataset.source='preview';previewReady=false;preview.hidden=false;preview.src='legacy/preview-flight.html?embed=flight&v=3.8.0';$('#loading').hidden=false;
 $('#loading b').textContent='제주를 펼치는 중';$('#loading>span').textContent='OSM 윤곽 비교 화면을 불러옵니다.';
 $('#source-label').textContent='OSM 비교 화면 · 높이·외관 추정';$('#footnote').textContent='비교 화면: OSM 건물 윤곽 · 높이 대부분 추정 · 평면 지형';$('#credit').hidden=false;
 clearTimeout(previewTimer);previewTimer=setTimeout(()=>{if(!previewReady){$('#loading b').textContent='비교 지도를 불러오지 못했습니다';$('#loading>span').textContent='WebGL 지원·네트워크를 확인하거나 연결 진단 화면을 이용하세요.';}},45000);
}
function showConnectionError(message,code='SDK_INIT_FAILED',diagnostic=state.diagnostic){
 const evidence=connectionReport({...state,failureCode:code,diagnostic});
 teardown(true);state={...transition(state,'error'),...evidence};source='error';document.body.dataset.source='error';$('#source-label').textContent='원본 연결 실패 · '+state.failureCode;$('#loading').hidden=false;$('#loading b').textContent='실제 원본 수신은 확인되지 않았습니다';$('#loading>span').textContent=message;$('#connect-status').textContent=message;$('#connect').disabled=!policy.canConnect;$('#api-key').disabled=!policy.canConnect;$('#connect-dialog').showModal();showSDKStage();
}
function showSDKStage(){
 const d=cleanSDKDiagnostic(state.diagnostic);
 $('#sdk-stage').textContent='연결 모듈 '+VERSION+' · '+(d.stage?SDK_PHASES[d.stage]:'요청 전')+(state.failureCode?' · '+state.failureCode:'');
}
function safeConnectionReport(){return {version:VERSION,serviceUrl:policy.canConnect?new URL(location.pathname,location.origin).href:PLANNED_URL,hostMode:policy.mode,...connectionReport(state),sdkReady:state.sdkReady===true,aerial:atlas.status};}
$('#copy-connection-error').onclick=async()=>{
 const text=JSON.stringify(safeConnectionReport(),null,2);
 try{await navigator.clipboard.writeText(text);toast('키를 제외한 연결 정보를 복사했습니다.');}
 catch{$('#connection-error-copy').hidden=false;$('#connection-error-copy').value=text;$('#connection-error-copy').select();}
};

for(const s of SCENES){const b=document.createElement('button');b.type='button';b.dataset.id=s.id;b.setAttribute('aria-pressed',String(s===scene));const small=document.createElement('small');small.textContent=s.tag;const name=document.createElement('strong');name.textContent=s.name;b.append(small,name);b.onclick=()=>{$('#detail').hidden=true;go(s);};$('#scene-list').append(b);}
$('#pages-settings').href=SETTINGS_URL;
$('#host-message').textContent=policy.canConnect?'전용 / 로컬 접속. 등록 서비스 URL: '+PLANNED_URL:'이 주소는 키 없는 공개 비교 화면입니다. 인증키 입력은 차단됩니다. Pages 게시 후 '+PLANNED_URL+'explore.html 에서 연결하세요.';
$('#api-key').disabled=!policy.canConnect;$('#connect').disabled=!policy.canConnect;$('#confirmed').disabled=!policy.canConnect;
$('#open-connect').onclick=()=>{stopTour();setOrbit(false);$('#connect-dialog').showModal();};
$('#close-connect').onclick=()=>{$('#api-key').value='';$('#connect-dialog').close();};$('#connect-dialog').addEventListener('cancel',()=>{$('#api-key').value='';});
$('#source-info').onclick=()=>$('#about-dialog').showModal();$('#close-about').onclick=()=>$('#about-dialog').close();
$('#open-places').onclick=()=>{const open=$('#places-panel').hidden;$('#places-panel').hidden=!open;$('#open-places').setAttribute('aria-expanded',String(open));if(open)$('#search').focus();};$('#close-places').onclick=()=>{$('#places-panel').hidden=true;$('#open-places').setAttribute('aria-expanded','false');$('#open-places').focus();};
$('#close-detail').onclick=()=>$('#detail').hidden=true;$('#search').oninput=renderPlaces;
for(const b of document.querySelectorAll('[data-category]'))b.onclick=()=>{category=b.dataset.category;for(const x of document.querySelectorAll('[data-category]'))x.setAttribute('aria-pressed',String(x===b));renderPlaces();};
$('#oblique').onclick=()=>{pitch=-50;stopTour();updateView();$('#oblique').setAttribute('aria-pressed','true');$('#overhead').setAttribute('aria-pressed','false');};$('#overhead').onclick=()=>{pitch=-90;stopTour();updateView();$('#oblique').setAttribute('aria-pressed','false');$('#overhead').setAttribute('aria-pressed','true');};
$('#zoom-in').onclick=()=>{if(navigationStatus){stopTour();emit('navigation-zoom',{direction:1});return;}stopTour();distance=Math.max(150,distance/1.4);updateView();};$('#zoom-out').onclick=()=>{if(navigationStatus){stopTour();emit('navigation-zoom',{direction:-1});return;}stopTour();distance=Math.min(6000,distance*1.4);updateView();};
$('#orbit').onclick=()=>{stopTour();setOrbit(!orbit);};
$('#tour').onclick=()=>{if(tourTimer){stopTour();setOrbit(false);return;}if(source==='error'||(!previewReady&&!state.sdkReady)){toast('지도가 준비된 뒤 사용할 수 있습니다.');return;}if(reduced){toast('기기의 동작 줄이기 설정이 켜져 있습니다. 장소 버튼으로 직접 이동하세요.');return;}
 let index=SCENES.findIndex(s=>s.id===scene.id);const next=()=>{index=(index+1)%SCENES.length;go(SCENES[index],{manual:false});};next();tourTimer=setInterval(next,7500);$('#tour').textContent='Ⅱ 둘러보기 정지';$('#tour').setAttribute('aria-pressed','true');};
$('#low-angle').onclick=()=>{stopTour();pitch=-25;updateView();};
$('#markers').onclick=()=>{markersVisible=!markersVisible;applyExtras();};
$('#quality').onclick=()=>{if(source!=='preview'&&!state.sdkReady)return;lightQuality=!lightQuality;applyExtras();};
$('#share-view').onclick=()=>{stopTour();setOrbit(false);try{
 const link=shareView(location.href,{scene:scene.id,range:distance,pitch},SCENES.map(s=>s.id));
 $('#share-link').value=link;$('#share-status').textContent='';$('#share-dialog').showModal();
}catch{toast('개별 장소 대신 아래 6개 조망 지점을 선택하면 장면을 공유할 수 있습니다.');}};
$('#close-share').onclick=()=>$('#share-dialog').close();
$('#copy-share').onclick=async()=>{try{await navigator.clipboard.writeText($('#share-link').value);$('#share-status').textContent='공유 주소를 복사했습니다.';}catch{$('#share-link').focus();$('#share-link').select();$('#share-status').textContent='주소를 선택했습니다. 기기의 복사 기능을 이용하세요.';}};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('이 브라우저는 전체 화면 기능을 지원하지 않습니다.');}catch{toast('전체 화면을 시작하지 못했습니다.');}};
$('#disconnect').onclick=()=>{startPreview();$('#connect-dialog').close();toast('원본 연결을 종료하고 추정형 비교 화면을 선택했습니다.');};$('#resume-preview').onclick=()=>{startPreview();$('#connect-dialog').close();};
function beginConnection(key,imagery){
 if(!policy.canConnect||state.state==='loading'||state.sdkReady)throw Error('Connection unavailable');key=validateKey(key);
  clearTimeout(previewTimer);stopTour();setOrbit(false);preview.src='about:blank';preview.hidden=true;previewReady=false;source='provider';document.body.dataset.source='provider';
  channel=crypto.randomUUID();state=transition(initialState(),'loading');
  const html=frameHTML({key,channel,origin:location.origin,places,imagery});key='';$('#api-key').value='';$('#api-key').disabled=true;$('#connect').disabled=true;
  provider.hidden=false;state.diagnostic={stage:'frame-loading'};state.timeline=['frame-loading'];cancelSDK=mountSDKFrame(provider,html,code=>showConnectionError(errorText(code,state.diagnostic),code));showSDKStage();$('#source-label').textContent='브이월드 SDK 요청 중 · 제주 모델 확인 전';$('#footnote').textContent='공식 원본 모드 · 건물·지붕·지형·보행 정확도 검증 전';$('#credit').hidden=true;
  $('#loading').hidden=false;$('#loading b').textContent='공식 원본에 연결 중';$('#loading>span').textContent='브이월드가 인증키와 서비스 주소를 확인합니다.';$('#connect-dialog').close();
  timeout=setTimeout(()=>showConnectionError(errorText('SDK_INIT_TIMEOUT',state.diagnostic),'SDK_INIT_TIMEOUT'),80000);
}
$('#connect-form').onsubmit=e=>{
 e.preventDefault();try{
  if(!policy.canConnect)throw Error('공유 호스트에서는 키 입력과 SDK 요청을 차단합니다.');
  if(state.state==='loading'||state.sdkReady)throw Error('기존 연결을 종료한 뒤 다시 연결하세요.');
  let key=validateKey($('#api-key').value);if(!$('#confirmed').checked)throw Error('본인 서비스 키·등록 주소·3D API 권한 확인이 필요합니다.');
  beginConnection(key,$('#use-imagery').checked);
 }catch(err){$('#api-key').value='';if(source==='provider'&&state.state==='loading')showConnectionError('원본 연결 요청을 시작하지 못했습니다.');else $('#connect-status').textContent=err.message;}
};
addEventListener('message',e=>{
 if(e.origin!==location.origin)return;const d=e.data;
 if(((e.source===preview.contentWindow&&d?.channel==='jeju-osm-preview-v1'&&source==='preview')||(channel&&e.source===provider.contentWindow&&d?.channel===channel))&&d.type==='navigation-state'&&d.navigation){
  const n=d.navigation;if([n.lon,n.lat,n.height,n.heading,n.pitch].every(Number.isFinite)&&n.lon>=126.462&&n.lon<=126.575&&n.lat>=33.468&&n.lat<=33.536){navigationStatus={lon:n.lon,lat:n.lat,height:n.height,heading:n.heading,pitch:n.pitch,mode:n.mode==='pan'?'pan':'orbit'};distance=n.height;pitch=n.pitch;$('#view-distance').textContent='관찰 거리 '+Math.round(n.height).toLocaleString()+' m · '+Math.round(n.heading)+'°';$('#drag-mode').textContent=n.mode==='pan'?'드래그: 이동':'드래그: 360° 회전';}return;
 }
 if(e.source===preview.contentWindow&&d?.channel==='jeju-osm-preview-v1'&&source==='preview'){
  if(d.type==='ready'){clearTimeout(previewTimer);previewReady=true;$('#loading').hidden=true;go(scene);applyExtras();}
  if(d.type==='error'){$('#loading').hidden=false;$('#loading b').textContent='비교 화면을 시작하지 못했습니다';$('#loading>span').textContent='WebGL·그래픽 메모리·브라우저 설정을 확인하세요.';}
  if(d.type==='place'){const p=places.find(p=>p.id===d.id);if(p)showPlace(p);}
  if(d.type==='orbit'){orbit=d.enabled===true;$('#orbit').setAttribute('aria-pressed',String(orbit));}
  if(d.type==='interaction'){stopTour();orbit=false;$('#orbit').setAttribute('aria-pressed','false');}
  return;
 }
 if(!channel||e.source!==provider.contentWindow||d?.channel!==channel)return;
 if(d.type==='sdk-ready'&&state.state==='loading'){clearTimeout(timeout);state=transition(state,'sdk-ready');$('#loading').hidden=true;$('#source-label').textContent='브이월드 뷰어 초기화 · 제주 원본 객체 확인 전';go(scene);applyExtras();}
 if(d.type==='sdk-diagnostic'){state.diagnostic=cleanSDKDiagnostic(d.diagnostic);showSDKStage();}
 if(d.type==='sdk-phase'&&Object.hasOwn(SDK_PHASES,d.phase)){state.timeline=[...(state.timeline||[]),d.phase].slice(-20);state.diagnostic={...state.diagnostic,stage:d.phase};showSDKStage();}
 if(d.type==='error'){const code=errorCode(d.code),detail=cleanSDKDiagnostic(d.diagnostic||state.diagnostic);showConnectionError(errorText(code,detail),code,detail);return;}
 if(d.type==='adapter-warning'&&['flight','aerial','selection','places','navigation','walking'].includes(d.feature)){toast('SDK 뷰어와 별개로 앱 기능 연결 실패: '+d.feature+' · 원본 정확도 미검증');}

 if(d.type==='walk-state'&&d.walk&&typeof d.walk.active==='boolean'){
  const w=d.walk,codes={IDLE:'대기',LOADING:'보행 데이터를 확인 중입니다.',READY:'WASD / 방향키 이동 · 드래그 시선 회전',WALKING:'이동 중 · 현장 길찾기 아님',STOPPED:'조감도로 돌아왔습니다.',OUTSIDE_EXPERIMENT_AREA:'이 지역은 보행 범위 밖입니다. 공항·용담은 조감만 제공합니다.',NO_PEDESTRIAN_CENTERLINE:'75m 안에 사용 가능한 보행 중심선이 없습니다.',GROUND_NOT_READY:'수신된 지형·표면 고도가 부족합니다. 가까이 확대한 뒤 다시 시도하세요.',SURFACE_BLOCKED:'표면과 충돌해 진입하지 않습니다.',OUTSIDE_CORRIDOR_OR_FOOTPRINT:'보행선 밖이거나 건물 윤곽에 닿아 멈췄습니다.',STEP_TOO_STEEP:'단차가 커 멈췄습니다.',WALK_UNAVAILABLE:'이 SDK 환경에서는 거리 시점을 시작하지 못했습니다.'};
  if(!Object.hasOwn(codes,w.code))return;
  walkStatus={active:w.active,code:w.code,cameraMode:w.cameraMode==='eye-level'?'eye-level':'third-person',distance:Number.isFinite(w.distance)?Math.max(0,w.distance):0};document.body.classList.toggle('walking',w.active);$('#walk-hud').hidden=!w.active;$('#walk-status').textContent=codes[w.code]+(w.active?' · '+walkStatus.distance.toFixed(1)+' m':'');$('#walk-start-status').textContent=codes[w.code];if(!w.active&&!['STOPPED','IDLE','LOADING'].includes(w.code))toast(codes[w.code]);
 }

 if(d.type==='aerial-status')atlas.update(d.status);
 if(d.type==='aerial-unavailable')atlas.unavailable(d.feature);
 if(d.type==='flight-state'){orbit=d.orbit===true;$('#orbit').setAttribute('aria-pressed',String(orbit));}
 if(d.type==='flight-interaction'){stopTour();setOrbit(false);}
 if(d.type==='flight-unavailable'){setOrbit(false);toast('이 SDK 환경에서는 자동 회전을 사용할 수 없습니다. 드래그로 둘러보세요.');}
 if(d.type==='place'&&state.sdkReady){const p=places.find(p=>p.id===d.id);if(p)showPlace(p);}
 if(d.type==='model-picked'&&state.sdkReady){const object=cleanObject(d);if(!object)return;state=transition(state,'model-picked');$('#source-label').textContent='제공기관 3D 객체 관찰 · 실제 형상 일치 미검증';$('#detail').hidden=false;$('#detail-name').textContent='선택한 원본 3D 객체';$('#detail-address').textContent=cleanProperties(object.properties).map(p=>p.join(': ')).slice(0,5).join(' / ')||'제공기관이 공개한 속성이 없습니다.';$('#detail-note').textContent='원본 객체 선택 기록입니다. 높이·지붕·지형의 실제 일치 여부를 증명하지 않습니다.';$('#naver').hidden=true;}
});
addEventListener('pagehide',()=>{clearTimeout(previewTimer);clearTimeout(toastTimer);teardown();});document.addEventListener('visibilitychange',()=>{if(document.hidden){stopTour();setOrbit(false);}});
addEventListener('keydown',e=>{if(e.key==='Escape'){stopTour();setOrbit(false);}});
Object.defineProperty(window,'__JEJU_EXPLORER__',{value:{get status(){return {version:VERSION,source,state:state.state,sdkReady:state.sdkReady,modelSelections:state.modelSelections,previewReady,placeCount:places.length,scene:scene.id,distance,pitch,orbit,tourRunning:!!tourTimer,markersVisible,lightQuality,canConnect:policy.canConnect,connection:connectionReport(state),productionReady:false,walkingEnabled:false,experimentalWalk:walkStatus,navigation:navigationStatus,publisherConfigured,aerial:atlas.status};}}});
const atlas=installAtlasUI({getState:()=>({source,sdkReady:state.sdkReady,connection:connectionReport(state)}),emit,toast,openConnect:()=>$('#open-connect').click(),north:()=>{stopTour();if(navigationStatus)emit('navigation-north');else updateView();toast('선택 지점을 북쪽 기준으로 정렬했습니다.');}});
try{const r=await fetch('places.json');if(!r.ok)throw Error('PLACES_UNAVAILABLE');places=parsePlaceSeed(await r.text());renderPlaces();}catch{toast('장소 목록을 불러오지 못했습니다. 지도와 연결 진단은 별도로 확인하세요.');}
$('#drag-mode').onclick=()=>{const mode=navigationStatus?.mode==='pan'?'orbit':'pan';emit('navigation-mode',{mode});$('#drag-mode').textContent=mode==='pan'?'드래그: 이동':'드래그: 360° 회전';};
$('#clean-view').onclick=()=>{document.body.classList.toggle('clean-view');$('#clean-view').setAttribute('aria-pressed',String(document.body.classList.contains('clean-view')));};
$('#walk-start').onclick=()=>{$('#walk-dialog').showModal();$('#walk-start-status').textContent='현재 조망 중심 주변의 보행선을 확인합니다.';};
$('#walk-close').onclick=()=>$('#walk-dialog').close();$('#walk-confirm').onclick=()=>{stopTour();setOrbit(false);emit('walk-start');$('#walk-dialog').close();};$('#walk-exit').onclick=()=>emit('walk-stop');
for(const b of document.querySelectorAll('[data-walk-camera]'))b.onclick=()=>emit('walk-camera',{mode:b.dataset.walkCamera});
for(const b of document.querySelectorAll('[data-walk-key]')){b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);emit('walk-key',{code:b.dataset.walkKey,pressed:true});};const up=()=>emit('walk-key',{code:b.dataset.walkKey,pressed:false});b.onpointerup=up;b.onpointercancel=up;b.onlostpointercapture=up;}
const parentKeys=new Set();
addEventListener('keydown',e=>{if(!walkStatus.active||document.querySelector('dialog[open]')||/INPUT|TEXTAREA/.test(e.target.tagName))return;if(e.code==='Escape'){emit('walk-stop');return;}if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){parentKeys.add(e.code);emit('walk-key',{code:e.code,pressed:true});e.preventDefault();}});
addEventListener('keyup',e=>{if(parentKeys.delete(e.code)){emit('walk-key',{code:e.code,pressed:false});e.preventDefault();}});addEventListener('blur',()=>{for(const code of parentKeys)emit('walk-key',{code,pressed:false});parentKeys.clear();});
let publicConfig;try{publicConfig=await loadPublicConnection(location.href);}catch{publicConfig={enabled:false};toast('운영자 자동 연결 설정을 읽지 못했습니다. 직접 연결은 사용할 수 있습니다.');}
if(publicConfig.enabled){publisherConfigured=true;$('#publisher-status').textContent='운영자 키 자동 연결 · 방문자 입력 불필요';try{beginConnection(publicConfig.apiKey,publicConfig.imagery);}catch{showConnectionError('자동 연결을 시작하지 못했습니다. 연결 진단을 확인하세요.');}finally{publicConfig.apiKey='';}}
else{startPreview();$('#publisher-status').textContent='운영자 자동 연결 미설정 · 지금은 직접 연결';}
publicConfig=null;go(scene);syncControls();showSDKStage();

