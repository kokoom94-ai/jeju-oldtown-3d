# JEJU:BEFORE 3.8 — drag navigation and visitor configuration

Left drag orbits 360 degrees, right/Shift drag pans, wheel zooms, two fingers pinch/twist. The direct controller is installed inside the real VWorld SDK document, not merely the comparison preview. Native input is suspended to prevent competing controllers. The comparison derivative has a matching capture-phase gesture handler. Empty UI wrappers do not intercept map gestures. Camera parameters remain coherent after drag, zoom, north and automatic orbit.

Street mode is an experimental third-person / eye-height viewer with an original schematic traveler. It uses retained pedestrian centerlines, OSM footprint exclusion, received terrain and loaded-surface checks. Missing terrain or invalid steps stop movement. Only an oldtown subset is enabled; airport and west coast are excluded. It is not real-world navigation and does not certify full collision, entrances, access, facades, roofs or administrative coverage. No GTA assets are copied.

The owner has explicitly agreed to browser-visible JavaScript public-key deployment. No further approval is needed. The actual key is not available to this build. A publisher-only workflow reads repository secret VWORLD_PUBLIC_KEY and puts the value only in a Pages artifact, not Git source. Browser requests and public configuration necessarily reveal this JavaScript key. A missing configuration leaves manual connection available; errors never silently substitute synthetic buildings.

User reported that manual key entry displays the original map. This is not an assistant-verified reception or geometry certificate. Fresh browser tests distinguish actual Three.js comparison rendering, real Cesium engine with explicit SDK/terrain fixtures, public HTTP and actual VWorld key testing. The latter is not performed without the key.

All writes target kokoom94-ai/jeju-oldtown-3d. No 9.81 ref, service, data, credentials or environment is changed. No paid resources are created.

References: https://cesium.com/learn/cesiumjs/ref-doc/Camera.html ; https://cesium.com/learn/cesiumjs/ref-doc/ScreenSpaceCameraController.html ; https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
