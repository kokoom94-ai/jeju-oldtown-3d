"""Reviewed one-time integration. Refuse an unexpected source baseline."""
from pathlib import Path
import hashlib, os
if os.environ.get('GITHUB_REPOSITORY') != 'kokoom94-ai/jeju-oldtown-3d' or os.environ.get('GITHUB_REF_NAME') != 'vworld-aerial-3-7':
    raise SystemExit('Wrong repository or branch')
p=Path('precision')
if '3.7.0-vworld-aerial' in (p/'session.mjs').read_text():
    print('3.7 source already integrated; keeping current changes.')
    raise SystemExit(0)
expected={
'precision/bridge.mjs':'e2e574d6643e5a92670b2377626bf5c7a1e731a0193b8735571d9774ec3c9e67',
'precision/explore.mjs':'358125216fb68c800bff38212e57e9a385be6935b8abb6935b853314d525b4b3',
'precision/explore.html':'7eef837e4b4b0d98008fdac67e921fb7103fae7bda684111c30e6b7fc7a94c31',
'precision/explore.css':'a3fd28f615e30058fd068b3dcac75d07b8ef9e1269d7f23e8847ccb0ebd49541',
'precision/prepare.mjs':'e46c987f0a599c4ad221b78e16b6ba2db9bd14794ae145a65aa85e130190afb3',
'precision/session.mjs':'6d2a2226c9128f1a448a0c775cb9cd3d53db95a539b14c5815468c352941023e',
'precision/publish.mjs':'2e2e814eb1910c1f083454decffba870d3fcb65c7ac058f69c72ce43ef9ef5be',
'precision/readiness.mjs':'f6eae0dd5be1c78f5f4db4e52bad8ef631564d0dbfad95d7f386b849f9753d04',
'precision/migration.test.mjs':'2bbdcec1f898c505390d369be0b27f8e83a1a1b6a063f60fda110a3b955da7dc',
'precision/release-summary.mjs':'a29ebe244ea114b30330a9a7a01ab6ff19bf2dccefb66864223a3bb1b4366aea',
'precision/explore-verify.cjs':'eb2aa0c6369eef078178ac0bd2d8c629323beec928258ac032616e4b78be15f9',
'package.json':'d40e2f2907f7d71f96ad8d5bdfe9fcf27f4f19f3b901780e26eb2ac2cc7e3408'}
for name,digest in expected.items():
    if hashlib.sha256(Path(name).read_bytes()).hexdigest()!=digest:
        raise SystemExit('Source changed; manual reconciliation required: '+name)
