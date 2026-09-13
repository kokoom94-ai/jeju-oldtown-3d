"""Install reviewed visitor UI on the isolated source branch. No credentials or old-repo writes."""
from pathlib import Path
import json

def edit(name,old,new,count=1):
 p=Path(name);s=p.read_text()
 if s.count(old)!=count:raise RuntimeError('Source differs: '+name)
 p.write_text(s.replace(old,new,count))
if '3.8.0-visitor-navigation' in Path('precision/session.mjs').read_text():
 print('Visitor source already integrated');raise SystemExit(0)
assert '3.7.1-sdk-diagnostics' in Path('precision/session.mjs').read_text()
edit('precision/session.mjs','3.7.1-sdk-diagnostics','3.8.0-visitor-navigation')
edit('precision/migration.test.mjs','3.7.1-sdk-diagnostics','3.8.0-visitor-navigation')
edit('precision/sdk-frame-host.mjs','sdk-frame.html?v=3.7.1','sdk-frame.html?v=3.8.0')
p=Path('package.json');d=json.loads(p.read_text());d['version']='3.8.0';d['scripts']['build']='node scripts/build-walk-network.mjs && node precision/prepare.mjs';p.write_text(json.dumps(d,indent=2)+'\n')
p=Path('.gitignore');p.write_text(p.read_text()+'\nprecision/walk-network.json\n_publish/\n')
edit('precision/prepare.mjs',"'SDK_FIX_3_7_1.md']", "'SDK_FIX_3_7_1.md','navigation.mjs','walk.mjs','walk-guard.mjs','walk-network.json','public-connection.mjs','VISITOR_3_8.md']")
edit('precision/prepare.mjs',"await fs.writeFile(path.join(out,'.nojekyll'),'');", "await fs.writeFile(path.join(out,'.nojekyll'),'');\nawait fs.writeFile(path.join(out,'public-connection.json'),JSON.stringify({schema:1,enabled:false,browserVisibleKey:true,serviceUrl:PLANNED_URL}));")
p=Path('precision/prepare.mjs');p.write_text(p.read_text().replace('v=3.7.1','v=3.8.0').replace("||'fix/sdk-bootstrap-3-7-1'", "||'release/visitor-3-8'"))
p='precision/bridge.mjs'
edit(p,"import {installBootstrapGuard}","import {installNavigation} from './navigation.mjs';\nimport {createWalkGuard} from './walk-guard.mjs';\nimport {installWalk} from './walk.mjs';\nimport {installBootstrapGuard}")
edit(p,'map=null,launched=false;','map=null,launched=false,navigation=null,walker=null;')
edit(p,'flight?.stop();aerial?.destroy();','flight?.stop();walker?.destroy();navigation?.destroy();aerial?.destroy();')
old="    viewer.scene.canvas?.addEventListener?.('pointerdown',()=>{flight?.stop();send('flight-interaction');});"
edit(p,old,"    try{navigation=installNavigation(viewer,C,send,()=>{flight?.stop();send('flight-interaction');});}catch{warn('navigation');}\n    try{walker=installWalk(viewer,C,send,navigation,()=>flight?.stop());}catch{warn('walking');}\n    if(!navigation)"+old.strip())
edit(p,'          const hit=viewer.scene.pick(m.position);','          if(walker?.active||navigation?.suppressClick())return;\n          const hit=viewer.scene.pick(m.position);')
edit(p,'        const d=e.data;',"""        const d=e.data;
        if(d.type==='navigation-mode')navigation?.setMode(d.mode);
        if(d.type==='navigation-zoom'&&[1,-1].includes(d.direction))navigation?.zoom(d.direction);
        if(d.type==='navigation-north')navigation?.north();
        if(d.type==='navigation-angle')navigation?.angle(d.pitch);
        if(d.type==='walk-start'){const p=navigation?.state;if(p)walker?.start(p);}
        if(d.type==='walk-stop'){walker?.stop();navigation?.north();}
        if(d.type==='walk-camera')walker?.setCamera(d.mode);
        if(d.type==='walk-key'&&typeof d.pressed==='boolean')walker?.key(d.code,d.pressed);""")
