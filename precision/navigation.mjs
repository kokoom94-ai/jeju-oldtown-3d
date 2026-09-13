// Direct pointer orbit. Serialized into the real VWorld document; no generated geometry.
export function installNavigation(viewer,C,send,beforeInput=()=>{}){
 const canvas=viewer.scene.canvas,camera=viewer.camera;if(!canvas?.addEventListener||!camera?.lookAt||!C.HeadingPitchRange)return null;
 const ctrl=viewer.scene.screenSpaceCameraController,prev=ctrl?.enableInputs,touch=canvas.style.touchAction;
 const nativeFlags={};if(ctrl){for(const name of ['enableRotate','enableTranslate','enableZoom','enableTilt','enableLook']){nativeFlags[name]=ctrl[name];ctrl[name]=false;}ctrl.enableInputs=false;}canvas.style.touchAction='none';canvas.tabIndex=0;
 let enabled=true,destroyed=false,mode='orbit',moved=0,suppressUntil=0,spinFrame=0,lastSpin=0;
 let p={lon:126.52155,lat:33.51325,height:700,pitch:-50,heading:0};
 const pointers=new Map(),listeners=[],clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const on=(t,n,f,o)=>{t.addEventListener(n,f,o);listeners.push(()=>t.removeEventListener(n,f,o));};
 const valid=q=>q&&[q.lon,q.lat,q.height].every(Number.isFinite)&&q.lon>=126.462&&q.lon<=126.575&&q.lat>=33.468&&q.lat<=33.536;
 const state=()=>({...p,heading:((p.heading%360)+360)%360,mode,enabled});
 const notify=()=>send('navigation-state',{navigation:state()});
 function apply(){let h=0;try{const v=viewer.scene.globe.getHeight(C.Cartographic.fromDegrees(p.lon,p.lat));if(Number.isFinite(v))h=v;}catch{}
  camera.lookAt(C.Cartesian3.fromDegrees(p.lon,p.lat,h),new C.HeadingPitchRange(C.Math.toRadians(p.heading),C.Math.toRadians(p.pitch),p.height));camera.lookAtTransform?.(C.Matrix4.IDENTITY);viewer.scene.requestRender?.();notify();}
 function stopSpin(){if(spinFrame){cancelAnimationFrame(spinFrame);spinFrame=0;send('flight-state',{orbit:false});}}
 function stopMotion(){stopSpin();beforeInput();camera.cancelFlight?.();}
 function spin(now){if(!enabled||destroyed)return;const dt=Math.min(100,Math.max(0,now-lastSpin));lastSpin=now;if(!document.hidden){p.heading=(p.heading+dt*.008)%360;apply();}spinFrame=requestAnimationFrame(spin);}
 on(canvas,'pointerdown',e=>{if(!enabled||destroyed||e.button>2)return;stopMotion();moved=0;canvas.focus({preventScroll:true});pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,button:e.button,shift:e.shiftKey});try{canvas.setPointerCapture(e.pointerId);}catch{}e.preventDefault();});
 on(canvas,'pointermove',e=>{const old=pointers.get(e.pointerId);if(!enabled||!old)return;const dx=e.clientX-old.x,dy=e.clientY-old.y;moved+=Math.hypot(dx,dy);const before=[...pointers.values()];pointers.set(e.pointerId,{...old,x:e.clientX,y:e.clientY});
  if(pointers.size===2){const after=[...pointers.values()],dist=a=>Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),d0=dist(before),d1=dist(after);if(d0>3&&d1>3)p.height=clamp(p.height*d0/d1,10,10000);const angle=a=>Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x);let da=angle(after)-angle(before);p.heading-=Math.atan2(Math.sin(da),Math.cos(da))*180/Math.PI;p.pitch=clamp(p.pitch+dy*.12,-89.5,-2);}
  else if(pointers.size===1){const pan=(mode==='pan'&&old.button===0)||(mode==='orbit'&&(old.button!==0||old.shift||e.shiftKey));if(pan){const scale=p.height/Math.max(canvas.clientHeight,300),r=p.heading*Math.PI/180;p.lon=clamp(p.lon-(dx*Math.cos(r)+dy*Math.sin(r))*scale/92800,126.462,126.575);p.lat=clamp(p.lat+(dx*Math.sin(r)-dy*Math.cos(r))*scale/111320,33.468,33.536);}else{p.heading=(p.heading-dx*.34)%360;p.pitch=clamp(p.pitch+dy*.23,-89.5,-2);}}
  if(moved>4)suppressUntil=performance.now()+400;apply();e.preventDefault();});
 const up=e=>{pointers.delete(e.pointerId);if(moved>4)suppressUntil=performance.now()+400;};for(const n of ['pointerup','pointercancel','lostpointercapture'])on(canvas,n,up);
 on(canvas,'contextmenu',e=>{if(enabled)e.preventDefault();});on(canvas,'wheel',e=>{if(!enabled||destroyed)return;e.preventDefault();stopMotion();p.height=clamp(p.height*Math.exp(clamp(e.deltaY,-800,800)*.001),10,10000);apply();},{passive:false});on(window,'blur',()=>pointers.clear());
 return {setTarget(q){if(!valid(q))return false;stopSpin();p={lon:q.lon,lat:q.lat,height:clamp(q.height,10,10000),pitch:clamp(Number.isFinite(q.pitch)?q.pitch:-50,-89.5,-2),heading:Number.isFinite(q.heading)?q.heading:0};notify();return true;},
 orbit(value){stopSpin();if(!value||!enabled)return;beforeInput();camera.cancelFlight?.();lastSpin=performance.now();spinFrame=requestAnimationFrame(spin);send('flight-state',{orbit:true});},
 angle(value){if(!enabled||![-90,-50,-25].includes(value))return;stopMotion();p.pitch=value===-90?-89.5:value;apply();},
 zoom(direction){if(!enabled)return;stopMotion();p.height=clamp(p.height*(direction>0?1/1.4:1.4),10,10000);apply();},north(){if(!enabled)return;stopMotion();p.heading=0;apply();},
 setMode(value){if(!['orbit','pan'].includes(value))return false;mode=value;notify();return true;},setEnabled(value){if(!value)stopSpin();enabled=!!value;pointers.clear();notify();},get state(){return state();},suppressClick(){return performance.now()<suppressUntil;},
 destroy(){if(destroyed)return;stopSpin();destroyed=true;for(const off of listeners)off();pointers.clear();if(ctrl){ctrl.enableInputs=prev;for(const [name,value] of Object.entries(nativeFlags))ctrl[name]=value;}canvas.style.touchAction=touch;}};
}
