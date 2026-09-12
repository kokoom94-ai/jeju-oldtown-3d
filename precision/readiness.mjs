// Read-only probes. A metadata failure is unknown, never stale success.
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {verifyBundle} from './integrity.mjs';
import {VERSION,PLANNED_URL} from './session.mjs';
const repo='kokoom94-ai/jeju-oldtown-3d';
if(process.env.GITHUB_REPOSITORY!==repo||!['jeju-before-web','aerial-release-3-6','vworld-aerial-3-7'].includes(process.env.GITHUB_REF_NAME))throw Error('Wrong audit target');
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
 return Object.fromEntries(raw.trim().split('\n').map(l=>l.split(/\s+/)).filter(a=>a.length===2).map(([sha,ref])=>[ref.replace('refs/heads/',''),sha]));
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
