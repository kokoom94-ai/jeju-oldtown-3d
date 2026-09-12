// Simulated animation clock, not a physical-device performance measurement.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const script=fs.readFileSync(new URL('preview-hook.js',import.meta.url),'utf8');
function fixture(){
 const handlers={},messages=[],parent={postMessage:m=>messages.push(m)},window={};let callback,clock=0;
 const state={renderer:{yaw:0,avatar:{visible:true}},keys:new Set(),joystick:[0,0],selected:null};
 const context={URLSearchParams,location:{search:'?embed=flight',origin:'https://preview.example'},parent,window,state,document:{hidden:false},performance:{now:()=>clock},addEventListener:(n,f)=>(handlers[n]??=[]).push(f),requestAnimationFrame:f=>callback=f};
 vm.runInNewContext(script,context);
 const tick=now=>{clock=now;callback(now);};
 const send=(enabled,origin=context.location.origin)=>handlers.message.forEach(f=>f({source:parent,origin,data:{channel:'jeju-osm-preview-v1',type:'orbit',enabled}}));
 return {state,messages,tick,send};
}
test('comparison orbit uses elapsed time even on a low-frame-rate renderer',()=>{
 const f=fixture();f.tick(1000);f.send(true);f.tick(1700);assert(Math.abs(f.state.renderer.yaw-.049)<1e-9);
});
test('comparison orbit stops without moving the camera on later frames',()=>{
 const f=fixture();f.tick(1000);f.send(true);f.tick(1700);f.send(false);const yaw=f.state.renderer.yaw;f.tick(2700);assert.equal(f.state.renderer.yaw,yaw);
});
test('untrusted origin cannot start comparison orbit',()=>{
 const f=fixture();f.tick(1000);f.send(true,'https://other.example');f.tick(1700);assert.equal(f.state.renderer.yaw,0);
});
