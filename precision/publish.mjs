// Stage static files in this repository only. This never changes Pages settings.
import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {execFileSync,spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {VERSION,PLANNED_URL,SITE_BRANCH} from './session.mjs';
const repo='kokoom94-ai/jeju-oldtown-3d';
if(process.env.GITHUB_REPOSITORY!==repo||!['jeju-before-web','aerial-release-3-6'].includes(process.env.GITHUB_REF_NAME))throw Error('Wrong repository or branch');
const git=(args,cwd=process.cwd())=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
if(git(['remote','get-url','origin']).replace(/\.git$/,'')!=='https://github.com/'+repo)throw Error('Wrong remote');
const remote=git(['ls-remote','--heads','origin','refs/heads/'+SITE_BRANCH]);
const mainBefore=git(['ls-remote','origin','refs/heads/main']).split(/\s+/)[0];
const sourceCommit=git(['rev-parse','HEAD']);
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'oldtown-site-'));let added=false,commit,staticChanged=false;
try{
 if(remote){git(['fetch','--no-tags','origin','refs/heads/'+SITE_BRANCH]);git(['worktree','add','--detach',temp,'FETCH_HEAD']);}
 else git(['worktree','add','--detach',temp,'HEAD']);
 added=true;
 if(remote){const meta=JSON.parse(await fs.readFile(path.join(temp,'site.json'),'utf8'));if(meta.repository!==repo)throw Error('Refusing to replace unowned site');}
 else git(['checkout','--orphan','oldtown-static-'+process.env.GITHUB_RUN_ID],temp);
 for(const name of await fs.readdir(temp))if(name!=='.git')await fs.rm(path.join(temp,name),{recursive:true,force:true});
 await fs.cp(path.resolve('_precision_site'),temp,{recursive:true});
 git(['add','--all'],temp);
 const diff=spawnSync('git',['diff','--cached','--quiet'],{cwd:temp,stdio:'pipe'});
 if(diff.error||![0,1].includes(diff.status))throw Error('Cannot safely compare staged site');
 staticChanged=diff.status===1;
 if(staticChanged)git(['-c','user.name=JEJU Oldtown build','-c','user.email=oldtown-build@users.noreply.github.com','commit','-m','Stage isolated oldtown '+VERSION+' aerial site; precision unverified'],temp);
 commit=git(['rev-parse','HEAD'],temp);
 if(staticChanged)git(['push','origin','HEAD:refs/heads/'+SITE_BRANCH],temp);
}finally{if(added)git(['worktree','remove','--force',temp]);await fs.rm(temp,{recursive:true,force:true});}
const base='https://rawcdn.githack.com/'+repo+'/'+commit+'/';
const url=base+'connect.html',homeUrl=base+'index.html';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const expected=sha(await fs.readFile('_precision_site/connect.html'));let check={ok:false};
for(let i=0;i<4;i++){
 try{const r=await fetch(url,{signal:AbortSignal.timeout(25000)}),body=Buffer.from(await r.arrayBuffer());check={ok:r.ok&&sha(body)===expected,status:r.status,htmlSha256:sha(body)};if(check.ok)break;}catch{check={ok:false,error:'NETWORK'};}
 await new Promise(r=>setTimeout(r,2000));
}
const mainAfter=git(['ls-remote','origin','refs/heads/main']).split(/\s+/)[0];
const publication={version:VERSION,repository:repo,url,homeUrl,explorerUrl:base+'explore.html',siteBranch:SITE_BRANCH,commit,staticChanged,sourceBranch:process.env.GITHUB_REF_NAME,sourceCommit,runId:process.env.GITHUB_RUN_ID,publishedAt:new Date().toISOString(),publicPreviewVerified:check.ok,publicPreviewKeyEntryEnabled:false,htmlCheck:check,plannedDedicatedUrl:PLANNED_URL,pagesSettingChanged:false,providerConfigured:false,sdkLiveTested:false,jejuPrecisionModelsReceived:false,productionReady:false,proxyDeploymentVerified:false,newMainUnchanged:mainBefore===mainAfter,newMainSha:mainAfter,oldRepositoryWriteOperations:0};
await fs.writeFile('precision/publication.json',JSON.stringify(publication,null,2));
console.log(JSON.stringify(publication,null,2));
if(!check.ok||mainBefore!==mainAfter)throw Error('Preview bytes or protected main check failed');
