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
