// Mouse/touch orbit about a geographic anchor. No model/terrain synthesis.
// Self-contained: serialized into the real same-origin VWorld SDK document.
export function installNavigation(viewer, C, send, beforeInput = () => {}) {
  const canvas = viewer.scene.canvas, camera = viewer.camera;
  if (!canvas?.addEventListener || !camera?.lookAt || !C.HeadingPitchRange) return null;
  const controller = viewer.scene.screenSpaceCameraController;
  const previousInputs = controller?.enableInputs, previousTouch = canvas.style.touchAction;
  if (controller) controller.enableInputs = false;
  canvas.style.touchAction = 'none';canvas.tabIndex = 0;
  let enabled=true, destroyed=false, mode='orbit', moved=0, suppressUntil=0;
  let p={lon:126.52155,lat:33.51325,height:700,pitch:-50,heading:0};
  const pointers=new Map(), listeners=[];
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const valid=q=>q&&[q.lon,q.lat,q.height].every(Number.isFinite)&&q.lon>=126.462&&q.lon<=126.575&&q.lat>=33.468&&q.lat<=33.536;
  const on=(target,type,fn,opts)=>{target.addEventListener(type,fn,opts);listeners.push(()=>target.removeEventListener(type,fn,opts));};
  function state(){return {...p,heading:((p.heading%360)+360)%360,mode,enabled};}
  function notify(){send('navigation-state',{navigation:state()});}
  function apply(){
    let h=0;try{const v=viewer.scene.globe.getHeight(C.Cartographic.fromDegrees(p.lon,p.lat));if(Number.isFinite(v))h=v;}catch{}
    // A zero camera anchor is not a claim about terrain availability.
    camera.lookAt(C.Cartesian3.fromDegrees(p.lon,p.lat,h),new C.HeadingPitchRange(C.Math.toRadians(p.heading),C.Math.toRadians(p.pitch),p.height));
    camera.lookAtTransform?.(C.Matrix4.IDENTITY);viewer.scene.requestRender?.();notify();
  }
  function stopMotion(){beforeInput();camera.cancelFlight?.();}
  function rotate(dx,dy){p.heading=(p.heading-dx*0.34)%360;p.pitch=clamp(p.pitch+dy*0.23,-89.5,-2);}
  function pan(dx,dy){
    const scale=p.height/Math.max(canvas.clientHeight,300),r=p.heading*Math.PI/180;
    p.lon=clamp(p.lon-(dx*Math.cos(r)+dy*Math.sin(r))*scale/92800,126.462,126.575);
    p.lat=clamp(p.lat+(dx*Math.sin(r)-dy*Math.cos(r))*scale/111320,33.468,33.536);
  }
  on(canvas,'pointerdown',e=>{
    if(!enabled||destroyed||e.button>2)return;
    stopMotion();moved=0;canvas.focus({preventScroll:true});
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,button:e.button,shift:e.shiftKey});
    try{canvas.setPointerCapture(e.pointerId);}catch{}e.preventDefault();
  });
  on(canvas,'pointermove',e=>{
    const old=pointers.get(e.pointerId);if(!enabled||!old)return;
    const dx=e.clientX-old.x,dy=e.clientY-old.y;moved+=Math.hypot(dx,dy);
    const before=[...pointers.values()];pointers.set(e.pointerId,{...old,x:e.clientX,y:e.clientY});
    if(pointers.size===2){
      const after=[...pointers.values()],dist=a=>Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),d0=dist(before),d1=dist(after);
      if(d0>3&&d1>3)p.height=clamp(p.height*d0/d1,10,10000);
      const angle=a=>Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x);
      let da=angle(after)-angle(before);da=Math.atan2(Math.sin(da),Math.cos(da));p.heading-=da*180/Math.PI;
      p.pitch=clamp(p.pitch+dy*0.12,-89.5,-2);
    }else if(pointers.size===1){
      const usePan=(mode==='pan'&&old.button===0)||(mode==='orbit'&&(old.button===2||old.shift||e.shiftKey||old.button===1));
      if(usePan)pan(dx,dy);else rotate(dx,dy);
    }
    if(moved>4)suppressUntil=performance.now()+400;
    apply();e.preventDefault();
  });
  const up=e=>{pointers.delete(e.pointerId);if(moved>4)suppressUntil=performance.now()+400;};
  on(canvas,'pointerup',up);on(canvas,'pointercancel',up);on(canvas,'lostpointercapture',up);
  on(canvas,'contextmenu',e=>{if(enabled)e.preventDefault();});
  on(canvas,'wheel',e=>{if(!enabled||destroyed)return;e.preventDefault();stopMotion();p.height=clamp(p.height*Math.exp(clamp(e.deltaY,-800,800)*0.001),10,10000);apply();},{passive:false});
  on(window,'blur',()=>pointers.clear());
  return {
    setTarget(q){if(!valid(q))return false;p={lon:q.lon,lat:q.lat,height:clamp(q.height,10,10000),pitch:clamp(Number.isFinite(q.pitch)?q.pitch:-50,-89.5,-2),heading:Number.isFinite(q.heading)?q.heading:0};notify();return true;},
    setMode(value){if(!['orbit','pan'].includes(value))return false;mode=value;notify();return true;},
    setEnabled(value){enabled=!!value;pointers.clear();notify();},
    get state(){return state();},
    suppressClick(){return performance.now()<suppressUntil;},
    destroy(){if(destroyed)return;destroyed=true;for(const off of listeners)off();pointers.clear();if(controller)controller.enableInputs=previousInputs;canvas.style.touchAction=previousTouch;}
  };
}
