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
 p.write_text(s)
# Active derivatives need their own cache versions, not only the parent module version.
p=Path('precision/explore.mjs');s=p.read_text().replace("legacy/preview-flight.html?embed=flight'", "legacy/preview-flight.html?embed=flight&v=3.8.0'");p.write_text(s)
p=Path('precision/prepare.mjs');s=p.read_text().replace('href="../preview.css"','href="../preview.css?v=3.8.0"').replace("'./realism/flight-entry.js'", "'./realism/flight-entry.js?v=3.8.0'");p.write_text(s)
print('Same CSS viewports and real input; software raster scale 0.4; full rotation assertions unchanged; not a device-performance test')
