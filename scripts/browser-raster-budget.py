"""Reduce software-GPU raster load while preserving real mouse coordinates and assertions."""
from pathlib import Path
p=Path('scripts/verify-visitor-browser.py');s=p.read_text()
if 'softwareRasterScale' not in s:
 s=s.replace("viewport={'width':width,'height':height})", "viewport={'width':width,'height':height},device_scale_factor=0.4)")
 s=s.replace('for provider in [False,True]:','for provider in [True,False]:')
 s=s.replace('steps=12','steps=2').replace('steps=5','steps=2').replace('steps=4','steps=2')
 s=s.replace("'actualKeyUsed':False,'actualVWorldModelsVerified'", "'softwareRasterScale':0.4,'actualKeyUsed':False,'actualVWorldModelsVerified'")
 s=s.replace("report={'checks':checks", "report={'softwareRasterScale':0.4,'checks':checks")
 s=s.replace("page.screenshot(path=str(out/(tag+'-before.png')))", "page.screenshot(path=str(out/(tag+'-before.png')),scale='css')")
 s=s.replace("page.screenshot(path=str(out/(tag+'-after.png')))", "page.screenshot(path=str(out/(tag+'-after.png')),scale='css')")
if 'fixtureBootstrapState' not in s:
 s=s.replace("page.wait_for_function('window.__JEJU_EXPLORER__?.status.'+('sdkReady' if provider else 'previewReady'),timeout=75000)","page.wait_for_function(\"window.__JEJU_EXPLORER__?.status.\"+('sdkReady||window.__JEJU_EXPLORER__?.status.source===\"error\"' if provider else 'previewReady'),timeout=75000)\n    if provider:\n     snapshot=page.evaluate('window.__JEJU_EXPLORER__.status');print('Fixture bootstrap '+json.dumps(snapshot),flush=True);measurements.append({'test':tag,'fixtureBootstrapState':snapshot});check(tag+' fixture SDK initialized',snapshot['sdkReady'])")
 s=s.replace(" except Exception as e:failure=str(e)[:600]", " except Exception as e:\n  failure=str(e)[:600]\n  try:\n   snapshot=page.evaluate('window.__JEJU_EXPLORER__?.status');measurements.append({'fixtureFailureState':snapshot});print(json.dumps(snapshot),flush=True)\n  except Exception:pass")
if 'deterministicEngineFixture' not in s:
 # Embed the real npm engine in the intercepted test-only bootstrap response.
 # This removes the fixture's secondary-script race, not the application's SDK wait.
 marker="key='TEST-ONLY-NOT-A-REAL-KEY-00000';"
 addition="""# deterministicEngineFixture: actual Cesium engine followed by explicit fake vw adapter.
fixture=\"window.CESIUM_BASE_URL='/test-cesium/';\\n\"+(cesium/'Cesium.js').read_text()+\"\\n\"+fixture[fixture.index('setTimeout'):]
fixture=fixture.replace(\"start(){const v=\",\"start(){try{const v=\").replace(\"window.vw.ws3dInitCallBack();}}};\",\"window.vw.ws3dInitCallBack();}catch(e){console.log('TEST_FIXTURE:'+e.name+':'+e.message);throw e;}}}};\")
"""
 assert marker in s;s=s.replace(marker,addition+marker)
 s=s.replace("page.on('pageerror',lambda e:errors.append(str(e)[:180]))", "page.on('pageerror',lambda e:errors.append(str(e)[:180]));page.on('console',lambda m:print(m.text[:500],flush=True) if m.text.startswith('TEST_FIXTURE:') else None)")
p.write_text(s)
# Active derivatives need their own cache versions, not only the parent module version.
p=Path('precision/explore.mjs');s=p.read_text().replace("legacy/preview-flight.html?embed=flight'", "legacy/preview-flight.html?embed=flight&v=3.8.0'");p.write_text(s)
p=Path('precision/prepare.mjs');s=p.read_text().replace('href="../preview.css"','href="../preview.css?v=3.8.0"').replace("'./realism/flight-entry.js'", "'./realism/flight-entry.js?v=3.8.0'");p.write_text(s)
print('Same CSS viewports and real input; software raster scale 0.4; full rotation assertions unchanged; not a device-performance test')
