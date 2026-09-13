// Isolated adapter lifecycle fixtures ONLY. No real SDK response or building data.
import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';
import {frameHTML} from './bridge.mjs';
function fixture({sync=true,networkError=false,missingSDK=false,throwAt=null,adapterError=false}={}){
 const sent=[],timers=new Map(),listeners={},moves=[];let serial=0,destroyed=0,removed=0;
 const parent={postMessage:m=>sent.push(m)};
 const viewer={scene:{canvas:{},globe:{},renderError:{addEventListener:()=>()=>removed++}},entities:{add(){}},camera:{flyTo:x=>moves.push(x)}};
 const C={ScreenSpaceEventHandler:class{constructor(){if(adapterError)throw Error('TEST-ONLY-SECRET');}setInputAction(){}destroy(){destroyed++;}},ScreenSpaceEventType:{LEFT_CLICK:1},Math:{toRadians:n=>n*Math.PI/180},Cartesian3:{fromDegrees:(...x)=>x}};
 const win={Cesium:C,ws3d:{},__JEJU_SDK_LOADED__:!networkError,__JEJU_SDK_FAILED__:networkError};
 const becomeReady=()=>{win.ws3d.viewer=viewer;win.vw.ws3dInitCallBack();};
 const setup=()=>win.vw={Map:class{constructor(){if(throwAt==='construct')throw new TypeError('TEST-ONLY-SECRET');}setOption(){if(throwAt==='configure')throw new TypeError('TEST-ONLY-SECRET');}setMapId(){}setInitPosition(){}start(){if(throwAt==='start')throw new TypeError('TEST-ONLY-SECRET');if(sync)becomeReady();}},CameraPosition:class{},CoordZ:class{},Direction:class{}};
 if(!missingSDK)setup();
 const script=[...frameHTML({key:'TEST-ONLY-NOT-A-REAL-KEY-00000',channel:'fixture-channel-123',origin:'https://kokoom94-ai.github.io'}).matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
 vm.runInNewContext(script,{window:win,parent,addEventListener:(n,f)=>(listeners[n]??=[]).push(f),setInterval:f=>{timers.set(++serial,f);return serial;},clearInterval:id=>timers.delete(id)});
 return {sent,timers,moves,becomeReady,setup,tick:()=>[...timers.values()].forEach(f=>f()),hide:()=>listeners.pagehide.forEach(f=>f()),get destroyed(){return destroyed;},get removed(){return removed;},message:d=>listeners.message?.forEach(f=>f({source:parent,origin:'https://kokoom94-ai.github.io',data:{channel:'fixture-channel-123',type:'fly',position:d}}))};
}
test('synchronous adapter initialization does not leak its polling timer',()=>{const f=fixture();assert.equal(f.timers.size,0);assert.equal(f.sent.filter(m=>m.type==='sdk-ready').length,1);});
test('asynchronous adapter initialization cancels its poll',()=>{const f=fixture({sync:false});assert.equal(f.timers.size,1);f.becomeReady();assert.equal(f.timers.size,0);});
test('pagehide destroys adapter handlers and prevents late initialization',()=>{const f=fixture();f.hide();assert.equal(f.destroyed,1);assert.equal(f.removed,1);const g=fixture({sync:false});g.hide();g.becomeReady();assert(!g.sent.some(m=>m.type==='sdk-ready'));assert.equal(g.timers.size,0);});
test('script network failure emits an error without a viewer success',()=>{const f=fixture({networkError:true});assert.equal(f.sent.find(m=>m.type==='error').code,'SDK_NETWORK_FAILED');assert(!f.sent.some(m=>m.type==='sdk-ready'));});
test('a loaded script without SDK classes does not mark viewer ready',()=>{const f=fixture({missingSDK:true});assert(f.sent.some(m=>m.phase==='script-loaded'));assert(!f.sent.some(m=>m.type==='error'));for(let i=0;i<240;i++)f.tick();assert(f.sent.some(m=>m.code==='SDK_UNAVAILABLE'));assert(!f.sent.some(m=>m.type==='sdk-ready'));});
test('camera fixture accepts overhead view and rejects out-of-area movement',()=>{const f=fixture();f.message({lon:126.52,lat:33.51,height:500,pitch:-90});assert.equal(f.moves[0].orientation.pitch,-Math.PI/2);f.message({lon:127,lat:37,height:500});assert.equal(f.moves.length,1);});

test('delayed SDK classes wait instead of immediately reporting SDK_UNAVAILABLE',()=>{const f=fixture({missingSDK:true});for(let i=0;i<20;i++)f.tick();assert(!f.sent.some(m=>m.type==='error'));f.setup();f.tick();assert.equal(f.sent.filter(m=>m.type==='sdk-ready').length,1);assert.equal(f.timers.size,0);});
for(const [step,code,phase] of [['construct','SDK_MAP_CONSTRUCTION_FAILED','map-construct'],['configure','SDK_OPTIONS_FAILED','map-configure'],['start','SDK_START_FAILED','map-start-requested']])test('distinct diagnostic for '+step,()=>{const f=fixture({throwAt:step});const error=f.sent.find(m=>m.type==='error');assert.equal(error.code,code);assert.equal(error.diagnostic.stage,phase);assert.equal(error.diagnostic.exceptionName,'TypeError');assert(!JSON.stringify(f.sent).includes('TEST-ONLY-SECRET'));assert(!f.sent.some(m=>m.type==='sdk-ready'));});
test('app adapter failure is not an official SDK initialization failure',()=>{const f=fixture({adapterError:true});assert(f.sent.some(m=>m.type==='sdk-ready'));assert(f.sent.some(m=>m.type==='adapter-warning'));assert(!f.sent.some(m=>m.type==='error'));assert(!JSON.stringify(f.sent).includes('TEST-ONLY-SECRET'));});
test('cancel while waiting for delayed API prevents late SDK creation',()=>{const f=fixture({missingSDK:true});f.hide();f.setup();f.tick();assert.equal(f.timers.size,0);assert(!f.sent.some(m=>m.type==='sdk-ready'));});
