# JEJU:BEFORE 3.4 — 실제 연결 점검 준비

새 저장소: `kokoom94-ai/jeju-oldtown-3d`. 개발: `jeju-before-web`. 배포 준비: `jeju-precision-site`.
기존 9.81 저장소의 모든 브랜치·워크플로·서비스·환경변수에는 쓰지 않는다.

## 이번 변경

기존 3.3 소스와 독립 장소 JSON 32곳을 보존한 상태에서 다음을 추가했다.
- SDK 요청 → 스크립트 수신 → 지도 시작 요청 → 뷰어 초기화 → 3D 객체 선택을 구분하는 제한된 이벤트 기록.
- 기기 지원 점검: HTTPS/보안 컨텍스트·WebGL 1/2·필수 브라우저 기능. 기기 식별정보나 키를 수집하지 않는다.
- 게시 파일 점검: 배포본의 파일별 SHA-256·크기·JavaScript/JSON/HTML/이미지 MIME 타입 대조. 검사 대상은 현재 사이트의 정적 파일만이다.
- 관덕정·동문시장·산지천·탑동·공항 주변 바로 이동과 항공/수직 카메라 각도 선택. SDK 초기화 전에는 비활성이다.
- 초기화 콜백이 동기적으로 끝났을 때 남던 확인 타이머 수정. 화면 종료 시 이벤트 자원 정리. 빈 객체 클릭 때 옛 팝업 제거.

좌표는 기존 초안이며 행정경계·실제 출입구가 아니다. 카메라의 height는 관찰 고도이고 건물 높이 데이터가 아니다.
공항은 위에서 보기만 준비되어 있다. 정밀 배경의 캐릭터 도보·충돌·허용 보행망·제한구역 차단은 아직 통합하지 않는다.

## 실행과 검사

`npm test` → `npm run build` → `npm run serve` (Node.js 22).
정적 결과: `_precision_site/`. 파일 목록: `_precision_site/integrity.json`.
브라우저 점검에서 읽는 매니페스트는 같은 사이트 파일의 일관성 검사다. 별도 신뢰된 서버 서명이나 측량 정확도 인증이 아니다.
CI의 전용 Pages 검사는 로컬 빌드 매니페스트와 공개 파일을 대조하므로, 페이지가 200이어도 구버전 파일·잘못된 MIME이면 실패다.
`lifecycle.test.mjs`는 독립 VM의 어댑터 수명주기 모의 객체를 사용한다. 실제 브이월드 SDK를 수신하거나 지도 성공을 모의한 공개 브라우저 실연동 결과가 아니다.
현재 실행의 통과 개수와 결과는 Actions 및 아티팩트에서 확인한다. 과거 실행 숫자를 재사용하지 않는다.

## 실제 연결에 남은 계정 단계

새 저장소 Settings → Pages → Deploy from a branch → jeju-precision-site → /(root) → Save.
전용 URL은 `https://kokoom94-ai.github.io/jeju-oldtown-3d/`이며 게시 성공·HTTP 확인 전에는 운영 중이라고 하지 않는다.
발급된 키의 기존 등록 URL은 `https://kokoom94-ai.github.io/jeju-now-981/`이다.
호스트는 같고 경로만 달라 키 재발급을 먼저 요구하지 않는다. 기존 키 관리에서 등록 URL·WebGL 3D 권한을 확인하고, 수정 가능하면 새 서비스 URL로 맞춘다.
공식 공개 안내 확인만으로 WebGL 3.0이 전체 경로를 대조하는지 확정하지 못했다. 로그인된 실제 설정과 첫 연결 응답으로 확인한다.
키는 전용 사이트의 직접 입력란에만 입력한다. 공유 CDN·채팅·GitHub에 쓰지 않는다. 브라우저용 키의 완전 은닉을 주장하지 않는다.
선택적 프록시는 미배포이며 추가 Render/Netlify/DB를 생성하지 않았다.

## 완료 기준

정적 파일 일치 ≠ SDK 인증 ≠ 제주 모델 수신 ≠ 높이·지붕·지형 정확도 ≠ 안전한 보행.
`sdkLiveTested`, `jejuPrecisionModelsReceived`, `productionReady`는 본인 키로 실제 검증하기 전까지 false다.
건물 한 개 선택이나 기기 WebGL 지원만으로 이 필드를 성공 처리하지 않는다.
GitHub의 GITHUB_TOKEN 푸시는 Pages 자동 빌드를 유발하지 않을 수 있다. 후속 공개 갱신 시에도 실제 Pages 결과·파일 해시를 확인한다.

공식 참고:
- https://github.com/V-world/V-world_API_sample/blob/master/%5BWebGL3%5D%20%ED%81%B4%EB%A6%AD%EB%90%9C%20%EB%AA%A8%EB%8D%B8%20%EC%88%A8%EA%B8%B0%EA%B8%B0.html
- https://cesium.com/learn/cesiumjs/ref-doc/Camera.html#flyTo
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
