// Build-time insertion in the isolated legacy comparison entry; never in provider code.
if(new URLSearchParams(location.search).get('embed')==='flight'&&parent!==window){
  const origin=location.origin;let orbit=false,orbitStarted=0,orbitYaw=0,announced=false,ended=false;
  const send=(type,extra={})=>parent.postMessage({channel:'jeju-osm-preview-v1',type,...extra},origin);
  Object.defineProperty(window,'__JEJU_FLIGHT_PREVIEW__',{value:{get status(){const r=state.renderer;return {ready:!!r,mode:state.mode,distance:r?.distance,pitch:r?.pitch,yaw:r?.yaw,target:r?[...r.target]:null,cameraPosition:r?.camera?.position?.toArray?.()||null,cameraQuaternion:r?.camera?.quaternion?.toArray?.()||null,avatarVisible:r?.avatar.visible,walkingEnabled:false,highQuality:r?.highQuality,markersVisible:!document.querySelector('#map-labels')?.hidden};}}});
  // Override only the embedded comparison's gestures, not standalone legacy walking.
  let dragMode='orbit',bound=false,travel=0,clickUntil=0,pressedMarker=null;
  const fingers=new Map();
  function navState(){const r=state.renderer;if(!r?.target)return null;const ll=C.ungeo(r.target[0],r.target[2]);return {lon:ll[0],lat:ll[1],height:r.distance,pitch:-r.pitch*180/Math.PI,heading:((-r.yaw*180/Math.PI)%360+360)%360,mode:dragMode};}
  function navNotice(){const n=navState();if(n)send('navigation-state',{navigation:n});}
  function bindGestures(){
    if(bound||typeof canvas==='undefined'||!canvas?.addEventListener)return;bound=true;canvas.style.touchAction='none';
    const gestureSurface=document.querySelector('#stage')||canvas;
    const capture=(name,fn,extra={})=>gestureSurface.addEventListener(name,fn,{capture:true,...extra}),consume=e=>{e.preventDefault();e.stopImmediatePropagation();};
    capture('pointerdown',e=>{if(e.button>2)return;consume(e);stop();send('interaction');travel=0;pressedMarker=e.button===0?e.target.closest?.('.poi-marker'):null;fingers.set(e.pointerId,{x:e.clientX,y:e.clientY,button:e.button,shift:e.shiftKey});canvas.focus({preventScroll:true});try{canvas.setPointerCapture(e.pointerId);}catch{}});
    capture('pointermove',e=>{const old=fingers.get(e.pointerId),r=state.renderer;if(!old||!r)return;consume(e);const dx=e.clientX-old.x,dy=e.clientY-old.y,before=[...fingers.values()];travel+=Math.hypot(dx,dy);fingers.set(e.pointerId,{...old,x:e.clientX,y:e.clientY});
      if(fingers.size===2){const after=[...fingers.values()],dist=a=>Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y),d0=dist(before),d1=dist(after);if(d0>3&&d1>3)r.distance=clamp(r.distance*d0/d1,10,10000);const angle=a=>Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x);let d=angle(after)-angle(before);r.yaw+=Math.atan2(Math.sin(d),Math.cos(d));r.pitch=clamp(r.pitch-dy*.002,.035,1.52);}
      else if((dragMode==='pan'&&old.button===0)||(dragMode==='orbit'&&(old.button!==0||old.shift||e.shiftKey))){const scale=r.distance/Math.max(canvas.clientHeight,300),a=-r.yaw;r.target[0]-=(dx*Math.cos(a)+dy*Math.sin(a))*scale;r.target[2]-=(dx*Math.sin(a)-dy*Math.cos(a))*scale;const ll=C.ungeo(r.target[0],r.target[2]),xz=geo(clamp(ll[0],126.462,126.575),clamp(ll[1],33.468,33.536));r.target[0]=xz[0];r.target[2]=xz[1];}
      else{r.yaw+=dx*.34*Math.PI/180;r.pitch=clamp(r.pitch-dy*.23*Math.PI/180,.035,1.52);}
      if(travel>4)clickUntil=performance.now()+400;navNotice();
    });
    const up=e=>{if(!fingers.has(e.pointerId))return;consume(e);fingers.delete(e.pointerId);if(travel>4)clickUntil=performance.now()+400;else if(e.type==='pointerup'&&pressedMarker){const hit=[...pinElements].find(([id,el])=>el===pressedMarker);if(hit)send('place',{id:hit[0]});}pressedMarker=null;};for(const n of ['pointerup','pointercancel','lostpointercapture'])capture(n,up);
    capture('wheel',e=>{consume(e);stop();send('interaction');state.renderer.distance=clamp(state.renderer.distance*Math.exp(clamp(e.deltaY,-800,800)*.001),10,10000);navNotice();},{passive:false});capture('click',e=>{if(performance.now()<clickUntil||e.target.closest?.('.poi-marker'))consume(e);});capture('contextmenu',consume);addEventListener('blur',()=>fingers.clear());
  }

  const stop=()=>{orbit=false;send('orbit',{enabled:false});};
  addEventListener('pagehide',()=>{ended=true;orbit=false;},{once:true});
  addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','KeyE','Slash','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();}},true);
  addEventListener('pointerdown',()=>{stop();send('interaction');},true);
  addEventListener('message',e=>{
    if(e.source!==parent||e.origin!==origin||e.data?.channel!=='jeju-osm-preview-v1'||!state.renderer)return;
    const d=e.data,r=state.renderer;
    if(d.type==='fly'){
      const p=d.position;if(!p||![p.lon,p.lat,p.height].every(Number.isFinite)||p.lon<126.462||p.lon>126.575||p.lat<33.468||p.lat>33.536||p.height<100||p.height>10000||![-90,-50,-25].includes(p.pitch))return;
      stop();stopRoute(false);setMode('overview');r.focus(geo(p.lon,p.lat),p.height);r.pitch=p.pitch===-90?1.5:p.pitch===-25?.44:.87;r.yaw=(p.heading||0)*Math.PI/180;r.avatar.visible=false;
      send('camera',{lon:p.lon,lat:p.lat,distance:p.height,pitch:p.pitch});navNotice();
    }
    if(d.type==='orbit'&&typeof d.enabled==='boolean'){orbit=d.enabled;orbitStarted=performance.now();orbitYaw=r.yaw;send('orbit',{enabled:orbit});}
    if(d.type==='navigation-mode'&&['orbit','pan'].includes(d.mode)){dragMode=d.mode;navNotice();}
    if(d.type==='navigation-north'){stop();r.yaw=0;navNotice();}
    if(d.type==='navigation-angle'&&[-90,-50,-25].includes(d.pitch)){stop();r.pitch=Math.min(1.52,-d.pitch*Math.PI/180);navNotice();}
    if(d.type==='navigation-zoom'&&[-1,1].includes(d.direction)){stop();r.distance=clamp(r.distance*(d.direction>0?1/1.4:1.4),10,10000);navNotice();}
    if(d.type==='quality'&&typeof d.light==='boolean'){r.highQuality=!d.light;r.renderer.shadowMap.enabled=!d.light;r.renderer.shadowMap.needsUpdate=true;r.resize();}
    if(d.type==='markers'&&typeof d.visible==='boolean')document.querySelector('#map-labels').hidden=!d.visible;
  });
  function tick(now){
    if(ended)return;const r=state.renderer;
    if(r){bindGestures();r.avatar.visible=false;state.keys.clear();state.joystick=[0,0];if(state.selected){send('place',{id:state.selected});state.selected=null;}if(!announced){announced=true;send('ready',{source:'osm-estimated',productionReady:false});}
      if(orbit&&!document.hidden)r.yaw=orbitYaw+Math.max(0,now-orbitStarted)*0.00007;
    }else if(document.querySelector('#fatal')?.hidden===false){send('error');return;}
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
