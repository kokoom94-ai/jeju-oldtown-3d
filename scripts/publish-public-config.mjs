// The owner accepted a browser-visible JavaScript API key. It is never written to Git.
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';
export async function prepareVisitorConfig(directory,env=process.env){
 const repo='kokoom94-ai/jeju-oldtown-3d',serviceUrl='https://kokoom94-ai.github.io/jeju-oldtown-3d/';
 if(env.GITHUB_REPOSITORY!==repo||env.PUBLIC_KEY_VISIBILITY_ACCEPTED!=='true')throw Error('PUBLISHER_NOT_AUTHORIZED');
 const root=path.resolve(directory),key=env.VWORLD_PUBLIC_KEY?.trim();if(!/^[A-Za-z0-9-]{20,128}$/.test(key||''))throw Error('VWORLD_PUBLIC_KEY_REQUIRED');
 const meta=JSON.parse(await fs.readFile(path.join(root,'site.json'),'utf8')),manifest=JSON.parse(await fs.readFile(path.join(root,'integrity.json'),'utf8'));
 if(meta.repository!==repo||meta.version!=='3.8.0-visitor-navigation'||manifest.repository!==repo||!Array.isArray(manifest.files))throw Error('PUBLISHER_WRONG_SITE');
 const config=manifest.files.find(f=>f.path==='public-connection.json'),site=manifest.files.find(f=>f.path==='site.json');if(!config||!site)throw Error('PUBLISHER_MANIFEST_INVALID');
 const bytes=Buffer.from(JSON.stringify({schema:1,enabled:true,browserVisibleKey:true,serviceUrl,apiKey:key,imagery:env.VWORLD_USE_IMAGERY==='true'}));
 const sha=b=>createHash('sha256').update(b).digest('hex');
 const metaBytes=Buffer.from(JSON.stringify({...meta,providerConfigured:true,publisherConfigured:true,browserVisibleKey:true,sdkLiveTested:false,productionReady:false},null,2));
 // Only the artifact directory changes. The deployment workflow excludes all Git metadata.
 await fs.writeFile(path.join(root,'public-connection.json'),bytes);await fs.writeFile(path.join(root,'site.json'),metaBytes);
 Object.assign(config,{bytes:bytes.length,sha256:sha(bytes)});Object.assign(site,{bytes:metaBytes.length,sha256:sha(metaBytes)});
 await fs.writeFile(path.join(root,'integrity.json'),JSON.stringify(manifest,null,2));
 return {configured:true,browserVisibleKey:true,configSha256:sha(bytes)};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 try{const result=await prepareVisitorConfig(process.argv[2]||'_publish');console.log(JSON.stringify(result));if(process.env.GITHUB_OUTPUT)await fs.appendFile(process.env.GITHUB_OUTPUT,'sha='+result.configSha256+'\n');}
 catch(e){console.error(e.message==='VWORLD_PUBLIC_KEY_REQUIRED'?'Add repository secret VWORLD_PUBLIC_KEY once. No key value was logged.':'Public publisher validation failed. No key value was logged.');process.exitCode=1;}
}
