// Isolated adapter lifecycle fixtures ONLY. No real SDK response or building data.
import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';
import {frameHTML} from './bridge.mjs';
function fixture({sync=true,networkError=false,missingSDK=false}={}){
 const sent=[],timers=new Map(),listeners={},moves=[];let serial=0,destroyed=0,removed=0;
 const parent={postMessage:m=>sent.push(m)};
 const viewer={scene:{canvas:{},globe:{},renderError:{addEventListener:()=>()=>removed++}},entities:{add(){}},camera:{flyTo:x=>moves.push(x)}};
 const C={ScreenSpaceEventHandler:class{setInputAction(){}destroy(){destroyed++;}},ScreenSpaceEventType:{LEFT_CLICK:1},Math:{toRadians:n=>n*Math.PI/180},Cartesian3:{fromDegrees:(...x)=>x}};
 const win={Cesium:C,ws3d:{},__JEJU_SDK_LOADED__:!networkError,__JEJU_SDK_FAILED__:networkError};
 const becomeReady=()=>{win.ws3d.viewer=viewer;win.vw.ws3dInitCallBack();};
 if(!missingSDK)win.vw={Map:class{setOption(){}start(){if(sync)becomeReady();}},CameraPosition:class{},CoordZ:class{},Direction:class{}};
 const script=[...frameHTML({key:'TEST-ONLY-NOT-A-REAL-KEY-00000',channel:'fixture-channel-123',origin:'https://kokoom94-ai.github.io'}).matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
 vm.runInNewContext(script,{window:win,parent,addEventListener:(n,f)=>(listeners[n]??=[]).push(f),setInterval:f=>{timers.set(++serial,f);return serial;},clearInterval:id=>timers.delete(id)});
 return {sent,timers,moves,becomeReady,hide:()=>listeners.pagehide.forEach(f=>f()),get destroyed(){return destroyed;},get removed(){return removed;},message:d=>listeners.message?.forEach(f=>f({source:parent,origin:'https://kokoom94-ai.github.io',data:{channel:'fixture-channel-123',type:'fly',position:d}}))};
}
test('synchronous adapter initialization does not leak its polling timer',()=>{const f=fixture();assert.equal(f.timers.size,0);assert.equal(f.sent.filter(m=>m.type==='sdk-ready').length,1);});
test('asynchronous adapter initialization cancels its poll',()=>{const f=fixture({sync:false});assert.equal(f.timers.size,1);f.becomeReady();assert.equal(f.timers.size,0);});
test('pagehide destroys adapter handlers and prevents late initialization',()=>{const f=fixture();f.hide();assert.equal(f.destroyed,1);assert.equal(f.removed,1);const g=fixture({sync:false});g.hide();g.becomeReady();assert(!g.sent.some(m=>m.type==='sdk-ready'));assert.equal(g.timers.size,0);});
test('script network failure emits an error without a viewer success',()=>{const f=fixture({networkError:true});assert.equal(f.sent[0].code,'SDK_NETWORK_FAILED');assert(!f.sent.some(m=>m.type==='sdk-ready'));});
test('a loaded script without SDK classes does not mark viewer ready',()=>{const f=fixture({missingSDK:true});assert(f.sent.some(m=>m.phase==='script-loaded'));assert(f.sent.some(m=>m.code==='SDK_UNAVAILABLE'));assert(!f.sent.some(m=>m.type==='sdk-ready'));});
test('camera fixture accepts overhead view and rejects out-of-area movement',()=>{const f=fixture();f.message({lon:126.52,lat:33.51,height:500,pitch:-90});assert.equal(f.moves[0].orientation.pitch,-Math.PI/2);f.message({lon:127,lat:37,height:500});assert.equal(f.moves.length,1);});
