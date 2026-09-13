"""Mouse-driven rendered-camera tests, not a live VWorld or geometry certificate.
The comparison uses real Three.js and retained OSM geometry. Provider tests use
real Cesium with explicit FAKE SDK, terrain and public-key configuration fixtures.
"""
import os,json,pathlib,functools,threading,http.server,shutil,math,mimetypes
from playwright.sync_api import sync_playwright,expect
root=pathlib.Path('_precision_site').resolve();out=pathlib.Path('precision-qa');out.mkdir(exist_ok=True)
cesium=pathlib.Path(os.environ['TEST_CESIUM_ROOT'])/'node_modules/cesium/Build/Cesium'
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start()
base=os.environ.get('VERIFY_BASE_URL',f'http://127.0.0.1:{server.server_port}/');label='public' if os.environ.get('VERIFY_BASE_URL') else 'candidate'
checks=[];errors=[];failure=None;measurements=[]
def check(name,value):
 checks.append({'name':name,'passed':bool(value)})
 if not value:raise AssertionError(name)
def heading_delta(a,b):return (b-a+180)%360-180
fixture="""
window.CESIUM_BASE_URL='/test-cesium/';document.write('<script src="/test-cesium/Cesium.js"><\\/script>');
setTimeout(()=>{const R=window.Cesium;window.Cesium={...R,EllipsoidTerrainProvider:class TestOnlyNeverMatches{}};
window.vw={CameraPosition:class{},CoordZ:class{},Direction:class{},Map:class{
setOption(){}setMapId(){}setInitPosition(){}setLogoVisible(){}getLayerElement(){return {show(){},hide(){}};}
start(){const v=new R.Viewer('vmap',{baseLayer:false,baseLayerPicker:false,geocoder:false,homeButton:false,sceneModePicker:false,navigationHelpButton:false,animation:false,timeline:false,fullscreenButton:false,skyBox:false,terrainProvider:new R.EllipsoidTerrainProvider()});
v.scene.globe.getHeight=()=>25;v.scene.sampleHeight=()=>25;Object.defineProperty(v.scene,'sampleHeightSupported',{get:()=>true});Object.defineProperty(v.scene.globe,'tilesLoaded',{get:()=>true});
window.ws3d={viewer:v};window.__fixtureViewer=v;window.vw.ws3dInitCallBack();}}};},300);
"""
key='TEST-ONLY-NOT-A-REAL-KEY-00000';network={'schema':1,'paths':[{'highway':'footway','bridge':False,'tunnel':False,'layer':0,'coords':[[126.5212,33.51325],[126.5222,33.51325]]}],'buildings':[]}
with sync_playwright() as pw:
 exe=next((x for x in ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'] if pathlib.Path(x).exists()),None)
 browser=pw.chromium.launch(**({'executable_path':exe} if exe else {}),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 try:
  for provider in [False,True]:
   for width,height in [(1280,900),(390,844)]:
    tag=f'{label}-{width}-'+('Cesium-fixture' if provider else 'OSM-actual');ctx=browser.new_context(viewport={'width':width,'height':height});page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)[:180]))
    if provider:
     def serve_cesium(route):
      name=route.request.url.split('/test-cesium/',1)[1].split('?',1)[0];p=(cesium/name).resolve()
      if not p.is_relative_to(cesium.resolve()) or not p.is_file():return route.abort()
      route.fulfill(body=p.read_bytes(),content_type=mimetypes.guess_type(str(p))[0] or 'application/octet-stream')
     page.route('**/test-cesium/**',serve_cesium)
     page.route('**/*.vworld.kr/**',lambda r:r.fulfill(content_type='text/javascript',body=fixture) if 'webglMapInit.js.do' in r.request.url else r.abort())
     page.route('**/public-connection.json',lambda r:r.fulfill(content_type='application/json',body=json.dumps({'schema':1,'enabled':True,'browserVisibleKey':True,'serviceUrl':'https://kokoom94-ai.github.io/jeju-oldtown-3d/','apiKey':key,'imagery':False})))
     page.route('**/walk-network.json',lambda r:r.fulfill(content_type='application/json',body=json.dumps(network)))
    else:page.route('**/*.vworld.kr/**',lambda r:r.abort())
    response=page.goto(base,wait_until='domcontentloaded',timeout=45000);check(tag+' HTTP 200',response.status==200)
    page.wait_for_function('window.__JEJU_EXPLORER__?.status.'+('sdkReady' if provider else 'previewReady'),timeout=75000)
    page.wait_for_function('window.__JEJU_EXPLORER__.status.navigation!==null',timeout=15000);page.wait_for_timeout(1800)
    check(tag+' current JS',page.evaluate("window.__JEJU_EXPLORER__.status.version==='3.8.0-visitor-navigation'"))
    frame=page.frame_locator('#provider' if provider else '#preview');canvas=frame.locator('canvas').first;box=canvas.bounding_box();check(tag+' rendered canvas',bool(box) and box['width']>100)
    # On narrow screens deliberately choose the uncovered center, not a toolbar.
    x=width*.64;y=height*.54
    def nav():return page.evaluate('window.__JEJU_EXPLORER__.status.navigation')
    def cam():
     return frame.locator('body').evaluate('()=>{const c=window.__fixtureViewer.camera;return {heading:c.heading,pitch:c.pitch,x:c.positionWC.x,y:c.positionWC.y,z:c.positionWC.z}}') if provider else frame.locator('body').evaluate('()=>window.__JEJU_FLIGHT_PREVIEW__.status')
    before=nav();camera_before=cam();page.screenshot(path=str(out/(tag+'-before.png')))
    page.mouse.move(x,y);page.mouse.down();page.mouse.move(x-90,y+25,steps=12);page.mouse.up();page.wait_for_timeout(250)
    after=nav();camera_after=cam();check(tag+' left drag changes heading and tilt',abs(heading_delta(before['heading'],after['heading']))>15 and abs(after['pitch']-before['pitch'])>2)
    check(tag+' actual rendered camera changes',camera_before!=camera_after)
    total=0
    for i in range(12):
     h=nav()['heading'];page.mouse.move(x,y);page.mouse.down();page.mouse.move(x-100,y,steps=4);page.mouse.up();page.wait_for_timeout(60);total+=abs(heading_delta(h,nav()['heading']))
    check(tag+' mouse orbit exceeds 360 degrees',total>360)
    page.screenshot(path=str(out/(tag+'-after.png')));measurements.append({'test':tag,'rotationDegrees':total,'before':before,'after':nav(),'cameraBefore':camera_before,'cameraAfter':cam()})
    before=nav();page.mouse.move(x,y);page.mouse.down(button='right');page.mouse.move(x-40,y+12,steps=5);page.mouse.up(button='right');page.wait_for_timeout(120);after=nav()
    check(tag+' right drag pans',abs(after['lon']-before['lon'])>1e-6)
    page.mouse.wheel(0,-200);page.wait_for_timeout(150);check(tag+' wheel zoom',nav()['height']<after['height'])
    h=nav()['heading'];page.locator('#zoom-in').click();page.wait_for_timeout(150);check(tag+' zoom button keeps heading',abs(heading_delta(h,nav()['heading']))<.01)
    page.locator('#north').click();page.wait_for_timeout(150);check(tag+' north reset',abs(nav()['heading'])<.01)
    page.locator('#drag-mode').click();page.wait_for_timeout(100);before=nav();page.mouse.move(x,y);page.mouse.down();page.mouse.move(x-40,y,steps=4);page.mouse.up();page.wait_for_timeout(100);check(tag+' selectable left pan',abs(nav()['lon']-before['lon'])>1e-6);page.locator('#drag-mode').click()
    page.locator('#clean-view').click();check(tag+' map-only',not page.locator('.journey').is_visible());page.locator('#clean-view').click()
    if provider:
     check(tag+' auto connection fixture has no key form',page.evaluate('window.__JEJU_EXPLORER__.status.publisherConfigured') and not page.locator('#connect-dialog').is_visible())
     page.locator('#scene-list [data-id="gwandeok"]').click();page.wait_for_timeout(1700);page.locator('#walk-start').click();page.locator('#walk-confirm').click();page.wait_for_function('window.__JEJU_EXPLORER__.status.experimentalWalk.active',timeout=15000)
     check(tag+' original authored traveler',frame.locator('body').evaluate("()=>window.__fixtureViewer.entities.values.filter(x=>x.id.startsWith('jeju-traveler:')).length") ==7)
     page.keyboard.down('KeyD');page.wait_for_timeout(950);page.keyboard.up('KeyD');check(tag+' keyboard moves traveler',page.evaluate('window.__JEJU_EXPLORER__.status.experimentalWalk.distance')>.1)
     page.locator('[data-walk-camera="eye-level"]').click();page.wait_for_timeout(150)
     check(tag+' eye-height camera',abs(frame.locator('body').evaluate('()=>window.__fixtureViewer.camera.positionCartographic.height')-26.68)<.15)
     check(tag+' traveler hidden at eye level',frame.locator('body').evaluate("()=>window.__fixtureViewer.entities.values.filter(x=>x.id.startsWith('jeju-traveler:')).every(x=>!x.show)"))
     page.locator('#walk-exit').click();page.wait_for_timeout(150);check(tag+' exit removes traveler',frame.locator('body').evaluate("()=>window.__fixtureViewer.entities.values.filter(x=>x.id.startsWith('jeju-traveler:')).length")==0)
     page.locator('#scene-list [data-id="airport"]').click();page.wait_for_timeout(1600);page.locator('#walk-start').click();page.locator('#walk-confirm').click();page.wait_for_timeout(300);check(tag+' airport rejected',page.evaluate("window.__JEJU_EXPLORER__.status.experimentalWalk.code==='OUTSIDE_EXPERIMENT_AREA'"))
    else:
     page.locator('#open-connect').click();check(tag+' real dedicated key field',page.locator('#api-key').is_enabled());page.locator('#close-connect').click();page.locator('#open-places').click();page.locator('#search').fill('관덕정');page.locator('[data-category="attraction"]').click();expect(page.locator('#places-list button')).to_have_count(1);page.locator('#places-list button').click();check(tag+' place popup','관덕정' in page.locator('#detail-name').inner_text())
    check(tag+' no key in storage or diagnostic',page.evaluate(f'localStorage.length===0&&sessionStorage.length===0&&!JSON.stringify(window.__JEJU_EXPLORER__.status).includes("{key}")'))
    check(tag+' no page overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'));ctx.close()
  check('no unexpected runtime errors',not errors)
 except Exception as e:failure=str(e)[:600]
 finally:browser.close();server.shutdown()
report={'checks':checks,'passed':sum(c['passed'] for c in checks),'total':len(checks),'failure':failure,'errors':errors,'measurements':measurements,'scope':label+' HTTP and actual mouse input; Three.js retained OSM data; Cesium engine with explicit SDK/terrain/config fixtures','actualKeyUsed':False,'actualVWorldModelsVerified':False,'productionReady':False}
(out/('visitor-'+label+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2));raise SystemExit(1 if failure else 0)
