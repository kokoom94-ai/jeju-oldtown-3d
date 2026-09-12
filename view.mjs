// A shared view contains a bounded scene/camera preset only; never credentials.
export function readView(hash, sceneIds) {
  if(typeof hash!=='string'||hash.length>160)return null;
  const p=new URLSearchParams(hash.replace(/^#/,''));
  if([...p.keys()].some(k=>!['scene','range','pitch'].includes(k))||new Set(p.keys()).size!==[...p.keys()].length)return null;
  const scene=p.get('scene'),range=Number(p.get('range')),pitch=Number(p.get('pitch'));
  if(!sceneIds.includes(scene)||!Number.isFinite(range)||range<150||range>6000||![-90,-50,-25].includes(pitch))return null;
  return {scene,range,pitch};
}
export function shareView(base,view,sceneIds) {
  const safe=readView(new URLSearchParams({scene:view.scene,range:String(Math.round(view.range)),pitch:String(view.pitch)}).toString(),sceneIds);
  if(!safe)throw Error('Only a registered scene can be shared');
  const url=new URL('explore.html',base);
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('Invalid site URL');
  url.search='';url.hash=new URLSearchParams({scene:safe.scene,range:String(safe.range),pitch:String(safe.pitch)}).toString();
  return url.href;
}
