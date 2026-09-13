// Owner accepted browser-visible JavaScript keys. No credentials in source commits.
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
export async function configurePublic(directory,env=process.env){
 if(env.PUBLIC_KEY_VISIBILITY_ACCEPTED!=='true')throw Error('Browser visibility acceptance required');
 if(env.GITHUB_REPOSITORY!=='kokoom94-ai/jeju-oldtown-3d')throw Error('Wrong repository');
 const root=path.resolve(directory),meta=JSON.parse(await fs.readFile(path.join(root,'site.json'),'utf8'));if(meta.repository!==env.GITHUB_REPOSITORY)throw Error('Wrong site');
 const key=env.VWORLD_PUBLIC_KEY?.trim();if(!/^[A-Za-z0-9-]{20,128}$/.test(key||''))throw Error('VWORLD_PUBLIC_KEY missing or invalid');
 const manifest=JSON.parse(await fs.readFile(path.join(root,'integrity.json'),'utf8')),entry=manifest.files.find(f=>f.path==='public-connection.json');if(!entry)throw Error('Missing manifest entry');
 const bytes=Buffer.from(JSON.stringify({schema:1,enabled:true,browserVisibleKey:true,serviceUrl:'https://kokoom94-ai.github.io/jeju-oldtown-3d/',apiKey:key,imagery:env.VWORLD_USE_IMAGERY==='true'}));
 await fs.writeFile(path.join(root,'public-connection.json'),bytes);entry.bytes=bytes.length;entry.sha256=createHash('sha256').update(bytes).digest('hex');await fs.writeFile(path.join(root,'integrity.json'),JSON.stringify(manifest));return {configured:true,browserVisibleKey:true};
}
if(process.argv[1]&&path.resolve(process.argv[1])===new URL(import.meta.url).pathname){try{console.log(JSON.stringify(await configurePublic(process.argv[2]||'_publish')));}catch{console.error('Publisher configuration unavailable; no credential value is logged.');process.exitCode=1;}}
