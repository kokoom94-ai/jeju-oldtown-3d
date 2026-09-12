// Build-time insertion in the isolated legacy comparison entry; never in provider code.
if(new URLSearchParams(location.search).get('embed')==='flight'&&parent!==window){
  const origin=location.origin;let orbit=false,last=0,announced=false,ended=false;
  const send=(type,extra={})=>parent.postMessage({channel:'jeju-osm-preview-v1',type,...extra},origin);
  Object.defineProperty(window,'__JEJU_FLIGHT_PREVIEW__',{value:{get status(){const r=state.renderer;return {ready:!!r,mode:state.mode,distance:r?.distance,pitch:r?.pitch,yaw:r?.yaw,target:r?[...r.target]:null,avatarVisible:r?.avatar.visible,walkingEnabled:false};}}});
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
      send('camera',{lon:p.lon,lat:p.lat,distance:p.height,pitch:p.pitch});
    }
    if(d.type==='orbit'&&typeof d.enabled==='boolean'){orbit=d.enabled;last=performance.now();send('orbit',{enabled:orbit});}
    if(d.type==='markers'&&typeof d.visible==='boolean')document.querySelector('#map-labels').hidden=!d.visible;
  });
  function tick(now){
    if(ended)return;const r=state.renderer;
    if(r){r.avatar.visible=false;state.keys.clear();state.joystick=[0,0];if(state.selected){send('place',{id:state.selected});state.selected=null;}if(!announced){announced=true;send('ready',{source:'osm-estimated',productionReady:false});}
      if(orbit&&!document.hidden)r.yaw+=(Math.min(100,now-last)||0)*0.00007;
    }else if(document.querySelector('#fatal')?.hidden===false){send('error');return;}
    last=now;requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
