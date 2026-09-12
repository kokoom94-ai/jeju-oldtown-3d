import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {parsePlaceSeed} from './places.mjs';
import {VERSION,PLANNED_URL,SITE_BRANCH} from './session.mjs';
const out=path.resolve('_precision_site');
const places=parsePlaceSeed(await fs.readFile('precision/places.json','utf8'));
if(places.length!==32)throw Error('Place set changed; review before deployment');
await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
for(const name of ['index.html','app.mjs','bridge.mjs','session.mjs','connection.mjs','places.mjs','inspection.mjs','integrity.mjs','CONNECT.md','HANDOFF.md','RELEASE_3_4.md','RELEASE_3_5.md','flight.mjs','explore.html','explore.mjs','explore.css','preview.css','view.mjs','RELEASE_3_6.md','aerial.mjs','atlas-ui.mjs','RELEASE_3_7.md'])await fs.copyFile('precision/'+name,path.join(out,name));
const html=await fs.readFile(path.join(out,'index.html'),'utf8');
await fs.writeFile(path.join(out,'connect.html'),html.replace(/PRECISION \d+\.\d+/, 'PRECISION '+VERSION.split('-')[0].split('.').slice(0,2).join('.')).replace('<main><aside>','<main><aside><p><a href="explore.html">↗ 전체화면 조감도 탐색 열기</a></p>'));
// The public home is the aerial app, not the developer connection console.
await fs.copyFile(path.join(out,'explore.html'),path.join(out,'index.html'));
const readme=await fs.readFile('README.md','utf8');
await fs.writeFile(path.join(out,'README.md'),readme.replaceAll('(precision/CONNECT.md)','(CONNECT.md)').replaceAll('(precision/HANDOFF.md)','(HANDOFF.md)').replaceAll('(precision/readiness.json)','(https://github.com/kokoom94-ai/jeju-oldtown-3d/blob/jeju-before-web/precision/readiness.json)').replaceAll('(precision/publication.json)','(https://github.com/kokoom94-ai/jeju-oldtown-3d/blob/jeju-before-web/precision/publication.json)'));
await fs.writeFile(path.join(out,'places.json'),JSON.stringify(places,null,2));
await fs.writeFile(path.join(out,'.nojekyll'),'');
// The legacy demo is separate and visibly labelled; it is not provider geometry.
await fs.mkdir(path.join(out,'legacy'),{recursive:true});
for(const name of ['index.html','real.html']){
 const html=await fs.readFile(name,'utf8');
 const banner='<aside style="position:fixed;bottom:8px;left:8px;right:8px;z-index:99999;padding:10px;background:#fff4ce;color:#302710;font:13px sans-serif;border:1px solid #876e17">추정형 도보 베타 · 실제 건물 높이·지붕 검증 전 / <a href="../connect.html">정밀 원본 연결센터로 돌아가기</a></aside>';
 await fs.writeFile(path.join(out,'legacy',name),html.replace('</body>',banner+'</body>'));
}
await fs.cp('realism',path.join(out,'legacy','realism'),{recursive:true,filter:src=>!['acquire.mjs','build.mjs','verify.cjs','publication.json','browser-result.json'].includes(path.basename(src))});
// A dedicated derivative leaves the standalone legacy demo and its data intact.
const previewHTML=(await fs.readFile(path.join(out,'legacy','real.html'),'utf8')).replace('</head>','<link rel="stylesheet" href="../preview.css"></head>').replace('./realism/entry.js','./realism/flight-entry.js');
await fs.writeFile(path.join(out,'legacy','preview-flight.html'),previewHTML);
const entry=await fs.readFile('realism/entry.js','utf8'),hook=await fs.readFile('precision/preview-hook.js','utf8');
const marker='// Read-only diagnostics used by repeatable browser tests.';
if(entry.split(marker).length!==2)throw Error('Legacy preview hook location changed; review before building');
await fs.writeFile(path.join(out,'legacy','realism','flight-entry.js'),entry.replace(marker,hook+'\n'+marker));
await fs.writeFile(path.join(out,'site.json'),JSON.stringify({app:'JEJU:BEFORE precision',repository:'kokoom94-ai/jeju-oldtown-3d',version:VERSION,sourceBranch:process.env.GITHUB_REF_NAME||'aerial-release-3-6',siteBranch:SITE_BRANCH,places:places.length,placeSeed:'precision/places.json',placeSeedRevision:'independent-v1',generatedBuildingFallback:false,providerConfigured:false,sdkLiveTested:false,productionReady:false,plannedDedicatedUrl:PLANNED_URL,homePath:'index.html',diagnosticPath:'connect.html',explorerPath:'explore.html',explorerDefault:'osm-estimated-comparison',explorerWalkingEnabled:false,legacyPath:'legacy/real.html',legacyGeometry:'OSM-derived and estimated; not provider precision',proxyDeploymentVerified:false},null,2));
console.log(JSON.stringify({built:true,places:places.length,version:VERSION,providerConfigured:false,productionReady:false}));

const files=[];
async function inventory(dir=''){for(const e of (await fs.readdir(path.join(out,dir),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const name=path.posix.join(dir,e.name);if(e.isDirectory())await inventory(name);else if(e.isFile()){const bytes=await fs.readFile(path.join(out,name));files.push({path:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}else throw Error('Unsupported static entry');}}
await inventory();
await fs.writeFile(path.join(out,'integrity.json'),JSON.stringify({schema:1,repository:'kokoom94-ai/jeju-oldtown-3d',version:VERSION,files},null,2));
