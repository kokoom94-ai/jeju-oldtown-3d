// Live static preview/browser behavior. No real VWorld key is supplied.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(path.join(process.env.PLAYWRIGHT_ROOT,'node_modules/playwright'));
const publication=JSON.parse(fs.readFileSync('precision/publication.json','utf8'));
const publicURL=new URL('index.html',publication.url).href;
if(!publicURL.startsWith('https://rawcdn.githack.com/kokoom94-ai/jeju-oldtown-3d/'))throw Error('Wrong preview repository');
const dir='precision-qa',checks=[],errors=[],providerRequests=[];fs.mkdirSync(dir,{recursive:true});
const record=(name,ok)=>{checks.push({name,passed:!!ok});if(!ok)throw Error(name);};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'};
function serve(){return new Promise(resolve=>{const root=path.resolve('_precision_site');const s=http.createServer((req,res)=>{try{const pathname=new URL(req.url,'http://local').pathname;const file=path.resolve(root,'.'+decodeURIComponent(pathname.endsWith('/')?pathname+'index.html':pathname));if(!file.startsWith(root+path.sep))throw Error();const data=fs.readFileSync(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}});s.listen(0,'127.0.0.1',()=>resolve(s));});}
function watch(page){page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{const h=new URL(r.url()).hostname;if(h==='vworld.kr'||h.endsWith('.vworld.kr'))providerRequests.push(h);});}
async function ready(page,url){
 const r=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});record('Explorer HTTP 200: '+new URL(url).hostname,r.status()===200);
 try{await page.waitForFunction('Boolean(window.__JEJU_EXPLORER__)',null,{timeout:6000});}catch(error){
  if(new URL(url).hostname!=='rawcdn.githack.com')throw error;
  // The shared host presents its ordinary first-visit warning. Acknowledge the
  // explicit open-page link, as a visitor would; never enter any credential.
  const button=page.getByRole('button',{name:'Open the page',exact:true}),link=page.getByRole('link',{name:'Open the page',exact:true});
  if(await button.count())await button.click();else if(await link.count())await link.click();else throw error;
  record('Shared-host first-visit warning acknowledged without credentials',true);
  await page.waitForFunction('Boolean(window.__JEJU_EXPLORER__)',null,{timeout:30000});
 }
 await page.waitForFunction('window.__JEJU_EXPLORER__?.status.previewReady',null,{timeout:60000});await page.waitForTimeout(1200);
}
const status=page=>page.evaluate('window.__JEJU_EXPLORER__.status');
function previewFrame(page){return page.frames().find(f=>f.url().includes('preview-flight.html'));}
(async()=>{let browser,server,lastPage,failed=null;try{
const executable=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(p=>fs.existsSync(p));
browser=await chromium.launch({...(executable?{executablePath:executable}:{}),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
let ctx=await browser.newContext({viewport:{width:1440,height:900}}),p=lastPage=await ctx.newPage();watch(p);await ready(p,publicURL);
record('Public comparison starts without precision claim',(await status(p)).source==='preview'&&!(await status(p)).sdkReady&&!(await status(p)).productionReady);
record('Public home opens aerial app, not console',await p.locator('#map').count()===1);
record('32 independent POIs loaded',(await status(p)).placeCount===32);
record('Six scene buttons visible',await p.locator('#scene-list button').count()===6);
record('Real comparison WebGL rendered OSM buildings',await previewFrame(p).evaluate('window.__JEJU_DEBUG__.state.buildings===10617&&window.__JEJU_DEBUG__.state.frames>0'));
record('Comparison label explains assumptions',(await p.locator('#source-label').innerText()).includes('추정'));
record('Desktop no horizontal overflow',await p.evaluate('document.documentElement.scrollWidth<=innerWidth'));
record('Desktop external CSS loaded',await p.locator('.topbar').evaluate(el=>getComputedStyle(el).position==='fixed'));
await p.screenshot({path:dir+'/explorer-desktop.png'});
for(const id of ['dongmun','sanjicheon','tapdong','yongduam','airport','gwandeok']){await p.locator(`[data-id="${id}"]`).click();await p.waitForTimeout(150);record('Scene camera responds: '+id,(await status(p)).scene===id&&await previewFrame(p).evaluate('window.__JEJU_FLIGHT_PREVIEW__.status.mode==="overview"'));}
record('Airport and all exploration prohibit walking',!(await status(p)).walkingEnabled&&await previewFrame(p).evaluate('window.__JEJU_FLIGHT_PREVIEW__.status.avatarVisible===false'));
await p.locator('#overhead').click();await p.waitForTimeout(150);record('Overhead view controls actual camera',await previewFrame(p).evaluate('window.__JEJU_FLIGHT_PREVIEW__.status.pitch===1.5'));
await p.locator('#oblique').click();await p.locator('#zoom-in').click();await p.waitForTimeout(150);record('Zoom changes actual camera range',Math.abs((await previewFrame(p).evaluate('window.__JEJU_FLIGHT_PREVIEW__.status.distance'))-500)<1);
await p.locator('#orbit').click();const yaw1=await previewFrame(p).evaluate('window.__JEJU_FLIGHT_PREVIEW__.status.yaw');await previewFrame(p).waitForFunction(start=>Math.abs(window.__JEJU_FLIGHT_PREVIEW__.status.yaw-start)>.01,yaw1,{timeout:10000});const yaw2=await previewFrame(p).evaluate('window.__JEJU_FLIGHT_PREVIEW__.status.yaw');record('Orbit advances actual comparison camera',Math.abs(yaw2-yaw1)>.01);await p.locator('#orbit').click();
await p.locator('#low-angle').click();await p.waitForTimeout(250);record('Low oblique changes comparison camera',await previewFrame(p).evaluate('window.__JEJU_FLIGHT_PREVIEW__.status.pitch===.44'));
await p.locator('#markers').click();await p.waitForTimeout(250);record('Marker toggle changes embedded layer',await previewFrame(p).evaluate('window.__JEJU_FLIGHT_PREVIEW__.status.markersVisible===false'));
await p.locator('#quality').click();await p.waitForTimeout(250);record('Light mode disables expensive shadows',await previewFrame(p).evaluate('window.__JEJU_FLIGHT_PREVIEW__.status.highQuality===false'));
await p.locator('#share-view').click();const sharedLink=await p.locator('#share-link').inputValue();record('Shared scene URL contains bounded camera only',sharedLink.includes('scene=gwandeok')&&sharedLink.includes('pitch=-25')&&!sharedLink.includes('key='));await p.locator('#close-share').click();
await p.locator('#oblique').click();await p.locator('#markers').click();
await p.locator('#tour').click();record('Tour starts and can stop',(await status(p)).tourRunning);await p.locator('#tour').click();record('Tour stopped',!(await status(p)).tourRunning);
await p.locator('#open-places').click();await p.locator('#search').fill('관덕정');record('POI search narrows results',await p.locator('#places-list button').count()===2);await p.locator('#places-list button').first().click();record('POI detail opens',await p.locator('#detail').isVisible());record('Naver link is official search, not claimed API',(await p.locator('#naver').getAttribute('href')).startsWith('https://map.naver.com/p/search/'));
await p.locator('#open-connect').click();record('CDN key field is disabled',await p.locator('#api-key').isDisabled());record('CDN connect is disabled',await p.locator('#connect').isDisabled());await p.evaluate(()=>{document.querySelector('#api-key').value='TEST-ONLY-NOT-A-REAL-KEY-00000';document.querySelector('#connect-form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));});record('DOM submit does not bypass host policy',(await status(p)).source==='preview'&&await p.locator('#api-key').inputValue()==='');await p.locator('#close-connect').click();
await p.evaluate(()=>window.postMessage({channel:'jeju-osm-preview-v1',type:'ready'},location.origin));record('Parent forged message does not mark provider ready',!(await status(p)).sdkReady);
record('Public no-key test sent zero provider requests',providerRequests.length===0);await ctx.close();
ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});p=lastPage=await ctx.newPage();watch(p);await ready(p,publicURL);record('Mobile defaults to light mode',(await status(p)).lightQuality===true);record('Mobile no horizontal overflow',await p.evaluate('document.documentElement.scrollWidth<=innerWidth'));await p.screenshot({path:dir+'/explorer-mobile.png'});await p.locator('[data-id="airport"]').click();record('Mobile horizontal cards remain usable',(await status(p)).scene==='airport');await p.locator('#open-places').click();await p.locator('[data-category="hotel"]').click();record('Mobile hotel filter displays hotels',await p.locator('#places-list button').count()>0);await p.locator('#places-list button').first().click();record('Mobile detail visible',await p.locator('#detail').isVisible());await ctx.close();
server=await serve();const localURL='http://127.0.0.1:'+server.address().port+'/explore.html';ctx=await browser.newContext({viewport:{width:1280,height:900}});p=lastPage=await ctx.newPage();watch(p);await ready(p,localURL);let blocked=0;await p.route('**/*.vworld.kr/**',r=>{blocked++;return r.abort();});await p.locator('#open-connect').click();record('Local own-key input enabled',!(await p.locator('#api-key').isDisabled()));await p.locator('#api-key').fill('TEST-ONLY-NOT-A-REAL-KEY-00000');await p.locator('#confirmed').check();await p.locator('#connect').click();await p.waitForFunction('window.__JEJU_EXPLORER__.status.source==="error"',null,{timeout:15000});record('Blocked fake SDK fails explicitly, never live tested',blocked===1&&!(await status(p)).sdkReady);record('Key field cleared after error',await p.locator('#api-key').inputValue()==='');record('Provider iframe removed on failure',!(await p.locator('#provider').getAttribute('srcdoc')));record('Failure does not silently fall back to guessed buildings',(await status(p)).source==='error');await p.locator('#resume-preview').click();await p.waitForFunction('window.__JEJU_EXPLORER__.status.previewReady',null,{timeout:60000});await p.locator('#open-connect').click();record('Reconnect remains available after return to preview',!(await p.locator('#api-key').isDisabled())&&!(await p.locator('#connect').isDisabled()));await p.locator('#close-connect').click();record('No JS page errors',errors.length===0);
}catch(e){failed=String(e);try{await lastPage?.screenshot({path:dir+'/explorer-failure.png'});}catch{}}
finally{await browser?.close();server?.close();const result={version:'3.6.0-aerial-release',checkedAt:new Date().toISOString(),publicURL,checks,passed:checks.filter(c=>c.passed).length,total:checks.length,errors,failure:failed,realKeyUsed:false,sdkLiveTested:false,jejuPrecisionModelsReceived:false,productionReady:false,scope:'Current static app in Chromium desktop/mobile emulation. OSM estimated comparison; not real phone performance or building accuracy. Fake SDK request aborted before network.'};fs.writeFileSync('precision/explore-browser-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(failed)process.exitCode=1;}
})();
