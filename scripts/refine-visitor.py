"""Complete camera ownership and measure mouse motion without high-quality software-GPU overhead."""
from pathlib import Path
p=Path('precision/navigation.mjs');s=p.read_text()
if 'nativeFlags' not in s:
 s=s.replace(" if(ctrl)ctrl.enableInputs=false;", " const nativeFlags={};if(ctrl){for(const name of ['enableRotate','enableTranslate','enableZoom','enableTilt','enableLook']){nativeFlags[name]=ctrl[name];ctrl[name]=false;}ctrl.enableInputs=false;}")
 s=s.replace('if(ctrl)ctrl.enableInputs=prev;', 'if(ctrl){ctrl.enableInputs=prev;for(const [name,value] of Object.entries(nativeFlags))ctrl[name]=value;}')
 p.write_text(s)
p=Path('precision/explore.mjs');s=p.read_text()
if 'Scene buttons use the supported flight presets' not in s:
 s=s.replace("function go(p=scene,{manual=true}={}){", "function go(p=scene,{manual=true}={}){\n // Scene buttons use the supported flight presets; free-drag state remains continuous.\n if(![-90,-50,-25].includes(pitch))pitch=-50;")
 p.write_text(s)
p=Path('scripts/verify-visitor-browser.py');s=p.read_text()
if 'Flush each actual-input checkpoint' not in s:
 s=s.replace(" checks.append({'name':name,'passed':bool(value)})", " checks.append({'name':name,'passed':bool(value)})\n # Flush each actual-input checkpoint before a potentially slow software-GPU frame.\n print(('PASS ' if value else 'FAIL ')+name,flush=True)\n (out/('visitor-'+label+'-progress.json')).write_text(json.dumps({'checks':checks,'measurements':measurements,'actualKeyUsed':False,'complete':False},ensure_ascii=False,indent=2))")
 s=s.replace("page=ctx.new_page();page.on", "page=ctx.new_page();page.set_default_timeout(15000);page.on")
 s=s.replace("check(tag+' current JS'", "\n    if not provider and not page.evaluate('window.__JEJU_EXPLORER__.status.lightQuality'):\n     page.locator('#quality').click();page.wait_for_timeout(500)\n    check(tag+' current JS'")
 s=s.replace('    for i in range(12):', '    turns=3 if width>760 else 6;orbit_pixels=400 if width>760 else 180\n    for i in range(turns):')
 old="h=nav()['heading'];page.mouse.move(x,y);page.mouse.down();page.mouse.move(x-100,y,steps=4);page.mouse.up();page.wait_for_timeout(60);total+=abs(heading_delta(h,nav()['heading']))"
 new="h=nav()['heading'];page.mouse.move(x,y);page.mouse.down();page.mouse.move(x-orbit_pixels,y,steps=2);page.mouse.up();page.wait_for_function('h=>Math.abs((window.__JEJU_EXPLORER__.status.navigation.heading-h+540)%360-180)>10',arg=h,timeout=10000);delta=abs(heading_delta(h,nav()['heading']));total+=delta;print(tag+' measured drag '+str(i)+': '+str(delta)+' degrees',flush=True)"
 assert old in s;s=s.replace(old,new)
 s=s.replace("    check(tag+' mouse orbit exceeds 360 degrees',total>360)","    measurements.append({'test':tag,'rotationDegrees':total,'initial':before,'final':nav()})\n    check(tag+' mouse orbit exceeds 360 degrees',total>360)")
 s=s.replace("v.scene.globe.getHeight=()=>25;", "v.resolutionScale=.6;v.scene.globe.getHeight=()=>25;")
 p.write_text(s)
print('Camera inputs remain isolated; software-rendered tests still require >360 degrees from mouse events')
