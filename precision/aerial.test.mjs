// Explicit in-memory controller fixtures. These are never live SDK/model evidence.
import test from 'node:test';import assert from 'node:assert/strict';
import {satelliteTemplate,emptyAerial,cleanAerial,installAerial} from './aerial.mjs';
import {frameHTML} from './bridge.mjs';
const key='TEST-ONLY-NOT-A-REAL-KEY-00000';
function event(){const callbacks=new Set();return {callbacks,addEventListener(fn){callbacks.add(fn);return ()=>callbacks.delete(fn);},fire(v){for(const fn of callbacks)fn(v);}};}
function fixture({image=()=>Promise.resolve({width:256,height:256}),supportsBuildings=true}={}){
 const messages=[],native={show:true},layers=[native],postRender=event(),tiles=event();let provider,hidden=false;
 class Set3D{tileVisible=tiles;}
 const set=new Set3D();
 const viewer={resolutionScale:1,clock:{},terrainProvider:{},imageryLayers:{get length(){return layers.length;},get:i=>layers[i],addImageryProvider(p){provider=p;const l={show:true};layers.push(l);return l;},remove(l){layers.splice(layers.indexOf(l),1);}},scene:{postRender,globe:{getHeight:()=>14.5},primitives:{length:1,get:()=>set},requestRender(){}}};
 const C={UrlTemplateImageryProvider:class{constructor(o){this.options=o;this.errorEvent=event();}requestImage(...a){return image(...a);}},Rectangle:{fromDegrees:(...a)=>a},Cesium3DTileset:Set3D,Cartographic:{fromDegrees:(...a)=>a},JulianDate:{fromDate:d=>d.toISOString()},EllipsoidTerrainProvider:class{}};
 const map={getLayerElement(name){assert.equal(name,'facility_build');return supportsBuildings?{hide(){hidden=true;},show(){hidden=false;}}:null;}};
 const ctrl=installAerial(viewer,C,map,satelliteTemplate(key),(type,payload)=>messages.push({type,...payload}));
 return {ctrl,viewer,C,postRender,tiles,messages,native,layers,get provider(){return provider;},get hidden(){return hidden;}};
}
test('WMTS template uses only validated own key and official Satellite xyz endpoint',()=>{assert.equal(satelliteTemplate(key),`https://api.vworld.kr/req/wmts/1.0.0/${key}/Satellite/{z}/{y}/{x}.jpeg`);assert.throws(()=>satelliteTemplate('<bad key>'));});
test('initial aerial state certifies nothing',()=>{const s=emptyAerial();assert.equal(s.imageryDecoded,0);assert.equal(s.groundSample,null);assert.equal(s.productionReady,false);});
test('direct iframe requests satellite only when explicitly selected',()=>{const base={key,channel:'unit-channel-37',origin:'https://kokoom94-ai.github.io'};assert(!frameHTML(base).includes('/Satellite/'));assert(frameHTML({...base,imagery:true}).includes('/Satellite/'));});
test('status export discards arbitrary URL, secret, source date and truth promotion',()=>{const s=cleanAerial({key,url:'secret',sourceDate:'2026',geometryVerified:true,productionReady:true,imageryDecoded:3});assert.equal(s.imageryDecoded,3);assert.equal(s.sourceDate,null);assert.equal(s.productionReady,false);assert(!JSON.stringify(s).includes('secret'));});
test('status sanitizes counters, types and impossible terrain sample',()=>{const s=cleanAerial({imageryDecoded:Infinity,frames:-2,terrainProvider:'yes',groundSample:12000,lighting:'evil'});assert.equal(s.imageryDecoded,0);assert.equal(s.frames,0);assert.equal(s.groundSample,null);assert.equal(s.lighting,'day');});
test('imagery construction is not image reception',()=>{const f=fixture();assert.equal(f.ctrl.report().imageryDecoded,0);assert.equal(f.layers.length,2);assert.equal(f.native.show,false);assert.equal(f.provider.options.maximumLevel,19);});
test('decoded image fixture increments only receipt counter, never geometry flags',async()=>{const f=fixture();await f.provider.requestImage(1,1,4);assert.equal(f.ctrl.report().imageryDecoded,1);assert.equal(f.ctrl.report().productionReady,false);assert.equal(f.ctrl.report().geometryVerified,false);});
test('throttled requests are not counted as decoded',()=>{const f=fixture({image:()=>undefined});assert.equal(f.provider.requestImage(),undefined);assert.equal(f.ctrl.report().imageryRequested,0);});
test('rejected imagery errors are sanitized and never turn ready',async()=>{const f=fixture({image:()=>Promise.reject(new Error(key))});await assert.rejects(f.provider.requestImage(),e=>e.message==='IMAGERY_REQUEST_FAILED');assert.equal(f.ctrl.report().imageryDecoded,0);assert.equal(f.ctrl.report().imageryFailed,1);});
test('empty image does not increment decoded counter',async()=>{const f=fixture({image:()=>Promise.resolve({width:0,height:0})});await f.provider.requestImage();assert.equal(f.ctrl.report().imageryDecoded,0);});
test('background toggles preserve native layers and restore their original visibility',()=>{const f=fixture();assert(f.ctrl.mode('original'));assert(f.native.show);assert(!f.layers[1].show);assert(f.ctrl.mode('satellite'));assert(!f.native.show);assert(!f.ctrl.mode('https://evil.test'));});
test('building toggle uses official layer, not synthetic geometry',()=>{const f=fixture();assert(f.ctrl.building(false));assert(f.hidden);assert(f.ctrl.building(true));assert(!f.hidden);});
test('missing official building layer reports unavailable',()=>{const f=fixture({supportsBuildings:false});assert(!f.ctrl.building(false));});
test('quality changes resolution without exaggerating height',()=>{const f=fixture();assert(f.ctrl.quality(true));assert.equal(f.viewer.resolutionScale,.7);assert(!('verticalExaggeration' in f.viewer.scene));assert(!f.ctrl.quality('true'));});
test('lighting uses fixed KST scenario rather than claiming live weather',()=>{const f=fixture();assert(f.ctrl.lighting('sunset'));assert.equal(f.viewer.clock.currentTime,'2026-09-12T09:30:00.000Z');assert.equal(f.viewer.clock.shouldAnimate,false);assert(!f.ctrl.lighting('rain'));});
test('frame, terrain and model observations are distinct and remain unverified',()=>{const f=fixture();f.postRender.fire();f.tiles.fire({});const s=f.ctrl.report();assert.equal(s.groundSample,14.5);assert.equal(s.modelTilesObserved,1);assert.equal(s.imageryDecoded,0);assert(!s.geometryVerified);});
test('flat ellipsoid is not counted as terrain reception',()=>{const f=fixture();f.viewer.terrainProvider=new f.C.EllipsoidTerrainProvider();f.postRender.fire();assert.equal(f.ctrl.report().terrainProvider,false);assert.equal(f.ctrl.report().groundSample,null);});
test('cleanup removes listeners and only owned imagery',()=>{const f=fixture();f.postRender.fire();f.ctrl.destroy();assert.equal(f.postRender.callbacks.size,0);assert.equal(f.tiles.callbacks.size,0);assert.equal(f.layers.length,1);assert(f.native.show);});
test('late image completion after disposal cannot mutate observed receipts',async()=>{let done;const f=fixture({image:()=>new Promise(r=>done=r)});const p=f.provider.requestImage();f.ctrl.destroy();done({width:256,height:256});await p;assert.equal(f.ctrl.report().imageryDecoded,0);});