edit(p,"if(d.type==='orbit'&&typeof d.enabled==='boolean')flight?.orbit(d.enabled);","if(d.type==='orbit'&&typeof d.enabled==='boolean'){if(navigation)navigation.orbit(d.enabled);else flight?.orbit(d.enabled);}")
edit(p,'          flight?.fly(p);','          walker?.stop();navigation?.setTarget(p);flight?.fly(p);')
edit(p,'<script>const installFlight=${installFlight.toString()};','<script>const installNavigation=${installNavigation.toString()};const createWalkGuard=${createWalkGuard.toString()};const installWalk=${installWalk.toString()};const installFlight=${installFlight.toString()};')
p='precision/explore.html'
edit(p,'ANOTHER VIEW OF JEJU · 3.7.1','ANOTHER VIEW OF JEJU · 3.8')
edit(p,'<nav class="quick-controls"', '<div id="mouse-help" class="mouse-help">왼쪽 드래그 360° 회전 · 오른쪽/Shift 드래그 이동 · 휠 확대</div>\n<nav class="quick-controls"')
edit(p,'aria-label="추가 조망 설정">','aria-label="추가 조망 설정"><button id="drag-mode" disabled>드래그: 360° 회전</button><button id="walk-start" disabled>캐릭터·거리 시점 β</button><button id="clean-view" aria-pressed="false">지도만 보기</button>')
edit(p,'<p id="host-message"','<p id="publisher-status" class="callout"></p><p id="host-message"')
edit(p,'<noscript>',Path('precision/visitor-panels.html').read_text()+'<noscript>')
p=Path('precision/explore.css');p.write_text(p.read_text()+'\n'+Path('precision/visitor.css').read_text())
p='precision/explore.mjs'
edit(p,"import {mountSDKFrame}","import {loadPublicConnection} from './public-connection.mjs';\nimport {mountSDKFrame}")
edit(p,'let cancelSDK=null;',"let cancelSDK=null;\nlet publisherConfigured=false,navigationStatus=null,walkStatus={active:false,code:'IDLE'};")
edit(p,' atlas?.render();'," $('#walk-start').disabled=!state.sdkReady;$('#drag-mode').disabled=!state.sdkReady&&!previewReady;\n atlas?.render();")
edit(p,'function teardown(keepEvidence=false){',"function teardown(keepEvidence=false){navigationStatus=null;walkStatus={active:false,code:'IDLE'};document.body.classList.remove('walking');$('#walk-hud').hidden=true;")
edit(p,'function updateView(){syncControls();setOrbit(false);',"function updateView(){syncControls();setOrbit(false);if(navigationStatus){emit('navigation-angle',{pitch});return;}")
edit(p,"$('#zoom-in').onclick=()=>{", "$('#zoom-in').onclick=()=>{if(navigationStatus){stopTour();emit('navigation-zoom',{direction:1});return;}")
edit(p,"$('#zoom-out').onclick=()=>{", "$('#zoom-out').onclick=()=>{if(navigationStatus){stopTour();emit('navigation-zoom',{direction:-1});return;}")
# Extract the existing successful bootstrap path; preserve the tested SDK handshake.
pth=Path(p);s=pth.read_text();start=s.index("  clearTimeout(previewTimer);stopTour();setOrbit(false);preview.src='about:blank';",s.index("$('#connect-form').onsubmit"));end=s.index('\n }catch',start)
body=s[start:end].replace("imagery:$('#use-imagery').checked",'imagery')
s=s[:start]+"  beginConnection(key,$('#use-imagery').checked);"+s[end:]
fun="function beginConnection(key,imagery){\n if(!policy.canConnect||state.state==='loading'||state.sdkReady)throw Error('Connection unavailable');key=validateKey(key);\n"+body+"\n}\n"
s=s.replace("$('#connect-form').onsubmit",fun+"$('#connect-form').onsubmit",1);pth.write_text(s)
edit(p," if(e.source===preview.contentWindow&&d?.channel==='jeju-osm-preview-v1'&&source==='preview'){", """ if(((e.source===preview.contentWindow&&d?.channel==='jeju-osm-preview-v1'&&source==='preview')||(channel&&e.source===provider.contentWindow&&d?.channel===channel))&&d.type==='navigation-state'&&d.navigation){
  const n=d.navigation;if([n.lon,n.lat,n.height,n.heading,n.pitch].every(Number.isFinite)&&n.lon>=126.462&&n.lon<=126.575&&n.lat>=33.468&&n.lat<=33.536){navigationStatus={lon:n.lon,lat:n.lat,height:n.height,heading:n.heading,pitch:n.pitch,mode:n.mode==='pan'?'pan':'orbit'};distance=n.height;pitch=n.pitch;$('#view-distance').textContent='관찰 거리 '+Math.round(n.height).toLocaleString()+' m · '+Math.round(n.heading)+'°';$('#drag-mode').textContent=n.mode==='pan'?'드래그: 이동':'드래그: 360° 회전';}return;
 }
 if(e.source===preview.contentWindow&&d?.channel==='jeju-osm-preview-v1'&&source==='preview'){""")
edit(p,"['flight','aerial','selection','places'].includes(d.feature)","['flight','aerial','selection','places','navigation','walking'].includes(d.feature)")
edit(p," if(d.type==='aerial-status')",Path('precision/visitor-message.js').read_text()+"\n if(d.type==='aerial-status')")
edit(p,'productionReady:false,walkingEnabled:false,aerial:', 'productionReady:false,walkingEnabled:false,experimentalWalk:walkStatus,navigation:navigationStatus,publisherConfigured,aerial:')
edit(p,"north:()=>{stopTour();updateView();", "north:()=>{stopTour();if(navigationStatus)emit('navigation-north');else updateView();")
edit(p,'startPreview();go(scene);syncControls();showSDKStage();',Path('precision/visitor-client.js').read_text())
p=Path('precision/preview-hook.js');s=p.read_text().replace('  const stop=()=>',Path('precision/preview-gestures.js').read_text()+'\n  const stop=()=>',1)
s=s.replace("    if(d.type==='quality'", "    if(d.type==='navigation-mode'&&['orbit','pan'].includes(d.mode)){dragMode=d.mode;navNotice();}\n    if(d.type==='navigation-north'){stop();r.yaw=0;navNotice();}\n    if(d.type==='navigation-angle'&&[-90,-50,-25].includes(d.pitch)){stop();r.pitch=Math.min(1.52,-d.pitch*Math.PI/180);navNotice();}\n    if(d.type==='navigation-zoom'&&[-1,1].includes(d.direction)){stop();r.distance=clamp(r.distance*(d.direction>0?1/1.4:1.4),10,10000);navNotice();}\n    if(d.type==='quality'")
s=s.replace("send('camera',{lon:p.lon,lat:p.lat,distance:p.height,pitch:p.pitch});", "send('camera',{lon:p.lon,lat:p.lat,distance:p.height,pitch:p.pitch});navNotice();").replace('    if(r){r.avatar.visible=false','    if(r){bindGestures();r.avatar.visible=false');p.write_text(s)
print('Integrated visitor UI without credentials; browser tests required before publish')
