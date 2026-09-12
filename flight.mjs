// Camera controls only. Viewing distance is not a measured building height.
export function validFlight(p) {
  return !!p && [p.lon,p.lat,p.height].every(Number.isFinite) &&
    p.lon>=126.462 && p.lon<=126.575 && p.lat>=33.468 && p.lat<=33.536 &&
    p.height>=100 && p.height<=10000 &&
    (p.pitch===undefined || [-90,-50,-25].includes(p.pitch)) &&
    (p.heading===undefined || (Number.isFinite(p.heading)&&Math.abs(p.heading)<=360));
}
// Self-contained because it runs in the isolated official-SDK iframe.
export function installFlight(viewer,C,send) {
  let removeOrbit=null,position=null;
  const valid=p=>!!p&&[p.lon,p.lat,p.height].every(Number.isFinite)&&p.lon>=126.462&&p.lon<=126.575&&p.lat>=33.468&&p.lat<=33.536&&p.height>=100&&p.height<=10000&&(p.pitch===undefined||[-90,-50,-25].includes(p.pitch))&&(p.heading===undefined||(Number.isFinite(p.heading)&&Math.abs(p.heading)<=360));
  function stop(){
    const running=!!removeOrbit;removeOrbit?.();removeOrbit=null;
    if(running&&viewer.camera.lookAtTransform&&C.Matrix4)viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
    if(running)send('flight-state',{orbit:false});
  }
  function anchor(p){
    let ground=0;
    try { const h=viewer.scene.globe.getHeight?.(C.Cartographic.fromDegrees(p.lon,p.lat));if(Number.isFinite(h))ground=h; } catch {}
    // Zero here is a camera reference only; no terrain or building is generated.
    return C.Cartesian3.fromDegrees(p.lon,p.lat,ground);
  }
  function fly(p){
    if(!valid(p))return false;stop();position={...p};
    const heading=C.Math.toRadians(p.heading||0),pitch=C.Math.toRadians(p.pitch??-50);
    if(viewer.camera.flyToBoundingSphere&&C.BoundingSphere&&C.HeadingPitchRange){
      viewer.camera.flyToBoundingSphere(new C.BoundingSphere(anchor(p),1),{offset:new C.HeadingPitchRange(heading,pitch,p.height),duration:1.4});
    }else{
      viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(p.lon,p.lat,p.height),orientation:{heading,pitch,roll:0},duration:1.4});
    }
    return true;
  }
  function orbit(enabled){
    stop();if(!enabled)return;
    if(!position||!viewer.scene.preRender?.addEventListener||!viewer.camera.lookAt||!C.HeadingPitchRange){send('flight-unavailable');return;}
    viewer.camera.cancelFlight?.();const start=Date.now(),p={...position},center=anchor(p);
    removeOrbit=viewer.scene.preRender.addEventListener(()=>{
      const heading=C.Math.toRadians((p.heading||0)+(Date.now()-start)*0.004);
      viewer.camera.lookAt(center,new C.HeadingPitchRange(heading,C.Math.toRadians(p.pitch??-50),p.height));
    });send('flight-state',{orbit:true});
  }
  return {fly,orbit,stop};
}