f=p/'bridge.mjs';s=f.read_text()
s=s.replace("import {installFlight}","import {installAerial,satelliteTemplate} from './aerial.mjs';\nimport {installFlight}")
s=s.replace('childRuntime(channel,origin,places)','childRuntime(channel,origin,places,tileURL)').replace('flight=null;','flight=null,aerial=null,map=null;')
s=s.replace('flight?.stop();input?.destroy();','flight?.stop();aerial?.destroy();input?.destroy();')
s=s.replace('flight=installFlight(viewer,C,send);','flight=installFlight(viewer,C,send);\n      aerial=installAerial(viewer,C,map,tileURL,send);')
s=s.replace("const d=e.data;\n        if(d.type==='orbit'", "const d=e.data;\n        if(d.type==='aerial-control'&&['mode','quality','building','lighting'].includes(d.action)){if(!aerial[d.action](d.value))send('aerial-unavailable',{feature:d.action});}\n        if(d.type==='orbit'")
s=s.replace('const map=new window.vw.Map();','map=new window.vw.Map();').replace('origin,places=[]})','origin,places=[],imagery=false})')
s=s.replace('JSON.stringify([channel,origin,clean])','JSON.stringify([channel,origin,clean,imagery&&key?satelliteTemplate(key):null])')
s=s.replace('const installFlight=${installFlight.toString()};','const installFlight=${installFlight.toString()};const installAerial=${installAerial.toString()};');f.write_text(s)
f=p/'explore.html';s=f.read_text().replace('ANOTHER VIEW OF JEJU · 3.6','ANOTHER VIEW OF JEJU · 3.7')
s=s.replace('실제 건물 원본 연결 ↗','항공영상·원본 연결 ↗').replace('<button id="fullscreen"','<button id="north" title="선택 지점을 북쪽 기준으로 정렬">N</button><button id="fullscreen"')
s=s.replace('<button id="low-angle"','<button id="open-atlas">레이어·환경</button><button id="low-angle"')
s=s.replace('실제 건물 원본으로 전환','항공영상 + 지형 + 원본 3D')
s=s.replace('<label class="check"><input id="confirmed"','<label class="check"><input id="use-imagery" type="checkbox" checked>브이월드 항공·위성영상 WMTS도 사용합니다. 기존 키의 배경지도 권한이 필요합니다.</label><label class="check"><input id="confirmed"')
s=s.replace('등록 URL과 WebGL 3D 권한을 확인했습니다.','등록 URL과 WebGL 3D 권한, 선택한 경우 배경지도 권한을 확인했습니다.')
s=s.replace('<noscript>', '''<dialog id="atlas-dialog" aria-labelledby="atlas-title"><div class="panel-heading"><div><span class="eyebrow">VWORLD / LAYERS & VIEW</span><h2 id="atlas-title">항공영상·3D 레이어</h2></div><button id="close-atlas" aria-label="레이어 설정 닫기">×</button></div>
<p id="atlas-context" class="callout"></p><div class="atlas-tabs" role="group" aria-label="원본 배경"><button data-aerial-mode="satellite" disabled>항공·위성영상</button><button data-aerial-mode="original" disabled>SDK 기본 배경</button><button id="atlas-buildings" aria-pressed="true" disabled>원본 건물</button></div>
<p class="muted">영상은 지형에 입히는 2D 촬영자료입니다. 영상만으로 건물 지붕·외벽을 생성하지 않으며, 원본 3D 모델은 별도로 불러옵니다. 촬영일은 미확인입니다.</p>
<h3>조명 미리보기</h3><div class="atlas-tabs" role="group" aria-label="조명 연출"><button data-lighting="day" disabled>☀ 낮</button><button data-lighting="sunset" disabled>◒ 노을</button><button data-lighting="night" disabled>☾ 밤</button></div><p class="muted">2026-09-12 한국시간 12:00 / 18:30 / 21:00 기준 조명 연출입니다. 실시간 날씨·촬영시각이 아니며, 사진에 찍힌 그림자는 바뀌지 않습니다.</p>
<h3>원본 수신 상태</h3><dl class="atlas-status"><dt>SDK</dt><dd id="atlas-sdk"></dd><dt>영상 타일</dt><dd id="atlas-imagery"></dd><dt>지형 표본</dt><dd id="atlas-terrain"></dd><dt>3D 타일</dt><dd id="atlas-model"></dd><dt>화면 렌더링</dt><dd id="atlas-render"></dd></dl>
<p class="muted">타일 관찰·고도 표본·FPS는 수신 및 렌더링 진단입니다. 건물 정확도·행정동 전체 포함·보행 안전 검증이 아닙니다.</p><div class="dialog-links"><button id="atlas-connect" class="accent">원본 연결하기</button><button id="atlas-export">키 없는 진단 저장</button></div></dialog>
<noscript>''');f.write_text(s)
f=p/'explore.css';f.write_text(f.read_text()+'''\n/* 3.7: layer controls do not cover or modify original map geometry. */
.atlas-tabs{display:flex;gap:6px;flex-wrap:wrap}.atlas-tabs button{font-size:12px;flex:1;white-space:nowrap}.atlas-status{display:grid;grid-template-columns:84px 1fr;gap:12px;margin:20px 0;font-size:12px}.atlas-status dt{color:var(--muted)}.atlas-status dd{margin:0;overflow-wrap:anywhere}#atlas-dialog h3{font-size:14px;margin:23px 0 12px}#atlas-dialog{width:min(580px,calc(100% - 32px))}.quick-controls{max-width:calc(100vw - 100px)}
@media(max-width:760px){.top-actions button{font-size:9px;padding:8px 7px}.brand{font-size:20px}.quick-controls{right:16px;max-width:none}.quick-controls button{padding:7px 8px;font-size:9px}.scene-info p{max-width:190px}.atlas-status{grid-template-columns:73px 1fr;font-size:11px}.view-controls button{height:37px;min-height:37px}}
''')
f=p/'explore.mjs';s="import {installAtlasUI} from './atlas-ui.mjs';\n"+f.read_text()
s=s.replace("$('#quality').disabled=source!=='preview';","$('#quality').disabled=source!=='preview'&&!state.sdkReady;\n atlas?.render();")
s=s.replace("if(source==='preview')emit('quality',{light:lightQuality});syncControls();","if(source==='preview')emit('quality',{light:lightQuality});else if(state.sdkReady)emit('aerial-control',{action:'quality',value:lightQuality});syncControls();")
s=s.replace("state=initialState();setOrbit(false);", "state=initialState();atlas.reset();setOrbit(false);")
s=s.replace("$('#quality').onclick=()=>{if(source!=='preview')return;lightQuality=!lightQuality;applyExtras();};","$('#quality').onclick=()=>{if(source!=='preview'&&!state.sdkReady)return;lightQuality=!lightQuality;applyExtras();};")
s=s.replace("const html=frameHTML({key,channel,origin:location.origin,places})","const html=frameHTML({key,channel,origin:location.origin,places,imagery:$('#use-imagery').checked})")
s=s.replace("if(d.type==='flight-state'){", "if(d.type==='aerial-status')atlas.update(d.status);\n if(d.type==='aerial-unavailable')atlas.unavailable(d.feature);\n if(d.type==='flight-state'){")
s=s.replace('walkingEnabled:false};}}});','walkingEnabled:false,aerial:atlas.status};}}});')
s=s.replace("try{const r=await fetch('places.json');","const atlas=installAtlasUI({getState:()=>({source,sdkReady:state.sdkReady}),emit,toast,openConnect:()=>$('#open-connect').click(),north:()=>{stopTour();updateView();toast('선택 지점을 북쪽 기준으로 정렬했습니다.');}});\ntry{const r=await fetch('places.json');");f.write_text(s)
f=p/'prepare.mjs';f.write_text(f.read_text().replace("'view.mjs','RELEASE_3_6.md'","'view.mjs','RELEASE_3_6.md','aerial.mjs','atlas-ui.mjs','RELEASE_3_7.md'"))
for name in ['publish.mjs','readiness.mjs']:
 f=p/name;f.write_text(f.read_text().replace("'aerial-release-3-6']","'aerial-release-3-6','vworld-aerial-3-7']"))
