"""Map labels are part of the drag surface, not dead zones. Preserve marker clicks separately."""
from pathlib import Path
p=Path('precision/explore.mjs');s=p.read_text().replace("lightQuality=matchMedia('(max-width:760px)').matches",'lightQuality=true');p.write_text(s)
p=Path('precision/prepare.mjs');s=p.read_text()
old="entry.replace(marker,hook+'\\n'+marker)"
new="entry.replace('this.highQuality=!this.mobile;','this.highQuality=false;').replace(marker,hook+'\\n'+marker)"
if old in s:s=s.replace(old,new);p.write_text(s)
for name in ['precision/preview-hook.js','precision/preview-gestures.js']:
 p=Path(name);s=p.read_text()
 if 'gestureSurface' not in s:
  s=s.replace("let dragMode='orbit',bound=false,travel=0,clickUntil=0;", "let dragMode='orbit',bound=false,travel=0,clickUntil=0,pressedMarker=null;")
  s=s.replace("const capture=(name,fn,extra={})=>canvas.addEventListener", "const gestureSurface=document.querySelector('#stage')||canvas;\n    const capture=(name,fn,extra={})=>gestureSurface.addEventListener")
  s=s.replace("travel=0;fingers.set(e.pointerId", "travel=0;pressedMarker=e.button===0?e.target.closest?.('.poi-marker'):null;fingers.set(e.pointerId")
  old="const up=e=>{if(!fingers.has(e.pointerId))return;consume(e);fingers.delete(e.pointerId);if(travel>4)clickUntil=performance.now()+400;};for(const n of ['pointerup','pointercancel','lostpointercapture'])capture(n,up);"
  new="const up=e=>{if(!fingers.has(e.pointerId))return;consume(e);fingers.delete(e.pointerId);if(travel>4)clickUntil=performance.now()+400;else if(e.type==='pointerup'&&pressedMarker){const hit=[...pinElements].find(([id,el])=>el===pressedMarker);if(hit)send('place',{id:hit[0]});}pressedMarker=null;};for(const n of ['pointerup','pointercancel','lostpointercapture'])capture(n,up);"
  assert old in s,name;s=s.replace(old,new)
  s=s.replace("if(performance.now()<clickUntil)consume(e);", "if(performance.now()<clickUntil||e.target.closest?.('.poi-marker'))consume(e);")
 if name.endswith('preview-hook.js') and 'cameraPosition:' not in s:s=s.replace('target:r?[...r.target]:null,','target:r?[...r.target]:null,cameraPosition:r?.camera?.position?.toArray?.()||null,cameraQuaternion:r?.camera?.quaternion?.toArray?.()||null,')
 p.write_text(s)
p=Path('scripts/verify-visitor-browser.py');s=p.read_text()
s=s.replace("h=>Math.abs((window.__JEJU_EXPLORER__.status.navigation.heading-h+540)%360-180)>10',arg=h", "a=>Math.abs((window.__JEJU_EXPLORER__.status.navigation.heading-a[0]+540)%360-180)>=a[1]-.5',arg=[h,orbit_pixels*.34]")
s=s.replace("'()=>window.__JEJU_FLIGHT_PREVIEW__.status'", "'()=>{const s=window.__JEJU_FLIGHT_PREVIEW__.status;return {position:s.cameraPosition,quaternion:s.cameraQuaternion}}'")
p.write_text(s)
print('Enabled full map-surface dragging including labels; lightweight comparison default; rendered camera vectors measured')
