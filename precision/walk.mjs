// Third-person / eye-level experiment on retained OSM pedestrian centerlines.
// Uses received terrain and loaded-surface samples; never invents ground.
// Does not certify real-world access, complete collision or physical safety.
export function installWalk(viewer,C,send,navigation,stopFlight){
 const canvas=viewer.scene.canvas,listeners=[],entities=[];
 let active=false,loading=false,disposed=false,request=0,guard=null,network=null;
 let point=null,height=null,heading=0,cameraYaw=0,cameraPitch=5,cameraMode='third-person';
 let lastReport=0,forward=0,strafe=0,lastTime=0,raf=0,distance=0,statusCode='IDLE',drag=null,phase=0;
 const keys=new Set(),max=(v,a,b)=>Math.max(a,Math.min(b,v));
 const on=(t,n,f,o)=>{t.addEventListener(n,f,o);listeners.push(()=>t.removeEventListener(n,f,o));};
 function report(code=statusCode){statusCode=code;send('walk-state',{walk:{active,loading,code,cameraMode,distance:Math.round(distance*10)/10,scope:'oldtown-pedestrian-experiment',groundReceived:Number.isFinite(height),collisionVerified:false,publicAccessVerified:false,airportWalkingEnabled:false}});}
 function loadedGround(p){
  if(!viewer.scene.sampleHeightSupported||typeof viewer.scene.sampleHeight!=='function'||viewer.scene.globe.tilesLoaded===false)return null;
  const tp=viewer.terrainProvider||viewer.scene.globe.terrainProvider;
  if(!tp||(C.EllipsoidTerrainProvider&&tp instanceof C.EllipsoidTerrainProvider))return null;
  try{const cart=C.Cartographic.fromDegrees(p[0],p[1]),h=viewer.scene.globe.getHeight(cart);if(!Number.isFinite(h))return null;
   const surface=viewer.scene.sampleHeight(cart,entities,.6);if(!Number.isFinite(surface))return null;
   if(surface-h>.65)return {blocked:true,height:h};return {blocked:false,height:h};
  }catch{return null;}
 }
 function offset(east,north,up){return C.Cartesian3.fromDegrees(point[0]+east/92800,point[1]+north/111320,height+up);}
 function body(){const color=C.Color.fromCssColorString;
  const parts=[['head',0,0,1.58,.15,.14,.17,'#e9c6a3'],['body',0,0,1.08,.23,.14,.34,'#e39256'],['left-arm',-.31,0,1.05,.08,.09,.28,'#e39256'],['right-arm',.31,0,1.05,.08,.09,.28,'#e39256'],['left-leg',-.12,0,.4,.09,.1,.34,'#263947'],['right-leg',.12,0,.4,.09,.1,.34,'#263947'],['pack',0,-.15,1.13,.19,.09,.22,'#263947']];
  for(const part of parts){const e=viewer.entities.add({id:'jeju-traveler:'+part[0],position:offset(0,0,part[3]),ellipsoid:{radii:new C.Cartesian3(part[4],part[5],part[6]),material:color(part[7])}});entities.push(e);e.__jejuPart=part;}
 }
 function drawBody(){const r=heading*Math.PI/180,walking=forward!==0||strafe!==0;
  for(const e of entities){const p=e.__jejuPart,swing=walking&&p[0].includes('leg')?Math.sin(phase)*(p[0].startsWith('left')?1:-1)*.15:0,right=p[1],along=p[2]+swing;
   e.position=offset(right*Math.cos(r)+along*Math.sin(r),-right*Math.sin(r)+along*Math.cos(r),p[3]);e.show=cameraMode==='third-person';
   if(C.Transforms?.headingPitchRollQuaternion&&C.HeadingPitchRoll)e.orientation=C.Transforms.headingPitchRollQuaternion(e.position.getValue?e.position.getValue(viewer.clock.currentTime):e.position,new C.HeadingPitchRoll(r,0,0));
  }
 }
 function camera(){const r=cameraYaw*Math.PI/180,pitch=cameraPitch*Math.PI/180;
  if(cameraMode==='eye-level')viewer.camera.setView({destination:offset(0,0,1.68),orientation:{heading:r,pitch:C.Math.toRadians(max(cameraPitch,-35,25)),roll:0}});
  else{let range=6,up=2.4;
   for(let d=.6;d<=range;d+=.6){const p=[point[0]-Math.sin(r)*d/92800,point[1]-Math.cos(r)*d/111320];try{const h=viewer.scene.sampleHeight(C.Cartographic.fromDegrees(...p),entities,.5);if(!Number.isFinite(h)||h>height+1.25+(up-1.25)*d/6){range=Math.max(.2,d-.6);break;}}catch{range=.2;break;}}
   const dest=offset(-Math.sin(r)*range,-Math.cos(r)*range,up+Math.sin(-pitch)*range);viewer.camera.setView({destination:dest,orientation:{heading:r,pitch:Math.atan2(1.3-(up+Math.sin(-pitch)*range),Math.max(range,.2)),roll:0}});
  }viewer.scene.requestRender?.();
 }
 function vectors(){forward=max((keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),-1,1);strafe=max((keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),-1,1);}
 function tick(now){if(!active||disposed)return;const dt=Math.min(.05,Math.max(0,(now-lastTime)/1000));lastTime=now;
  if((forward||strafe)&&!document.hidden){const length=Math.hypot(forward,strafe),r=cameraYaw*Math.PI/180,step=1.35*dt,dx=(Math.sin(r)*forward+Math.cos(r)*strafe)/length*step,dy=(Math.cos(r)*forward-Math.sin(r)*strafe)/length*step;
   const next=[point[0]+dx/92800,point[1]+dy/111320];let code='WALKING';
   if(!guard.sweep(point,next))code='OUTSIDE_CORRIDOR_OR_FOOTPRINT';
   else{const ground=loadedGround(next);if(!ground)code='GROUND_NOT_READY';else if(ground.blocked)code='SURFACE_BLOCKED';else if(Math.abs(ground.height-height)>.15+step*.7)code='STEP_TOO_STEEP';else{point=next;height=ground.height;distance+=step;phase+=dt*8;heading=Math.atan2(dx,dy)*180/Math.PI;}}
   if(code!==statusCode||now-lastReport>200){lastReport=now;report(code);}
  }drawBody();camera();raf=requestAnimationFrame(tick);
 }
 function stop(){drag=null;request++;active=false;loading=false;cancelAnimationFrame(raf);keys.clear();forward=strafe=0;for(const e of entities)viewer.entities.remove(e);entities.length=0;navigation?.setEnabled(true);report('STOPPED');}
 async function start(target){stop();const id=++request;loading=true;report('LOADING');
  try{if(!target||target.lon<126.517||target.lon>126.536||target.lat<33.508||target.lat>33.522){loading=false;report('OUTSIDE_EXPERIMENT_AREA');return;}
   if(!guard){const res=await fetch(new URL('walk-network.json',location.href),{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(12000)});if(!res.ok)throw Error();const text=await res.text();if(text.length>3000000)throw Error();network=JSON.parse(text);guard=createWalkGuard(network);}
   if(id!==request||disposed)return;
   const nearest=guard.nearest([target.lon,target.lat],75);if(!nearest){loading=false;report('NO_PEDESTRIAN_CENTERLINE');return;}
   const ground=loadedGround(nearest.point);if(!ground||ground.blocked){loading=false;report(ground?'SURFACE_BLOCKED':'GROUND_NOT_READY');return;}
   point=nearest.point;height=ground.height;heading=cameraYaw=Number.isFinite(target.heading)?target.heading:0;distance=0;cameraPitch=5;
   stopFlight();viewer.camera.cancelFlight?.();navigation?.setEnabled(false);body();active=true;loading=false;lastTime=performance.now();report('READY');canvas.focus({preventScroll:true});raf=requestAnimationFrame(tick);
  }catch{if(id===request){stop();report('WALK_UNAVAILABLE');}}
 }
 function key(code,pressed){if(!active||!['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(code))return false;if(pressed)keys.add(code);else keys.delete(code);vectors();return true;}
 on(window,'keydown',e=>{if(e.code==='Escape'&&active){stop();return;}if(key(e.code,true))e.preventDefault();});on(window,'keyup',e=>{if(key(e.code,false))e.preventDefault();});
 const pause=()=>{keys.clear();forward=strafe=0;};on(window,'blur',pause);on(document,'visibilitychange',()=>{if(document.hidden)pause();});
 on(canvas,'pointerdown',e=>{if(!active)return;e.preventDefault();drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.focus();try{canvas.setPointerCapture(e.pointerId);}catch{}});
 on(canvas,'pointermove',e=>{if(!active||drag?.id!==e.pointerId)return;cameraYaw=(cameraYaw-(e.clientX-drag.x)*.3)%360;cameraPitch=max(cameraPitch-(e.clientY-drag.y)*.2,-25,20);drag.x=e.clientX;drag.y=e.clientY;e.preventDefault();});
 for(const n of ['pointerup','pointercancel','lostpointercapture'])on(canvas,n,()=>drag=null);
 return {start,stop,key,setCamera(value){if(!['third-person','eye-level'].includes(value))return false;cameraMode=value;report();return true;},get active(){return active;},destroy(){stop();disposed=true;for(const off of listeners)off();}};
}
