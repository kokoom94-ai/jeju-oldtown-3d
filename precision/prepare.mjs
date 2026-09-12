import fs from 'node:fs/promises';
import path from 'node:path';
import {parsePlaces} from './bridge.mjs';
import {VERSION,PLANNED_URL,SITE_BRANCH} from './session.mjs';
const out=path.resolve('_precision_site');
const places=parsePlaces(await fs.readFile('index.html','utf8'));
if(places.length!==32)throw Error('Place set changed; review before deployment');
await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
for(const name of ['index.html','app.mjs','bridge.mjs','session.mjs','connection.mjs','CONNECT.md'])await fs.copyFile('precision/'+name,path.join(out,name));
await fs.copyFile('README.md',path.join(out,'README.md'));
await fs.writeFile(path.join(out,'places.json'),JSON.stringify(places,null,2));
await fs.writeFile(path.join(out,'.nojekyll'),'');
// The legacy demo is separate and visibly labelled; it is not provider geometry.
await fs.mkdir(path.join(out,'legacy'),{recursive:true});
for(const name of ['index.html','real.html']){
 const html=await fs.readFile(name,'utf8');
 const banner='<aside style="position:fixed;bottom:8px;left:8px;right:8px;z-index:99999;padding:10px;background:#fff4ce;color:#302710;font:13px sans-serif;border:1px solid #876e17">추정형 도보 베타 · 실제 건물 높이·지붕 검증 전 / <a href="../index.html">정밀 원본 연결센터로 돌아가기</a></aside>';
 await fs.writeFile(path.join(out,'legacy',name),html.replace('</body>',banner+'</body>'));
}
await fs.cp('realism',path.join(out,'legacy','realism'),{recursive:true,filter:src=>!['acquire.mjs','build.mjs','verify.cjs','publication.json','browser-result.json'].includes(path.basename(src))});
await fs.writeFile(path.join(out,'site.json'),JSON.stringify({app:'JEJU:BEFORE precision',repository:'kokoom94-ai/jeju-oldtown-3d',version:VERSION,sourceBranch:'jeju-before-web',siteBranch:SITE_BRANCH,places:places.length,generatedBuildingFallback:false,providerConfigured:false,sdkLiveTested:false,productionReady:false,plannedDedicatedUrl:PLANNED_URL,legacyPath:'legacy/real.html',legacyGeometry:'OSM-derived and estimated; not provider precision',proxyDeploymentVerified:false},null,2));
console.log(JSON.stringify({built:true,places:places.length,version:VERSION,providerConfigured:false,productionReady:false}));
