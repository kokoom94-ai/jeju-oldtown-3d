# SDK bootstrap correction 3.7.1

2026-09-13: fixes made after a user-reported SDK initialization failure. This release does not assert that the user's key or Jeju precision models have been validated.

Verified code defects addressed:
- The explorer collapsed all errors into one generic message and reset the diagnostic data on failure. It now keeps allowlisted error codes, stages and capability booleans; raw messages, URLs and keys are excluded.
- API classes were checked once immediately after bootstrap script evaluation. A delayed or lexical SDK export can now be discovered by bounded polling. Separate errors identify constructor, configuration, start, dependency, rendering and frame loading failures.
- App POI/interaction setup no longer makes a successfully initialized provider viewer look like an SDK initialization failure.

Compatibility change, not a proven cause of the reported incident:
- SDK now starts inside a real same-origin sdk-frame.html document, not about:srcdoc. The SDK script remains parser-inserted. A one-use parent/source/origin/nonce handshake keeps the key out of the frame URL and browser storage. Provider authentication is not bypassed.
- Explicit setMapId and setInitPosition calls follow the official 2026 WebGL 3.0 example when supported.

Fresh tests are recorded separately in precision/sdk-fix-result.json and workflow artifacts. Mocked adapter tests are not actual SDK, imagery, terrain or model acquisition. All geometry/production truth flags stay false.

The public deployment keeps the same dedicated Pages URL. No account setting or VWorld key registration is changed. No writes are made to jeju-now-981. No paid hosting, proxy or database is created.

Official references:
https://github.com/V-world/V-world_API_sample/blob/master/브이월드_교육/2026년_브이월드_교육/Readme.md
https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let
