  // Override only the embedded comparison's gestures, not standalone legacy walking.
  let dragMode='orbit',bound=false,travel=0,clickUntil=0;
  const fingers=new Map();
  function navState(){const r=state.renderer;if(!r?.target)return null;const ll=C.ungeo(r.target[0],r.target[2]);return {lon:ll[0],lat:ll[1],height:r.distance,pitch:-r.pitch*180/Math.PI,heading:((-r.yaw*180/Math.PI)%360+360)%360,mode:dragMode};}
  function navNotice(){const n=navState();if(n)send('navigation-state',{navigation:n});}
  function bindGestures(){
    if(bound||typeof canvas==='undefined'||!canvas?.addEventListener)return;bound=true;canvas.style.touchAction='none';
    const capture=(name,fn,extra={})=>canvas.addEventListener(name,fn,{capture:true,...extra}),consume=e=>{e.preventDefault();e.stopImmediatePropagation();};
    capture('pointerdown',e=>{if(e.button>2)return;consume(e);stop();send('interaction');travel=0;fingers.set(e.pointerId,{x:e.clientX,y:e.clientY,button:e.button,shift:e.shiftKey});canvas.focus({preventScroll:true});try{canvas.setPointerCapture(e.pointerId);}catch{}});
    capture('pointermove',e=>{const old=fingers.get(e.pointerId),r=state.renderer;if(!old||!r)return;consume(e);const dx=e.clientX-old.x,dy=e.clientY-old.y,before=[...fingers.values()];travel+=Math.hypot(dx,dy);fingers.set(e.pointerId,{...old,x:e.clientX,y:e.clientY});
      if(fingers.size===2){const after=[...fingers.values()],dist=a=>Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y),d0=dist(before),d1=dist(after);if(d0>3&&d1>3)r.distance=clamp(r.distance*d0/d1,10,10000);const angle=a=>Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x);let d=angle(after)-angle(before);r.yaw+=Math.atan2(Math.sin(d),Math.cos(d));r.pitch=clamp(r.pitch-dy*.002,.035,1.52);}
      else if((dragMode==='pan'&&old.button===0)||(dragMode==='orbit'&&(old.button!==0||old.shift||e.shiftKey))){const scale=r.distance/Math.max(canvas.clientHeight,300),a=-r.yaw;r.target[0]-=(dx*Math.cos(a)+dy*Math.sin(a))*scale;r.target[2]-=(dx*Math.sin(a)-dy*Math.cos(a))*scale;const ll=C.ungeo(r.target[0],r.target[2]),xz=geo(clamp(ll[0],126.462,126.575),clamp(ll[1],33.468,33.536));r.target[0]=xz[0];r.target[2]=xz[1];}
      else{r.yaw+=dx*.34*Math.PI/180;r.pitch=clamp(r.pitch-dy*.23*Math.PI/180,.035,1.52);}
      if(travel>4)clickUntil=performance.now()+400;navNotice();
    });
    const up=e=>{if(!fingers.has(e.pointerId))return;consume(e);fingers.delete(e.pointerId);if(travel>4)clickUntil=performance.now()+400;};for(const n of ['pointerup','pointercancel','lostpointercapture'])capture(n,up);
    capture('wheel',e=>{consume(e);stop();send('interaction');state.renderer.distance=clamp(state.renderer.distance*Math.exp(clamp(e.deltaY,-800,800)*.001),10,10000);navNotice();},{passive:false});capture('click',e=>{if(performance.now()<clickUntil)consume(e);});capture('contextmenu',consume);addEventListener('blur',()=>fingers.clear());
  }
