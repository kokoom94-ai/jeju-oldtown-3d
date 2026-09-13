"""Local mocked adapter/browser regressions only. No actual VWorld key, imagery or geometry."""
import functools, http.server, threading, pathlib, json, os
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path('_precision_site').resolve()
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
threading.Thread(target=srv.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{srv.server_port}/'
checks=[]; failures=[]
def check(name, ok):
    checks.append({'name':name,'passed':bool(ok)})
    if not ok: raise AssertionError(name)
# Deliberate fixture: not a real SDK and not evidence of model reception.
fixture="""
let vw, ws3d, Cesium;
setTimeout(()=>{
 if(!location.pathname.endsWith('/sdk-frame.html'))throw new Error('fixture requires real document URL');
 const viewer={scene:{globe:{},canvas:document.createElement('canvas')},camera:{flyTo(){}},entities:{add(){},getById(){}}};
 Cesium={ScreenSpaceEventHandler:class{setInputAction(){}destroy(){}},ScreenSpaceEventType:{LEFT_CLICK:1},Cartesian3:{fromDegrees:(...v)=>v},Math:{toRadians:x=>x*Math.PI/180},Color:{fromCssColorString:x=>x,WHITE:'white',BLACK:'black'},HeightReference:{CLAMP_TO_GROUND:1},Cartesian2:class{},DistanceDisplayCondition:class{}};
 ws3d={};vw={CameraPosition:class{},CoordZ:class{},Direction:class{},Map:class{setOption(){THROW_CONFIG}setMapId(id){window.__mapId=id;}setInitPosition(){}setLogoVisible(){}start(){ws3d.viewer=viewer;vw.ws3dInitCallBack();}}};
},450);
"""
with sync_playwright() as pw:
    exe=next((p for p in ['/usr/bin/chromium','/usr/bin/google-chrome','/usr/bin/google-chrome-stable'] if pathlib.Path(p).exists()),None)
    browser=pw.chromium.launch(**({'executable_path':exe} if exe else {}),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    try:
        for case in ['network','delayed-lexical','configure-error','provider-rejection','frame-404']:
            context=browser.new_context(viewport={'width':1280,'height':900})
            page=context.new_page(); errors=[]; requested=[]
            page.on('pageerror',lambda e: errors.append(type(e).__name__))
            # This suite isolates the connection UI, not OSM rendering.
            page.route('**/legacy/preview-flight.html*',lambda r:r.fulfill(content_type='text/html',body='<script>parent.postMessage({channel:"jeju-osm-preview-v1",type:"ready"},location.origin)</script>'))
            def provider(route):
                requested.append(route.request.url.split('?')[0])
                if case=='network': route.abort();return
                if case=='provider-rejection': route.fulfill(content_type='text/javascript',body="alert('등록 도메인이 허용되지 않았습니다. TEST-ONLY');");return
                code=fixture.replace('THROW_CONFIG',"throw new TypeError('DO-NOT-EXPORT-THIS-SECRET');" if case=='configure-error' else '')
                route.fulfill(content_type='text/javascript',body=code)
            page.route('**/*.vworld.kr/**',provider)
            if case=='frame-404': page.route('**/sdk-frame.html*',lambda r:r.fulfill(status=404,body='Not Found'))
            page.goto(base,wait_until='domcontentloaded');page.wait_for_function('window.__JEJU_EXPLORER__?.status.placeCount===32')
            check(case+': no automatic SDK request',not requested)
            page.locator('#open-connect').click();page.locator('#api-key').fill('TEST-ONLY-NOT-A-REAL-KEY-00000');page.locator('#use-imagery').uncheck();page.locator('#confirmed').check();page.locator('#connect').click()
            if case=='delayed-lexical':
                page.wait_for_function('window.__JEJU_EXPLORER__.status.sdkReady===true',timeout=10000)
                f=page.locator('#provider').content_frame
                check('late global lexical SDK classes are supported',page.evaluate('window.__JEJU_EXPLORER__.status.sdkReady'))
                check('SDK executes with a real HTTP URL, never about:srcdoc',f.locator('body').evaluate("()=>location.protocol==='http:' && location.pathname.endsWith('/sdk-frame.html')"))
                check('explicit official map id setter applied',f.locator('body').evaluate("()=>window.__mapId==='vmap'"))
                check('no srcdoc on parent iframe',page.locator('#provider').get_attribute('srcdoc') is None)
            else:
                page.wait_for_function('window.__JEJU_EXPLORER__.status.source==="error"',timeout=18000)
                s=page.evaluate('window.__JEJU_EXPLORER__.status');expect={'network':'SDK_NETWORK_FAILED','configure-error':'SDK_OPTIONS_FAILED','provider-rejection':'PROVIDER_DOMAIN_REJECTED','frame-404':'FRAME_LOAD_FAILED'}[case]
                check(case+': distinct error code preserved',s['connection']['failureCode']==expect)
                check(case+': visible error code',expect in page.locator('#connect-status').inner_text())
                check(case+': SDK not marked ready',not s['sdkReady'])
                check(case+': stays failed, no fallback to guessed models',s['source']=='error')
                check(case+': diagnostic excludes raw secret text','DO-NOT-EXPORT' not in json.dumps(s) and 'TEST-ONLY' not in json.dumps(s))
                if case=='configure-error':check('precise map configuration stage retained',s['connection']['diagnostic']['stage']=='map-configure')
                if case=='network':
                    pathlib.Path('precision-qa').mkdir(exist_ok=True)
                    page.screenshot(path='precision-qa/sdk-failure-desktop.png')
                    page.set_viewport_size({'width':390,'height':844})
                    check('failure modal has no mobile horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
                    page.screenshot(path='precision-qa/sdk-failure-mobile.png')
            check(case+': key input cleared',page.locator('#api-key').input_value()=='')
            check(case+': no key persisted in browser storage',page.evaluate('localStorage.length===0&&sessionStorage.length===0'))
            check(case+': no client runtime exceptions',not errors)
            check(case+': geometry not certified',not page.evaluate('window.__JEJU_EXPLORER__.status.productionReady'))
            context.close()
    except Exception as e:
        failures.append(str(e)[:300])
    finally:
        browser.close();srv.shutdown()
report={'checks':checks,'passed':sum(x['passed'] for x in checks),'total':len(checks),'failures':failures,'actualKeyUsed':False,'actualProviderRequests':0,'geometryVerified':False,'scope':'Local browser with explicit SDK and preview fixtures. Not actual provider/model reception.'}
pathlib.Path('precision-qa').mkdir(exist_ok=True);pathlib.Path('precision-qa/sdk-regression.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'passed':report['passed'],'total':len(checks),'failures':failures},ensure_ascii=False))
raise SystemExit(1 if failures else 0)
