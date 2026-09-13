"""Verify the actually published dedicated site. No SDK request or user key is allowed."""
from playwright.sync_api import sync_playwright, expect
import pathlib,json,os
base='https://kokoom94-ai.github.io/jeju-oldtown-3d/'
checks=[]; blocked=[]; errors=[]; failure=None

def check(name,value):
    checks.append({'name':name,'passed':bool(value)})
    if not value:raise AssertionError(name)
with sync_playwright() as p:
    exe=next((x for x in ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'] if pathlib.Path(x).exists()),None)
    browser=p.chromium.launch(**({'executable_path':exe} if exe else {}),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    try:
        for width,height in [(1280,900),(390,844)]:
            ctx=browser.new_context(viewport={'width':width,'height':height})
            page=ctx.new_page()
            page.on('pageerror',lambda e: errors.append(type(e).__name__))
            def stop(route):blocked.append(True);route.abort()
            page.route('**/*.vworld.kr/**',stop)
            response=page.goto(base,wait_until='domcontentloaded',timeout=45000)
            check(str(width)+': public HTTP 200',response.status==200)
            page.wait_for_function('window.__JEJU_EXPLORER__?.status.placeCount===32',timeout=30000)
            check(str(width)+': updated JS module version',page.evaluate("window.__JEJU_EXPLORER__.status.version==='3.7.1-sdk-diagnostics'"))
            page.locator('#open-connect').click()
            check(str(width)+': dedicated key input enabled',page.locator('#api-key').is_enabled())
            check(str(width)+': new diagnostic control visible',page.locator('#copy-connection-error').is_visible())
            check(str(width)+': current version visible in connection dialog','3.7.1' in page.locator('#sdk-stage').inner_text())
            check(str(width)+': no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
            page.screenshot(path=f'precision-qa/sdk-public-{width}.png')
            page.locator('#close-connect').click();page.locator('#open-places').click();page.locator('#search').fill('관덕정')
            # The unchanged seed has both Gwandeokjeong and the adjacent parking lot.
            expect(page.locator('#places-list button')).to_have_count(2)
            check(str(width)+': search includes attraction and parking',page.locator('#places-list button').count()==2)
            page.locator('[data-category="attraction"]').click()
            expect(page.locator('#places-list button')).to_have_count(1)
            check(str(width)+': attraction filter selects one result',page.locator('#places-list button').count()==1)
            page.locator('#places-list button').click();check(str(width)+': place detail name','관덕정' in page.locator('#detail-name').inner_text())
            check(str(width)+': no user key or provider called',not blocked)
            ctx.close()
        check('no public browser JavaScript errors',not errors)
    except Exception as e:failure=str(e)[:300]
    finally:browser.close()
r={'checkedAt':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),'url':base,'checks':checks,'passed':sum(c['passed'] for c in checks),'total':len(checks),'failure':failure,'actualKeyUsed':False,'providerRequests':len(blocked),'sdkLiveTested':False,'geometryVerified':False,'scope':'Actual dedicated HTTPS page, JS version, key form and place popup in desktop/mobile Chromium. No live provider connection.'}
pathlib.Path('precision-qa/sdk-public.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print(json.dumps(r,ensure_ascii=False,indent=2));raise SystemExit(1 if failure else 0)