for name in ['session.mjs','migration.test.mjs','explore-verify.cjs']:
 f=p/name;f.write_text(f.read_text().replace('3.6.0-aerial-release','3.7.0-vworld-aerial'))
f=Path('package.json');f.write_text(f.read_text().replace('3.6.0','3.7.0'))
f=p/'release-summary.mjs';f.write_text(f.read_text().replace("'explore-browser-result.json']","'explore-browser-result.json','aerial-browser-result.json']"))
(p/'RELEASE_3_7.md').write_text('''# JEJU:BEFORE 3.7 — 항공영상·지형·원본 3D

WebGL 3.0 공식 SDK의 지형 위에 본인 키로 요청한 VWorld WMTS Satellite 영상을 표시합니다. 원본 건물은 공식 facility_build 레이어를 유지하며 켜고 끌 수 있습니다. 영상만으로 건물 외벽이나 지붕을 생성하지 않습니다. 촬영일·지역별 해상도·제주 모델 정확도는 확인 전입니다.

신규 기능: 항공영상/SDK 배경 선택, 원본 건물 표시, 낮/노을/밤 조명 연출, 원본 모드의 가벼운 품질, 북쪽 정렬, 영상 디코딩·지형 고도 표본·3D 타일 관찰·FPS 진단, 키 없는 진단 JSON 저장. 기존 장소 32곳·검색·네이버 검색 링크·자동 둘러보기·시점 전환·모바일을 유지합니다.

실시간은 타일 요청·브라우저 프레임 렌더링을 뜻합니다. 실시간 촬영·CCTV·실시간 날씨가 아닙니다. 조명은 2026-09-12 KST 고정 기준 연출이며 항공사진에 찍힌 그림자는 남습니다. 시설·보행·행정경계의 정확도를 검증하지 않습니다.

공유 CDN은 본인 키 입력을 차단합니다. 전용 주소 https://kokoom94-ai.github.io/jeju-oldtown-3d/ 에서 연결합니다. Pages 게시 설정이 필요하면 Source=Deploy from a branch, Branch=jeju-precision-site, Folder=/(root). 파일 업로드는 자동화가 담당합니다. 기존 발급 키의 WebGL 3D 권한과 선택적으로 배경지도 WMTS 권한을 확인합니다. WebGL만 허용된 키는 항공영상 체크를 해제하고 SDK 기본 배경으로 연결할 수 있습니다. 같은 호스트의 경로 변경이 재발급을 반드시 요구한다고 단정하지 않습니다.

SDK 준비, 영상 디코딩, 지형 공급자, 관덕정 좌표 고도 표본, 3D 타일 관찰은 각각 별도 지표입니다. 하나를 다른 지표나 완성도로 대체하지 않습니다. 실제 키가 이번 작업에 제공되지 않으므로 테스트의 성공은 실연결 성공을 의미하지 않습니다. sdkLiveTested, geometryVerified, productionReady는 검증 전 false입니다.

구현 근거: https://github.com/V-world/V-world_API_sample 의 2026년 교육 (WebGL 3.0 초기화, facility_build.show/hide, WMTS 경로), https://cesium.com/learn/cesiumjs/ref-doc/UrlTemplateImageryProvider.html 및 https://cesium.com/learn/cesiumjs/ref-doc/Cesium3DTileset.html .

UI 참고: tinyseoul.com, seoul-3d-atlas.synabreu.chatgpt.site. 원본 코드·사진·모델·키를 복제하지 않습니다. 비·눈·교통·수목 연출은 실제 도시 재현과 혼동되지 않도록 이번 원본 지도에는 넣지 않습니다.
''')
print('Integrated reviewed 3.7 source. Unit and browser tests must follow.')
