// Conservative checks on historical pedestrian centerlines, not physical route guidance.
export function createWalkGuard(data){
 if(data?.schema!==1||!Array.isArray(data.paths)||!Array.isArray(data.buildings)||data.paths.length>10000||data.buildings.length>20000)throw Error('WALK_DATA_INVALID');
 const region=[126.517,33.508,126.536,33.522],xy=p=>[(p[0]-126.525)*92800,(p[1]-33.515)*111320],ll=p=>[p[0]/92800+126.525,p[1]/111320+33.515];
 const inRegion=p=>Array.isArray(p)&&p.length>=2&&p.slice(0,2).every(Number.isFinite)&&p[0]>=region[0]&&p[0]<=region[2]&&p[1]>=region[1]&&p[1]<=region[3];
 const segment=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy,t=den?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)):0,q=[a[0]+t*dx,a[1]+t*dy];return {distance:Math.hypot(p[0]-q[0],p[1]-q[1]),point:q};};
 const segments=[];for(const path of data.paths){if(!Array.isArray(path.coords)||!['footway','pedestrian'].includes(path.highway)||path.bridge||path.tunnel||path.layer!==0)continue;for(let i=1;i<path.coords.length;i++){const a=path.coords[i-1],b=path.coords[i];if(inRegion(a)&&inRegion(b))segments.push([xy(a),xy(b)]);}}
 const buildings=[];for(const shape of data.buildings){if(!Array.isArray(shape)||shape.length<3||!shape.every(p=>Array.isArray(p)&&p.slice(0,2).every(Number.isFinite)))continue;const ring=shape.map(xy),xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);buildings.push({ring,box:[Math.min(...xs)-.5,Math.min(...ys)-.5,Math.max(...xs)+.5,Math.max(...ys)+.5]});}
 function blocked(point){const p=xy(point);for(const {ring,box} of buildings){if(p[0]<box[0]||p[1]<box[1]||p[0]>box[2]||p[1]>box[3])continue;let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[j],b=ring[i];if(segment(p,a,b).distance<=.45)return true;if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}if(inside)return true;}return false;}
 function nearest(point,maxDistance=75){if(!inRegion(point))return null;const p=xy(point);let best=null;for(const [a,b] of segments){const v=segment(p,a,b);if(v.distance<=maxDistance&&(!best||v.distance<best.distance)){const candidate=ll(v.point);if(!blocked(candidate))best={point:candidate,distance:v.distance};}}return best;}
 function allowed(point){return inRegion(point)&&!blocked(point)&&!!nearest(point,1.35);}
 function sweep(from,to){if(!allowed(from)||!allowed(to))return false;const a=xy(from),b=xy(to),n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.2));if(n>100)return false;for(let i=1;i<=n;i++)if(!allowed(ll([a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n])))return false;return true;}
 return {nearest,allowed,sweep,blocked,region,segmentCount:segments.length};
}
