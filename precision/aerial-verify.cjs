// Public static browser QA only. No real key or successful provider response is used.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(path.join(process.env.PLAYWRIGHT_ROOT,'node_modules/playwright'));
const publication=JSON.parse(fs.readFileSync('precision/publication.json','utf8'));
const url=new URL('index.html',publication.url).href;
if(!url.startsWith('https://rawcdn.githack.com/kokoom94-ai/jeju-oldtown-3d/'))throw Error('Unexpected publication');
const checks=[],errors=[],provider=[];let failure=null,browser;
fs.mkdirSync('precision-qa',{recursive:true});
const check=(name,passed)=>{checks.push({name,passed:!!passed});if(!passed)throw Error(name);};
async function ready(p){
 const r=await p.goto(url,{waitUntil:'domcontentloaded',timeout:45000});check('Aerial public HTTP 200',r.status()===200);
 try{await p.waitForFunction('!!window.__JEJU_EXPLORER__',null,{timeout:6000});}catch(e){const b=p.getByRole('button',{name:'Open the page',exact:true}),a=p.getByRole('link',{name:'Open the page',exact:true});if(await b.count())await b.click();else if(await a.count())await a.click();else throw e;}
 await p.waitForFunction('window.__JEJU_EXPLORER__?.status.previewReady',null,{timeout:60000});
}
(async()=>{try{
 const executable=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(f=>fs.existsSync(f));
 browser=await chromium.launch({...(executable?{executablePath:executable}:{}),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 for(const [name,width,height] of [['desktop',1440,900],['mobile',390,844]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:name==='mobile',hasTouch:name==='mobile',deviceScaleFactor:1});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(String(e)));p.on('request',r=>{const h=new URL(r.url()).hostname;if(h==='vworld.kr'||h.endsWith('.vworld.kr'))provider.push(h);});
  await ready(p);check(name+' current release',await p.evaluate('window.__JEJU_EXPLORER__.status.version==="3.7.0-vworld-aerial"'));
  check(name+' no horizontal overflow',await p.evaluate('document.documentElement.scrollWidth<=innerWidth'));
  await p.screenshot({path:'precision-qa/aerial-'+name+'.png'});
  await p.locator('#open-atlas').click();check(name+' layer panel opens',await p.locator('#atlas-dialog').isVisible());
  check(name+' satellite disabled before authorized connection',await p.locator('[data-aerial-mode="satellite"]').isDisabled());
  check(name+' building and lighting disabled before SDK',await p.locator('#atlas-buildings').isDisabled()&&await p.locator('[data-lighting="sunset"]').isDisabled());
  check(name+' no fabricated tile receipt',(await p.locator('#atlas-imagery').innerText())==='수신 미확인');
  check(name+' no fabricated terrain sample',(await p.locator('#atlas-terrain').innerText())==='지형 수신 미확인');
  check(name+' estimated background explicitly separate',(await p.locator('#atlas-context').innerText()).includes('추정형 비교'));
  await p.evaluate(()=>window.postMessage({type:'aerial-status',channel:'forged',status:{imageryDecoded:999,productionReady:true}},location.origin));await p.waitForTimeout(80);
  check(name+' forged parent message rejected',await p.evaluate('window.__JEJU_EXPLORER__.status.aerial.imageryDecoded===0'));
  const downloadPromise=p.waitForEvent('download');await p.locator('#atlas-export').click();const download=await downloadPromise;const text=fs.readFileSync(await download.path(),'utf8'),report=JSON.parse(text);
  check(name+' exported report has no key or false accuracy',!text.includes('apiKey')&&!text.includes('/wmts/')&&!report.productionReady&&!report.geometryVerified&&report.aerial.imageryDecoded===0&&report.captureDate===null);
  await p.screenshot({path:'precision-qa/aerial-'+name+'-layers.png'});
  await p.locator('#atlas-connect').click();check(name+' layer button opens own connection form',await p.locator('#connect-dialog').isVisible());
  check(name+' own-key input blocked on shared CDN',await p.locator('#api-key').isDisabled()&&await p.locator('#connect').isDisabled());
  check(name+' imagery permission is explicit',await p.locator('#use-imagery').isChecked());
  await p.locator('#close-connect').click();await p.locator('#north').click();check(name+' north control retains map',await p.evaluate('window.__JEJU_EXPLORER__.status.previewReady'));
  await context.close();
 }
 check('Zero provider requests during public no-key QA',provider.length===0);check('No browser runtime errors',errors.length===0);
}catch(e){failure=String(e);}finally{
 const result={version:'3.7.0-vworld-aerial',runId:process.env.GITHUB_RUN_ID,sourceCommit:process.env.SOURCE_COMMIT,checkedAt:new Date().toISOString(),url,checks,passed:checks.filter(c=>c.passed).length,total:checks.length,errors,failure,providerRequests:provider.length,actualKeyUsed:false,sdkLiveTested:false,jejuPrecisionModelsReceived:false,productionReady:false,scope:'Actual public layer UI in desktop/mobile Chromium emulation; no successful SDK or imagery response simulated.'};
 fs.writeFileSync('precision/aerial-browser-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 // Read references as public pages, not as reusable source or credentials.
 const references=[];
 if(browser)for(const [name,referenceURL] of [['tinyseoul','https://tinyseoul.com/'],['seoulatlas','https://seoul-3d-atlas.synabreu.chatgpt.site/']]){
  const context=await browser.newContext({viewport:{width:1440,height:900}});const p=await context.newPage();
  try{const r=await p.goto(referenceURL,{waitUntil:'domcontentloaded',timeout:25000});await p.waitForTimeout(5000);references.push({name,url:referenceURL,httpStatus:r?.status(),title:await p.title(),controls:await p.locator('h1,h2,button,label,select').allTextContents()});await p.screenshot({path:'precision-qa/reference-'+name+'.png'});}catch{references.push({name,url:referenceURL,readable:false,error:'PUBLIC_REFERENCE_UNAVAILABLE'});}finally{await context.close();}
 }
 fs.writeFileSync('precision-qa/reference-inspection.json',JSON.stringify({checkedAt:new Date().toISOString(),references},null,2));
 await browser?.close();if(failure)process.exitCode=1;
}})();
