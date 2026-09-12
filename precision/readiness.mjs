// Read-only public probes, no API keys and no authenticated provider requests.
import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
import {VERSION,PLANNED_URL} from './session.mjs';
const repo='kokoom94-ai/jeju-oldtown-3d';
if(process.env.GITHUB_REPOSITORY!==repo||process.env.GITHUB_REF_NAME!=='jeju-before-web')throw Error('Wrong audit target');
const api=async p=>{const r=await fetch('https://api.github.com/repos/'+p,{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Public metadata HTTP '+r.status);return r.json();};
const [meta,oldMain,newMain]=await Promise.all([api(repo),api('kokoom94-ai/jeju-now-981/git/ref/heads/main'),api(repo+'/git/ref/heads/main')]);
const hash=b=>createHash('sha256').update(b).digest('hex');
const checks=await Promise.all(['index.html','app.mjs','bridge.mjs','session.mjs','connection.mjs','places.mjs','places.json','site.json','legacy/real.html'].map(async name=>{
 try{const r=await fetch(new URL(name==='index.html'?'':name,PLANNED_URL),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});const b=Buffer.from(await r.arrayBuffer());return {file:name,status:r.status,matchesStaged:r.ok&&hash(b)===hash(await fs.readFile('_precision_site/'+name))};}catch{return {file:name,status:null,matchesStaged:false};}
}));
const result={version:VERSION,checkedAt:new Date().toISOString(),runId:process.env.GITHUB_RUN_ID,repository:repo,dedicatedUrl:PLANNED_URL,pagesEnabled:meta.has_pages===true,pagesSettingChanged:false,dedicatedSiteMatchesStaged:checks.every(x=>x.matchesStaged),httpChecks:checks,oldMainSha:oldMain.object.sha,oldMainUnchanged:oldMain.object.sha==='c5578da4d1ba24a8341de512552db69d56c14aba',newMainSha:newMain.object.sha,newMainUnchanged:newMain.object.sha==='3589d2b2ef64987b9d6be8fcd006305e8d3620a9',oldRepositoryWriteOperations:0,keyUsedByAudit:false,providerConfigured:false,sdkLiveTested:false,jejuPrecisionModelsReceived:false,productionReady:false,proxyDeploymentVerified:false,blockers:[...(meta.has_pages?[]:['ENABLE_NEW_REPOSITORY_PAGES']),...(checks.every(x=>x.matchesStaged)?[]:['VERIFY_PUBLIC_SITE_BYTES']),'ALIGN_VWORLD_REGISTERED_SERVICE_URL','ENTER_USER_KEY_ON_DEDICATED_SITE','VERIFY_REAL_JEJU_MODELS_AND_GEOMETRY']};
await fs.writeFile('precision/readiness.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
if(!result.oldMainUnchanged||!result.newMainUnchanged)throw Error('Main changed concurrently; inspect before claiming preservation');
