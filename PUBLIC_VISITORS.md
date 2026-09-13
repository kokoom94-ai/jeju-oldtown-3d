# One-time owner setup for visitors without key input

The owner has accepted browser-visible JavaScript key delivery. No further approval prompt is required. No provider key has been supplied to this repository or assistant yet.

1. Repository Settings → Secrets and variables → Actions → New repository secret. Name: `VWORLD_PUBLIC_KEY`. Value: the owner's already-issued working VWorld JavaScript key. Do not place it in code, issues or chat.
2. Repository Settings → Pages → Source: **GitHub Actions**. This switches the publishing method, not the website address. The existing `jeju-precision-site` branch remains the reviewed artifact source and is not deleted.
3. Actions → **Publish visitor map - no key entry** → Run workflow → branch **main**. Leave the Satellite WMTS option off for a WebGL-only key; enable it only when background-map permission is present.

The workflow validates the current static inventory and 3.8 version before writing the key only into the Pages artifact. No Git source or commit receives the key. Public `public-connection.json` and SDK network requests expose the JavaScript key by design; GitHub Secrets does not make browser-delivered data secret. Use the service registration and allowed APIs/quotas provided by VWorld. The workflow never changes provider registrations or creates paid resources.

A successful public-config deployment means visitors no longer type the key. It does not certify live SDK reception, all buildings, terrain accuracy, facades, roofs, physical pedestrian access, or character collision. Missing configuration does not silently generate precise buildings.

The original manual connection remains available for diagnostics. Do not change the separate `jeju-now-981` repository or its Render/SKT configuration.
