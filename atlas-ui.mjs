import {emptyAerial,cleanAerial} from './aerial.mjs';
import {VERSION,PLANNED_URL} from './session.mjs';
// UI state contains bounded diagnostics only: no provider URL, key or raw errors.
export function installAtlasUI({getState,emit,toast,openConnect,north}){
 const $=s=>document.querySelector(s);let aerial=emptyAerial(),lighting='day',building=true;
 function render(){const app=getState(),ready=app.sdkReady===true;
  $('#atlas-sdk').textContent=ready?'초기화 관찰':'연결 전';
  $('#atlas-imagery').textContent=aerial.imageryDecoded?`${aerial.imageryDecoded}개 디코딩 · 오류 ${aerial.imageryFailed}`:aerial.imageryRequested?'요청 중 · 디코딩 대기':'수신 미확인';
  $('#atlas-terrain').textContent=aerial.groundSample!==null?`관덕정 표본 ${aerial.groundSample} m · 정확도 미검증`:aerial.terrainProvider?'지형 공급자 있음 · 고도 대기':'지형 수신 미확인';
  $('#atlas-model').textContent=aerial.modelTilesObserved?`${aerial.modelTilesObserved}개 타일 관찰 · 형상 미검증`:'3D 타일 관찰 전';
  $('#atlas-render').textContent=ready?`${aerial.fps} FPS · 현재 브라우저 프레임 측정`:'브이월드 연결 후 측정';
  $('#atlas-context').textContent=app.source==='preview'?'현재는 추정형 비교 모형입니다. 아래 항공영상·지형 수신 상태와 별개입니다.':ready?'원본 보기: 실시간 화면 렌더링입니다. 실시간 촬영 영상이 아닙니다.':'원본 연결을 먼저 확인하세요. 연결 실패 시 추정 모형으로 자동 대체하지 않습니다.';
  for(const b of document.querySelectorAll('[data-aerial-mode]')){b.disabled=!ready||(b.dataset.aerialMode==='satellite'&&!aerial.satelliteAvailable);b.setAttribute('aria-pressed',String(aerial.mode===b.dataset.aerialMode&&ready));}
  for(const b of document.querySelectorAll('[data-lighting]')){b.disabled=!ready;b.setAttribute('aria-pressed',String(lighting===b.dataset.lighting));}
  $('#atlas-buildings').disabled=!ready;$('#atlas-buildings').setAttribute('aria-pressed',String(building));
 }
 $('#open-atlas').onclick=()=>{render();$('#atlas-dialog').showModal();};$('#close-atlas').onclick=()=>$('#atlas-dialog').close();
 $('#atlas-connect').onclick=()=>{$('#atlas-dialog').close();openConnect();};$('#north').onclick=north;
 for(const b of document.querySelectorAll('[data-aerial-mode]'))b.onclick=()=>{if(getState().sdkReady)emit('aerial-control',{action:'mode',value:b.dataset.aerialMode});};
 for(const b of document.querySelectorAll('[data-lighting]'))b.onclick=()=>{if(!getState().sdkReady)return;emit('aerial-control',{action:'lighting',value:b.dataset.lighting});};
 $('#atlas-buildings').onclick=()=>{if(!getState().sdkReady)return;emit('aerial-control',{action:'building',value:!building});};
 $('#atlas-export').onclick=()=>{
  const app=getState(),data={version:VERSION,checkedAt:new Date().toISOString(),serviceUrl:PLANNED_URL,sdkReady:app.sdkReady===true,mode:app.source,aerial:cleanAerial(aerial),geometryVerified:false,productionReady:false,captureDate:null,note:'Runtime observations only. Images may contain baked shadows; lighting is a simulation. No key or provider request URL is included.'};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='JEJU-BEFORE-aerial-diagnostic.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 render();return {update(v){aerial=cleanAerial(v);building=aerial.buildingsVisible;lighting=aerial.lighting;render();},reset(){aerial=emptyAerial();lighting='day';building=true;render();},render,get status(){return cleanAerial(aerial);},unavailable(feature){toast(({satellite:'항공영상 API를 사용할 수 없습니다. 배경지도 권한·네트워크를 확인하세요.',building:'이 SDK에서 건물 레이어 조작을 확인하지 못했습니다.',lighting:'이 SDK에서 조명 조작을 확인하지 못했습니다.'})[feature]||'이 SDK에서 선택한 기능을 사용할 수 없습니다.');}};
}
