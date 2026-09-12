// Public HTTPS, no-key checks. Never simulates a successful provider response.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(path.join(process.env.PLAYWRIGHT_ROOT,'node_modules/playwright'));
const publication=JSON.parse(fs.readFileSync('precision/publication.json','utf8'));
if(!publication.url.startsWith('https://rawcdn.githack.com/kokoom94-ai/jeju-oldtown-3d/'))throw Error('Unexpected preview');
const checks=[],errors=[],provider=[];let browser,failure=null;
const record=(name,ok)=>{checks.push({name,passed:!!ok});if(!ok)throw Error(name);};
(async()=>{try{
 const executable=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(f=>fs.existsSync(f));
 browser=await chromium.launch({...(executable?{executablePath:executable}:{}),headless:true,args:['--no-sandbox']});
 const p=await browser.newPage({viewport:{width:1440,height:1050}});
 p.on('pageerror',e=>errors.push(String(e)));
 p.on('request',r=>{const h=new URL(r.url()).hostname;if(h==='vworld.kr'||h.endsWith('.vworld.kr'))provider.push(h);});
 const response=await p.goto(publication.url,{waitUntil:'domcontentloaded',timeout:45000});
 record('Public inspection page HTTP 200',response.status()===200);
 try{await p.waitForFunction('Boolean(window.__JEJU_PRECISION__)',{},{timeout:12000});}catch{
  const b=p.getByRole('button',{name:/continue|proceed|confirm|open|yes|view/i}),a=p.getByRole('link',{name:/continue|proceed|confirm|open|yes|view/i});
  if(await b.count())await b.first().click();else if(await a.count())await a.first().click();
  await p.waitForFunction('Boolean(window.__JEJU_PRECISION__)',{},{timeout:30000});
 }
 await p.waitForFunction('window.__JEJU_PRECISION__.placeCount===32');
 record('Five priority checkpoints present',await p.locator('#inspection-checkpoints button').count()===5);
 record('No-key camera controls disabled',await p.locator('#inspection-checkpoints button:disabled').count()===5&&await p.locator('#inspection-view').isDisabled());
 await p.locator('#check-environment').click();
 record('Capability result never certifies geometry',await p.evaluate('window.__JEJU_PRECISION__.report.inspection.environment.geometryVerified===false'));
 record('Probe leaves no synthetic canvas',await p.locator('canvas').count()===0);
 await p.locator('#check-bundle').click();
 await p.waitForFunction('Boolean(window.__JEJU_PRECISION__.report.inspection.staticBundle)',{},{timeout:180000});
 const report=await p.evaluate('window.__JEJU_PRECISION__.report');
 fs.mkdirSync('precision-qa',{recursive:true});fs.writeFileSync('precision-qa/inspection-diagnostic.json',JSON.stringify(report,null,2));
 record('Live static bundle hashes and MIME types match',report.inspection.staticBundle.ok===true);
 record('Legacy 3D data included in hash verification',report.inspection.staticBundle.checks.some(x=>x.file==='legacy/realism/world-v2.json'&&x.matchesStaged));
 record('File verification does not enable walking or certify models',!report.inspection.walkingEnabled&&!report.sdkReady&&!report.productionReady);
 await p.evaluate(()=>window.postMessage({type:'sdk-phase',phase:'script-loaded',channel:'forged-channel'},location.origin));
 record('Untrusted phase message cannot enter connection timeline',await p.evaluate('window.__JEJU_PRECISION__.report.inspection.connectionTimeline.length===0'));
 await p.locator('#inspection-panel').scrollIntoViewIfNeeded();await p.screenshot({path:'precision-qa/inspection-desktop.png',fullPage:true});
 await p.setViewportSize({width:390,height:844});
 record('Inspection controls do not overflow mobile viewport',await p.evaluate('document.documentElement.scrollWidth<=innerWidth'));
 await p.locator('#inspection-panel').scrollIntoViewIfNeeded();await p.screenshot({path:'precision-qa/inspection-mobile.png',fullPage:true});
 record('No VWorld network request in public no-key checks',provider.length===0);
 record('No browser runtime errors',errors.length===0);
}catch(e){failure=String(e);}finally{if(browser)await browser.close();}
const result={testedAt:new Date().toISOString(),runId:process.env.GITHUB_RUN_ID,url:publication.url,ok:!failure,passed:checks.filter(x=>x.passed).length,checks,errors,failure,providerRequestCount:provider.length,sdkLiveTested:false,jejuPrecisionModelsReceived:false,productionReady:false,scope:'Actual public HTTPS inspection UI and static-file integrity. No successful provider responses or geometry are simulated.'};
fs.mkdirSync('precision-qa',{recursive:true});fs.writeFileSync('precision/inspection-browser-result.json',JSON.stringify(result,null,2));fs.writeFileSync('precision-qa/inspection-browser-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;
})();
