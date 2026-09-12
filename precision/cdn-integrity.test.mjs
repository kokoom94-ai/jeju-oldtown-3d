import test from 'node:test';import assert from 'node:assert/strict';
import {sha256,verifyBundle} from './integrity.mjs';
const body='fixture only',bytes=new TextEncoder().encode(body),file={path:'app.mjs',bytes:bytes.length,sha256:await sha256(bytes)};
const manifest={schema:1,repository:'kokoom94-ai/jeju-oldtown-3d',files:[file]};
const preview='https://rawcdn.githack.com/kokoom94-ai/jeju-oldtown-3d/'+('a'.repeat(40))+'/';
function locatedResponse(url,type='image/jpeg'){const r=new Response(body,{headers:{'content-type':type}});Object.defineProperty(r,'url',{value:url});return r;}
test('CDN binary redirect is checked against exact immutable original URL',async()=>{
 const f={...file,path:'legacy/realism/assets/wall-color.jpg'};
 const m={...manifest,files:[f]};let options;
 const r=await verifyBundle(preview,m,{fetchImpl:async(u,o)=>{options=o;return locatedResponse('https://raw.githubusercontent.com/kokoom94-ai/jeju-oldtown-3d/'+('a'.repeat(40))+'/'+f.path);}});
 assert.equal(options.redirect,'follow');assert.equal(options.credentials,'omit');assert.equal(r.ok,true);assert.equal(r.checks[0].delivery,'cdn-to-identical-github-object');
});
test('CDN redirects to another host or another commit are rejected',async()=>{
 const f={...file,path:'wall.jpg'},m={...manifest,files:[f]};
 for(const url of ['https://evil.example/wall.jpg','https://raw.githubusercontent.com/kokoom94-ai/jeju-oldtown-3d/'+('b'.repeat(40))+'/wall.jpg']){
 const r=await verifyBundle(preview,m,{fetchImpl:async()=>locatedResponse(url)});assert.equal(r.ok,false);assert.equal(r.checks[0].error,'UNEXPECTED_REDIRECT');}
});
test('Pages assets and executable preview files retain redirect rejection',async()=>{
 for(const [base,path] of [[preview,'app.mjs'],['https://kokoom94-ai.github.io/jeju-oldtown-3d/','wall.jpg']]){
 let options;await verifyBundle(base,{...manifest,files:[{...file,path}]},{fetchImpl:async(u,o)=>{options=o;return new Response(body,{headers:{'content-type':'text/javascript'}});}});assert.equal(options.redirect,'error');}
});
