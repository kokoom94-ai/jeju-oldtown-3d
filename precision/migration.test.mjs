import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {PLANNED_URL,SETTINGS_URL,hostPolicy,VERSION} from './session.mjs';
import {PROXY_ORIGIN} from './connection.mjs';
test('new repository address is used consistently',()=>{assert.equal(PLANNED_URL,'https://kokoom94-ai.github.io/jeju-oldtown-3d/');assert.equal(SETTINGS_URL,'https://github.com/kokoom94-ai/jeju-oldtown-3d/settings/pages');assert.equal(VERSION,'3.7.1-sdk-diagnostics');});
test('exact dedicated page and index path accepted, old site rejected',()=>{for(const u of [PLANNED_URL,PLANNED_URL+'index.html'])assert.equal(hostPolicy(u).canConnect,true);assert.equal(hostPolicy('https://kokoom94-ai.github.io/jeju-now-981/').canConnect,false);});
test('SDK proxy hostname belongs to isolated configuration but is not a deployment assertion',()=>assert.equal(PROXY_ORIGIN,'https://jeju-oldtown-3d-proxy.onrender.com'));
test('active browser modules no longer reference old repository',()=>{for(const p of ['session.mjs','app.mjs','bridge.mjs','connection.mjs','index.html'])assert(!fs.readFileSync(new URL(p,import.meta.url),'utf8').includes('jeju-now-981'));});
test('legacy link is local to isolated bundle',()=>assert(fs.readFileSync(new URL('index.html',import.meta.url),'utf8').includes('href="legacy/real.html"')));
test('old deployment sessions and credentials not copied',()=>{for(const p of ['../.deployment','../deploy','../.github/workflows/jeju-before-publish.yml','./.env'])assert(!fs.existsSync(new URL(p,import.meta.url)));});
