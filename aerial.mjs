// Official WMTS imagery on the provider's terrain. No generated city geometry.
import {validateKey} from './bridge.mjs?v=3.7.1';
export function satelliteTemplate(key){return 'https://api.vworld.kr/req/wmts/1.0.0/'+validateKey(key)+'/Satellite/{z}/{y}/{x}.jpeg';}
export function emptyAerial(){return {mode:'original',lighting:'day',imageryRequested:0,imageryDecoded:0,imageryFailed:0,terrainProvider:false,groundSample:null,modelTilesObserved:0,frames:0,fps:0,sourceDate:null,geometryVerified:false,productionReady:false};}
// Self-contained: serialized into the isolated SDK iframe. Only public Cesium APIs.
export function installAerial(viewer,C,map,tileURL,send){
 const s={mode:tileURL?'satellite':'original',lighting:'day',imageryRequested:0,imageryDecoded:0,imageryFailed:0,terrainProvider:false,groundSample:null,modelTilesObserved:0,frames:0,fps:0,sourceDate:null,geometryVerified:false,productionReady:false};
 const removers=[],sets=new Set(),native=[];let layer=null,disposed=false,last=0,frameBase=0,light=false,buildings=true;
 const clamp=n=>Math.max(0,Math.min(1000000,Math.floor(Number(n)||0)));
 const emit=()=>{if(!disposed)send('aerial-status',{status:{...s,imageryRequested:clamp(s.imageryRequested),imageryDecoded:clamp(s.imageryDecoded),imageryFailed:clamp(s.imageryFailed),modelTilesObserved:clamp(s.modelTilesObserved),frames:clamp(s.frames),buildingsVisible:buildings,lightQuality:light,satelliteAvailable:!!layer}});};
 const listen=(event,fn)=>{if(event?.addEventListener){const off=event.addEventListener(fn);if(typeof off==='function')removers.push(off);}};
 function mode(value){
  if(!['original','satellite'].includes(value)||value==='satellite'&&!layer)return false;
  s.mode=value;for(const [item,visible] of native)item.show=value==='original'?visible:false;
  if(layer)layer.show=value==='satellite';viewer.scene.requestRender?.();emit();return true;
 }
 function quality(value){if(typeof value!=='boolean')return false;light=value;viewer.resolutionScale=value?.7:1;
  if(viewer.scene.globe)viewer.scene.globe.maximumScreenSpaceError=value?3:1.5;
  for(const item of sets)item.maximumScreenSpaceError=value?24:12;viewer.scene.requestRender?.();emit();return true;}
 function building(value){if(typeof value!=='boolean')return false;try{const item=map.getLayerElement?.('facility_build');if(!item||typeof item[value?'show':'hide']!=='function')return false;item[value?'show':'hide']();buildings=value;emit();return true;}catch{return false;}}
 function lighting(value){if(!['day','sunset','night'].includes(value)||!C.JulianDate?.fromDate||!viewer.clock)return false;
  // Fixed light-study date in KST. This does not alter the capture date or photo shadows.
  const hour={day:'12:00',sunset:'18:30',night:'21:00'}[value];viewer.clock.currentTime=C.JulianDate.fromDate(new Date('2026-09-12T'+hour+':00+09:00'));viewer.clock.shouldAnimate=false;
  viewer.scene.globe.enableLighting=value!=='day';s.lighting=value;viewer.scene.requestRender?.();emit();return true;}
 function scan(collection,depth=0){
  if(depth>3||!collection?.get||!Number.isInteger(collection.length))return;
  for(let i=0;i<Math.min(collection.length,500);i++){const item=collection.get(i);if(C.Cesium3DTileset&&item instanceof C.Cesium3DTileset){
   if(sets.has(item))continue;sets.add(item);item.maximumScreenSpaceError=light?24:12;
   const seen=new WeakSet();listen(item.tileVisible,tile=>{if(!tile||typeof tile!=='object'||seen.has(tile))return;seen.add(tile);s.modelTilesObserved++;});
  }else scan(item,depth+1);}
 }
 try{
  const imagery=viewer.imageryLayers;
  if(tileURL&&imagery?.addImageryProvider&&C.UrlTemplateImageryProvider&&C.Rectangle){
   for(let i=0;i<imagery.length;i++)native.push([imagery.get(i),imagery.get(i).show]);
   const p=new C.UrlTemplateImageryProvider({url:tileURL,rectangle:C.Rectangle.fromDegrees(126.462,33.468,126.575,33.536),minimumLevel:0,maximumLevel:19,credit:'항공·위성영상 © 공간정보 오픈플랫폼 브이월드 · 촬영일 미확인'});
   const original=p.requestImage;
   p.requestImage=function(...args){
    let pending;try{pending=original.apply(this,args);}catch{ s.imageryFailed++;throw new Error('IMAGERY_REQUEST_FAILED');}
    if(!pending)return pending;s.imageryRequested++;
    return Promise.resolve(pending).then(image=>{if(!disposed){const w=image?.naturalWidth||image?.width,h=image?.naturalHeight||image?.height;if(w>0&&h>0){s.imageryDecoded++;}else s.imageryFailed++;}return image;},()=>{if(!disposed)s.imageryFailed++;throw new Error('IMAGERY_REQUEST_FAILED');});
   };
   listen(p.errorEvent,()=>{if(!disposed)emit();});
   layer=imagery.addImageryProvider(p);mode('satellite');
  }else if(tileURL){s.mode='unavailable';send('aerial-unavailable',{feature:'satellite'});}
 }catch{s.mode='unavailable';send('aerial-unavailable',{feature:'satellite'});}
 listen(viewer.scene.postRender,()=>{
  if(disposed)return;s.frames++;const now=Date.now();if(now-last<1000)return;
  if(last)s.fps=Math.round((s.frames-frameBase)*1000/(now-last));last=now;frameBase=s.frames;
  scan(viewer.scene.primitives);
  const t=viewer.terrainProvider||viewer.scene.globe?.terrainProvider;
  s.terrainProvider=!!t&&!(C.EllipsoidTerrainProvider&&t instanceof C.EllipsoidTerrainProvider);
  s.groundSample=null;
  if(s.terrainProvider&&C.Cartographic?.fromDegrees){try{const h=viewer.scene.globe.getHeight?.(C.Cartographic.fromDegrees(126.52155,33.51325));if(Number.isFinite(h))s.groundSample=Math.round(h*100)/100;}catch{}}
  emit();
 });
 emit();
 return {mode,quality,building,lighting,report:()=>({...s}),destroy(){disposed=true;for(const off of removers)off();for(const [item,visible] of native)item.show=visible;if(layer)viewer.imageryLayers?.remove?.(layer,true);sets.clear();}};
}
export function cleanAerial(value){
 const d=value&&typeof value==='object'?value:{},s=emptyAerial();
 for(const k of ['imageryRequested','imageryDecoded','imageryFailed','modelTilesObserved','frames','fps'])s[k]=Number.isFinite(d[k])?Math.max(0,Math.min(1000000,Math.floor(d[k]))):0;
 s.lighting=['day','sunset','night'].includes(d.lighting)?d.lighting:'day';
 s.mode=['original','satellite','unavailable'].includes(d.mode)?d.mode:'original';s.terrainProvider=d.terrainProvider===true;s.groundSample=s.terrainProvider&&Number.isFinite(d.groundSample)&&Math.abs(d.groundSample)<10000?d.groundSample:null;
 s.satelliteAvailable=d.satelliteAvailable===true;s.buildingsVisible=d.buildingsVisible!==false;s.lightQuality=d.lightQuality===true;
 return s;
}
