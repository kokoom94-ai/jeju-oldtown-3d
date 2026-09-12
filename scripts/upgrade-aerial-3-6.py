# Reviewed one-time migration of existing oldtown 3.5 sources.
# No downloads, credentials, 9.81 writes or paid resources.
from pathlib import Path
import os,sys,json
root=Path(__file__).resolve().parents[1]
if os.environ.get('GITHUB_REPOSITORY')!='kokoom94-ai/jeju-oldtown-3d' or os.environ.get('GITHUB_REF_NAME')!='aerial-release-3-6':
 raise SystemExit('Only the isolated release work branch may run this migration')
version=(root/'precision/session.mjs').read_text()
if "VERSION='3.6.0-aerial-release'" in version:
 print('Migration already applied; current source files are preserved.');sys.exit(0)
if "VERSION='3.5.0-aerial-explorer'" not in version:
 raise SystemExit('Unexpected source version; review rather than overwrite')
def patch(name,old,new):
 p=root/name;s=p.read_text();assert old in s,(name,old[:100]);p.write_text(s.replace(old,new))
patch('precision/session.mjs',"3.5.0-aerial-explorer","3.6.0-aerial-release")
patch('precision/session.mjs',"u.pathname==='/jeju-oldtown-3d/explore.html'","u.pathname==='/jeju-oldtown-3d/explore.html' || u.pathname==='/jeju-oldtown-3d/connect.html'")
patch('precision/migration.test.mjs','3.5.0-aerial-explorer','3.6.0-aerial-release')
p=root/'package.json';d=json.loads(p.read_text());d['version']='3.6.0';p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
patch('precision/prepare.mjs',"'preview.css']","'preview.css','view.mjs','RELEASE_3_6.md']")
patch('precision/prepare.mjs',"await fs.writeFile(path.join(out,'index.html'),html.replace", "await fs.writeFile(path.join(out,'connect.html'),html.replace")
patch('precision/prepare.mjs',"const readme=", "// The public home is the aerial app, not the developer connection console.\nawait fs.copyFile(path.join(out,'explore.html'),path.join(out,'index.html'));\nconst readme=")
patch('precision/prepare.mjs','href="../index.html">정밀 원본 연결센터','href="../connect.html">정밀 원본 연결센터')
patch('precision/prepare.mjs',"sourceBranch:'jeju-before-web'","sourceBranch:process.env.GITHUB_REF_NAME||'aerial-release-3-6'")
patch('precision/prepare.mjs',"explorerPath:'explore.html'","homePath:'index.html',diagnosticPath:'connect.html',explorerPath:'explore.html'")
patch('precision/explore.html','3.5</div>','3.6</div>')
patch('precision/explore.html','href="index.html"','href="connect.html"')
patch('precision/explore.html','<section class="journey">','''<nav class="quick-controls" aria-label="추가 조망 설정"><button id="low-angle" aria-pressed="false">낮은 조망</button><button id="markers" aria-pressed="true">장소 표식</button><button id="quality" aria-pressed="false">가벼운 모드</button><button id="share-view">장면 공유 ↗</button></nav>
<section class="journey">''')
patch('precision/explore.html','<noscript>','''<dialog id="share-dialog"><div class="panel-heading"><h2>이 장면으로 초대하기</h2><button id="close-share" aria-label="공유창 닫기">×</button></div><p>선택 장소·관찰 거리·조망 각도만 공유합니다. 인증키와 원본 연결 상태, 자유 드래그 카메라 위치는 포함하지 않습니다.</p><label for="share-link">공유 주소</label><input id="share-link" readonly><button id="copy-share" class="accent">주소 복사</button><p id="share-status" role="status"></p></dialog>
<noscript>''')
with (root/'precision/explore.css').open('a') as f:f.write('''\n/* Release 3.6: small camera tools leave the map draggable. */
.quick-controls{position:fixed;left:34px;bottom:237px;display:flex;gap:6px;z-index:4;flex-wrap:wrap;max-width:calc(100vw - 120px)}.quick-controls button{font-size:11px;min-height:36px;padding:8px 12px}.quick-controls #low-angle[aria-pressed=true]{border-color:var(--accent)}#copy-share{margin-top:14px}
@media(max-width:760px){.quick-controls{left:17px;right:65px;bottom:224px;gap:5px;max-width:none}.quick-controls button{font-size:10px;min-height:34px;padding:7px 9px}.scene-info p{max-width:195px}}
@media(max-height:600px){.quick-controls{left:18px;bottom:117px;right:18px;max-width:none}.view-controls{right:18px;gap:3px}.view-controls button{width:38px;height:38px}.scene-info{max-width:200px}}
''')
(root/'precision/view.mjs').write_text('''// A shared view contains a bounded scene/camera preset only; never credentials.
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
''')
patch('precision/explore.mjs',"import {parsePlaceSeed} from './places.mjs';","import {parsePlaceSeed} from './places.mjs';\nimport {readView,shareView} from './view.mjs';")
patch('precision/explore.mjs',"const reduced=", "let markersVisible=true,lightQuality=matchMedia('(max-width:760px)').matches;\nconst shared=readView(location.hash,SCENES.map(s=>s.id));\nif(shared){scene={...SCENES.find(s=>s.id===shared.scene),height:shared.range};distance=shared.range;pitch=shared.pitch;}\nconst reduced=")
patch('precision/explore.mjs',"function updateView(){", "function syncControls(){\n $('#oblique').setAttribute('aria-pressed',String(pitch===-50));$('#overhead').setAttribute('aria-pressed',String(pitch===-90));$('#low-angle').setAttribute('aria-pressed',String(pitch===-25));\n $('#markers').setAttribute('aria-pressed',String(markersVisible));$('#quality').setAttribute('aria-pressed',String(lightQuality));$('#quality').disabled=source!=='preview';\n}\nfunction applyExtras(){emit('markers',{visible:markersVisible});if(source==='preview')emit('quality',{light:lightQuality});syncControls();}\nfunction updateView(){syncControls();")
patch('precision/explore.mjs',"emit('fly',{position:{lon:p.lon,lat:p.lat,height:distance,pitch,heading:0}});", "emit('fly',{position:{lon:p.lon,lat:p.lat,height:distance,pitch,heading:0}});syncControls();")
patch('precision/explore.mjs',"$('#fullscreen').onclick=", """$('#low-angle').onclick=()=>{stopTour();pitch=-25;updateView();};
$('#markers').onclick=()=>{markersVisible=!markersVisible;applyExtras();};
$('#quality').onclick=()=>{if(source!=='preview')return;lightQuality=!lightQuality;applyExtras();};
$('#share-view').onclick=()=>{stopTour();setOrbit(false);try{
 const link=shareView(location.href,{scene:scene.id,range:distance,pitch},SCENES.map(s=>s.id));
 $('#share-link').value=link;$('#share-status').textContent='';$('#share-dialog').showModal();
}catch{toast('개별 장소 대신 아래 6개 조망 지점을 선택하면 장면을 공유할 수 있습니다.');}};
$('#close-share').onclick=()=>$('#share-dialog').close();
$('#copy-share').onclick=async()=>{try{await navigator.clipboard.writeText($('#share-link').value);$('#share-status').textContent='공유 주소를 복사했습니다.';}catch{$('#share-link').focus();$('#share-link').select();$('#share-status').textContent='주소를 선택했습니다. 기기의 복사 기능을 이용하세요.';}};
$('#fullscreen').onclick=""")
patch('precision/explore.mjs',"previewReady=true;$('#loading').hidden=true;go(scene);","previewReady=true;$('#loading').hidden=true;go(scene);applyExtras();")
patch('precision/explore.mjs',"제주 원본 객체 확인 전';go(scene);","제주 원본 객체 확인 전';go(scene);applyExtras();")
patch('precision/explore.mjs',"tourRunning:!!tourTimer,canConnect:","tourRunning:!!tourTimer,markersVisible,lightQuality,canConnect:")
patch('precision/explore.mjs',"startPreview();go(scene);","startPreview();go(scene);syncControls();")
patch('precision/preview-hook.js',"walkingEnabled:false};","walkingEnabled:false,highQuality:r?.highQuality,markersVisible:!document.querySelector('#map-labels')?.hidden};")
patch('precision/preview-hook.js',"if(d.type==='markers'", "if(d.type==='quality'&&typeof d.light==='boolean'){r.highQuality=!d.light;r.renderer.shadowMap.enabled=!d.light;r.renderer.shadowMap.needsUpdate=true;r.resize();}\n    if(d.type==='markers'")
patch('precision/verify.cjs',"const local='http://127.0.0.1:'+server.address().port+'/';","const local='http://127.0.0.1:'+server.address().port+'/connect.html';")
patch('precision/proxy-verify.cjs',"const pageURL='http://127.0.0.1:'+staticServer.address().port+'/';","const pageURL='http://127.0.0.1:'+staticServer.address().port+'/connect.html';")
patch('precision/explore-verify.cjs',"new URL('explore.html',publication.url).href","new URL('index.html',publication.url).href")
patch('precision/explore-verify.cjs','3.5.0-aerial-explorer','3.6.0-aerial-release')
patch('precision/explore-verify.cjs',"record('32 independent POIs loaded'", "record('Public home opens aerial app, not console',await p.locator('#map').count()===1);\nrecord('32 independent POIs loaded'")
patch('precision/explore-verify.cjs',"await p.locator('#tour').click();record('Tour starts", """await p.locator('#low-angle').click();await p.waitForTimeout(250);record('Low oblique changes comparison camera',await previewFrame(p).evaluate('window.__JEJU_FLIGHT_PREVIEW__.status.pitch===.44'));
await p.locator('#markers').click();await p.waitForTimeout(250);record('Marker toggle changes embedded layer',await previewFrame(p).evaluate('window.__JEJU_FLIGHT_PREVIEW__.status.markersVisible===false'));
await p.locator('#quality').click();await p.waitForTimeout(250);record('Light mode disables expensive shadows',await previewFrame(p).evaluate('window.__JEJU_FLIGHT_PREVIEW__.status.highQuality===false'));
await p.locator('#share-view').click();const sharedLink=await p.locator('#share-link').inputValue();record('Shared scene URL contains bounded camera only',sharedLink.includes('scene=gwandeok')&&sharedLink.includes('pitch=-25')&&!sharedLink.includes('key='));await p.locator('#close-share').click();
await p.locator('#oblique').click();await p.locator('#markers').click();
await p.locator('#tour').click();record('Tour starts""")
patch('precision/explore-verify.cjs',"record('Mobile no horizontal overflow'","record('Mobile defaults to light mode',(await status(p)).lightQuality===true);record('Mobile no horizontal overflow'")
(root/'precision/RELEASE_3_6.md').write_text('''# JEJU:BEFORE 3.6 — 조감도를 첫 화면으로

새 전용 저장소의 기존 3.5 작업을 이어서 수정했습니다. 원도심 이전을 재실행하거나 9.81 저장소를 수정하지 않습니다.

- 공개 홈 `index.html`: 전체화면 조감 탐색. `explore.html`은 동일 앱. 연결·표본 관찰 진단은 `connect.html`.
- 낮은 조망(-25도), 표식 표시/숨김, 추정 비교 화면 가벼운 모드, 6개 장소의 선택 위치·거리·각도 공유. 공유 링크에 키·임의 쿼리·자유 카메라·연결 상태를 넣지 않습니다. 모바일 화면은 가벼운 모드가 기본입니다.
- 32개 장소는 독립 `places.json`에서 읽습니다. 원본 데이터·2.0 도보 베타·라이선스를 보존합니다.
- 워크플로는 단위 검사·빌드 후 정적 브랜치를 갱신하고, 새 공개 URL에서 Chromium 검사를 실행합니다. 게시 상태의 403 오류는 미확인으로 기록하며 UI 검사를 생략시키지 않습니다. 모든 쓰기는 새 저장소만 대상으로 합니다.

## 실제 데이터 상태
기본 화면은 OSM 윤곽과 추정 높이(10,617건 중 실제 높이 태그 10건, 층수 기반 추정 663건, 9m 가정 9,944건), 평면 지형·일반 외관 연출입니다. 실제 제주 건물 높이·지붕·외벽·지형 완성본이 아닙니다. 원본을 받은 것처럼 표시하거나 원본 빈 공간을 임의 형상으로 채우지 않습니다.

브이월드 키는 발급 완료지만 이 릴리스 검사는 실제 키를 사용하지 않습니다. 공식 원본 SDK·제주 모델·형상 정확도는 미검증입니다. 공항은 조감만 제공하며 원본 보행·제한구역 통행은 허용하지 않습니다. 대표점·사각 범위는 행정동 전체 검증이 아닙니다.

## 계정에서 남은 설정
새 저장소 Settings → Pages → Deploy from a branch → `jeju-precision-site` → `/(root)` → Save. Pages 게시 여부는 실행 결과에서 확인하며 자동 활성화됐다고 가정하지 않습니다.
기존 발급 키의 등록 서비스 URL은 새 전용 URL `https://kokoom94-ai.github.io/jeju-oldtown-3d/`과 대조합니다. 같은 호스트의 경로 변경 때문에 키 재발급이 필수라고 단정하지 않습니다. 전용 사이트의 직접 입력란을 사용하고 채팅·GitHub·공유 CDN에 키를 넣지 않습니다.

## 검증 기록
현재 실행 산출물 `precision-qa/unit-tests.txt`, `precision/*browser-result.json`, `precision/readiness.json`, `precision/publication.json`에서 커밋·실행 번호를 함께 확인합니다. 다른 실행의 과거 검증을 이번 통과로 재사용하지 않습니다.
''')
(root/'precision/release.test.mjs').write_text('''import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {readView,shareView} from './view.mjs';import {hostPolicy} from './session.mjs';
const ids=['gwandeok','airport'];
test('scene sharing removes query credentials and accepts bounded camera',()=>{const u=shareView('https://example.com/app/index.html?apiKey=DO-NOT-SHARE#secret',{scene:'airport',range:2200,pitch:-25},ids);assert.equal(u,'https://example.com/app/explore.html#scene=airport&range=2200&pitch=-25');assert.deepEqual(readView(new URL(u).hash,ids),{scene:'airport',range:2200,pitch:-25});});
test('invalid scene, arbitrary fields and duplicate keys are rejected',()=>{for(const h of ['#scene=unknown&range=500&pitch=-50','#scene=airport&range=5&pitch=-25','#scene=airport&range=2000&pitch=20','#scene=airport&range=2000&pitch=-25&key=unsafe','#scene=airport&range=2000&pitch=-25&scene=gwandeok','#'+ 'x'.repeat(161)])assert.equal(readView(h,ids),null);});
test('new diagnostic entry is allowed only on exact owned path',()=>{assert(hostPolicy('https://kokoom94-ai.github.io/jeju-oldtown-3d/connect.html').canConnect);assert(!hostPolicy('https://kokoom94-ai.github.io/jeju-now-981/connect.html').canConnect);assert(!hostPolicy('https://kokoom94-ai.github.io/jeju-oldtown-3d/extra/connect.html').canConnect);});
test('build separates aerial home and diagnostics, preserving comparison label',()=>{const build=fs.readFileSync(new URL('prepare.mjs',import.meta.url),'utf8');assert(build.includes("path.join(out,'connect.html')"));assert(build.includes("fs.copyFile(path.join(out,'explore.html'),path.join(out,'index.html'))"));const h=fs.readFileSync(new URL('explore.html',import.meta.url),'utf8');assert(h.includes('href="connect.html"'));assert(h.includes('실제 높이와 외관 아님'));});
test('preview quality message validates origin and never enables walk',()=>{const js=fs.readFileSync(new URL('preview-hook.js',import.meta.url),'utf8');assert(js.includes('e.source!==parent||e.origin!==origin'));assert(js.includes("d.type==='quality'&&typeof d.light==='boolean'"));assert(!js.includes("setMode('walk')"));});
''')
patch('precision/publish.mjs',"process.env.GITHUB_REF_NAME!=='jeju-before-web'","!['jeju-before-web','aerial-release-3-6'].includes(process.env.GITHUB_REF_NAME)")
patch('precision/publish.mjs',"'Stage isolated oldtown 3.3 static site; provider not configured'","'Stage isolated oldtown '+VERSION+' aerial site; precision unverified'")
patch('precision/publish.mjs',"const url='https://rawcdn.githack.com/'+repo+'/'+commit+'/index.html';","const base='https://rawcdn.githack.com/'+repo+'/'+commit+'/';\nconst url=base+'connect.html',homeUrl=base+'index.html';")
patch('precision/publish.mjs',"'_precision_site/index.html'","'_precision_site/connect.html'")
patch('precision/publish.mjs',"repository:repo,url,siteBranch","repository:repo,url,homeUrl,explorerUrl:base+'explore.html',siteBranch")
patch('precision/publish.mjs',"sourceBranch:'jeju-before-web'","sourceBranch:process.env.GITHUB_REF_NAME")
(root/'precision/readiness.mjs').write_text('''// Read-only probes. A metadata failure is unknown, never stale success.
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {verifyBundle} from './integrity.mjs';
import {VERSION,PLANNED_URL} from './session.mjs';
const repo='kokoom94-ai/jeju-oldtown-3d';
if(process.env.GITHUB_REPOSITORY!==repo||!['jeju-before-web','aerial-release-3-6'].includes(process.env.GITHUB_REF_NAME))throw Error('Wrong audit target');
let metadata={ok:false,status:null,hasPages:null};
try{
 const headers={Accept:'application/vnd.github+json'};
 // This scoped token is used only to read this repository, never in browser files.
 if(process.env.GITHUB_TOKEN)headers.Authorization='Bearer '+process.env.GITHUB_TOKEN;
 const r=await fetch('https://api.github.com/repos/'+repo,{headers,signal:AbortSignal.timeout(15000)});
 metadata.status=r.status;if(r.ok){metadata.ok=true;metadata.hasPages=(await r.json()).has_pages===true;}
}catch{metadata.error='METADATA_UNAVAILABLE';}
function refs(remote){try{
 const raw=execFileSync('git',['ls-remote','--heads',remote],{encoding:'utf8',timeout:20000,stdio:['ignore','pipe','pipe']});
 return Object.fromEntries(raw.trim().split('\\n').map(l=>l.split(/\\s+/)).filter(a=>a.length===2).map(([sha,ref])=>[ref.replace('refs/heads/',''),sha]));
}catch{return null;}}
const oldExpected={main:'c5578da4d1ba24a8341de512552db69d56c14aba','jeju-before-web':'261619af20ca9e03425f4ce5f02fad2bf0824547','jeju-precision-site':'1d7da70a6e8df70e7f3fa69b898d1fe73ca9d0e2'};
const oldRefs=refs('https://github.com/kokoom94-ai/jeju-now-981.git');
const oldRefsUnchanged=oldRefs?Object.entries(oldExpected).every(([k,v])=>oldRefs[k]===v):null;
const manifest=JSON.parse(await fs.readFile('_precision_site/integrity.json','utf8'));
const integrity=await verifyBundle(PLANNED_URL,manifest);
const checks=integrity.checks,matched=checks.length>0&&checks.every(x=>x.matchesStaged);
const result={version:VERSION,checkedAt:new Date().toISOString(),runId:process.env.GITHUB_RUN_ID,repository:repo,dedicatedUrl:PLANNED_URL,pagesEnabled:metadata.hasPages,metadata,pagesSettingChanged:false,dedicatedSiteMatchesStaged:matched,staticBundleTotal:integrity.total,staticBundlePassed:integrity.passed,httpChecks:checks,oldRefs,oldRefsUnchanged,oldRepositoryWriteOperations:0,keyUsedByAudit:false,providerConfigured:false,sdkLiveTested:false,jejuPrecisionModelsReceived:false,productionReady:false,proxyDeploymentVerified:false,blockers:[...(metadata.hasPages===false?['ENABLE_NEW_REPOSITORY_PAGES']:metadata.hasPages===null?['PAGES_METADATA_UNVERIFIED']:[]),...(matched?[]:['VERIFY_PUBLIC_SITE_BYTES']),'ALIGN_VWORLD_REGISTERED_SERVICE_URL','ENTER_USER_KEY_ON_DEDICATED_SITE','VERIFY_REAL_JEJU_MODELS_AND_GEOMETRY']};
await fs.writeFile('precision/readiness.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({version:VERSION,pagesEnabled:result.pagesEnabled,dedicatedSiteMatchesStaged:matched,oldRefsUnchanged,metadataStatus:metadata.status,productionReady:false}));
''')
(root/'precision/release-summary.mjs').write_text('''import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {VERSION} from './session.mjs';
const names=['browser-result.json','proxy-browser-result.json','inspection-browser-result.json','explore-browser-result.json'];
const browsers=[];
for(const name of names){try{const r=JSON.parse(await fs.readFile('precision/'+name,'utf8'));const checks=r.checks||[];const ok=checks.length>0&&checks.every(c=>c.passed)&&!r.failure&&!(r.errors||[]).length;r.runId=process.env.GITHUB_RUN_ID;r.sourceCommit=process.env.SOURCE_COMMIT;r.currentRunOnly=true;await fs.writeFile('precision/'+name,JSON.stringify(r,null,2));browsers.push({file:name,passed:checks.filter(c=>c.passed).length,total:checks.length,ok});}catch{browsers.push({file:name,passed:0,total:0,ok:false});}}
const read=async n=>{try{return JSON.parse(await fs.readFile('precision/'+n,'utf8'));}catch{return null;}};
const pub=await read('publication.json'),readiness=await read('readiness.json');
const unit=await fs.readFile('precision-qa/unit-tests.txt','utf8').catch(()=>'');
const result={version:VERSION,checkedAt:new Date().toISOString(),runId:process.env.GITHUB_RUN_ID,sourceBranch:process.env.GITHUB_REF_NAME,sourceCommit:process.env.SOURCE_COMMIT||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),unit:{passed:Number(unit.match(/# pass (\\d+)/)?.[1]||0),failed:Number(unit.match(/# fail (\\d+)/)?.[1]||0)},browsers,publicHome:pub?.homeUrl||null,siteCommit:pub?.commit||null,pagesEnabled:readiness?.pagesEnabled??null,dedicatedSiteMatchesStaged:readiness?.dedicatedSiteMatchesStaged??false,oldRefsUnchanged:readiness?.oldRefsUnchanged??null,oldRepositoryWriteOperations:0,actualKeyUsed:false,sdkLiveTested:false,jejuPrecisionModelsReceived:false,geometryVerified:false,productionReady:false};
await fs.writeFile('precision/release-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
if(!browsers.every(r=>r.ok)||!result.unit.passed||result.unit.failed)process.exitCode=1;
''')
print('Reviewed aerial 3.6 sources applied; tests must pass before commit/publication.')
