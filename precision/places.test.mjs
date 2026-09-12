import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {parsePlaceSeed} from './places.mjs';
import {parsePlaces} from './bridge.mjs';
const text=fs.readFileSync(new URL('places.json',import.meta.url),'utf8');
const seed=JSON.parse(text),one=seed[0];
test('independent seed preserves all 32 original draft records',()=>{
 assert.deepEqual(parsePlaceSeed(text),parsePlaces(fs.readFileSync(new URL('../index.html',import.meta.url),'utf8')));
 assert.equal(seed.length,32);
});
test('place seed rejects non-JSON and non-arrays',()=>{for(const v of ['<html>', '{}','null'])assert.throws(()=>parsePlaceSeed(v));});
test('place seed rejects empty or excessive arrays',()=>{for(const v of [[],Array(201).fill(one)])assert.throws(()=>parsePlaceSeed(JSON.stringify(v)));});
test('place seed input size is bounded',()=>{assert.throws(()=>parsePlaceSeed(' '.repeat(200001)));assert.throws(()=>parsePlaceSeed(null));});
test('invalid coordinates and empty names do not silently disappear',()=>{
 for(const v of [null,{...one,lon:127},{...one,lat:null},{...one,name:' '},{...one,id:''}])assert.throws(()=>parsePlaceSeed(JSON.stringify([v])));
});
test('duplicate POI identifiers are rejected',()=>assert.throws(()=>parsePlaceSeed(JSON.stringify([one,one]))));
test('overlong identifiers and names cannot be silently truncated',()=>{for(const v of [{...one,id:'x'.repeat(81)},{...one,name:'x'.repeat(101)}])assert.throws(()=>parsePlaceSeed(JSON.stringify([v])));});
test('seed cannot promote draft data to Naver or entrance verification',()=>{
 const p=parsePlaceSeed(JSON.stringify([{...one,naverVerified:true,coordinateStatus:'surveyed',apiKey:'DO-NOT-EXPORT',entranceVerified:true}]))[0];
 assert.equal(p.naverVerified,false);assert.equal(p.coordinateStatus,'approximate');assert(!JSON.stringify(p).includes('DO-NOT-EXPORT'));assert(!('entranceVerified' in p));
});
test('browser never falls back to another project parent HTML',()=>{
 const app=fs.readFileSync(new URL('app.mjs',import.meta.url),'utf8');
 assert(!app.includes("fetch('../index.html'"));assert(app.includes('parsePlaceSeed(await r.text())'));
});
test('build succeeds when legacy root has no embedded JEJU_DATA',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'oldtown-seed-test-'));
 try {
  fs.cpSync(new URL('./',import.meta.url),path.join(root,'precision'),{recursive:true});
  fs.writeFileSync(path.join(root,'index.html'),'<!doctype html><body>Legacy without a data seed</body>');
  fs.writeFileSync(path.join(root,'real.html'),'<!doctype html><body>Legacy fixture</body>');
  fs.writeFileSync(path.join(root,'README.md'),'[Connect](precision/CONNECT.md)');
  fs.mkdirSync(path.join(root,'realism'));fs.writeFileSync(path.join(root,'realism','LICENSES.txt'),'Fixture only');
  execFileSync(process.execPath,['precision/prepare.mjs'],{cwd:root,stdio:'pipe'});
  const site=path.join(root,'_precision_site');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(site,'places.json'),'utf8')),parsePlaceSeed(text));
  assert(fs.existsSync(path.join(site,'places.mjs')));assert(fs.existsSync(path.join(site,'HANDOFF.md')));
  assert(fs.readFileSync(path.join(site,'README.md'),'utf8').includes('(CONNECT.md)'));
 } finally {fs.rmSync(root,{recursive:true,force:true});}
});
