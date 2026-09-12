# JEJU:BEFORE 3.7 — 항공영상·지형·원본 3D

WebGL 3.0 공식 SDK의 지형 위에 본인 키로 요청한 VWorld WMTS Satellite 영상을 표시합니다. 원본 건물은 공식 facility_build 레이어를 유지하며 켜고 끌 수 있습니다. 영상만으로 건물 외벽이나 지붕을 생성하지 않습니다. 촬영일·지역별 해상도·제주 모델 정확도는 확인 전입니다.

신규 기능: 항공영상/SDK 배경 선택, 원본 건물 표시, 낮/노을/밤 조명 연출, 원본 모드의 가벼운 품질, 북쪽 정렬, 영상 디코딩·지형 고도 표본·3D 타일 관찰·FPS 진단, 키 없는 진단 JSON 저장. 기존 장소 32곳·검색·네이버 검색 링크·자동 둘러보기·시점 전환·모바일을 유지합니다.

실시간은 타일 요청·브라우저 프레임 렌더링을 뜻합니다. 실시간 촬영·CCTV·실시간 날씨가 아닙니다. 조명은 2026-09-12 KST 고정 기준 연출이며 항공사진에 찍힌 그림자는 남습니다. 시설·보행·행정경계의 정확도를 검증하지 않습니다.

공유 CDN은 본인 키 입력을 차단합니다. 전용 주소 https://kokoom94-ai.github.io/jeju-oldtown-3d/ 에서 연결합니다. Pages 게시 설정이 필요하면 Source=Deploy from a branch, Branch=jeju-precision-site, Folder=/(root). 파일 업로드는 자동화가 담당합니다. 기존 발급 키의 WebGL 3D 권한과 선택적으로 배경지도 WMTS 권한을 확인합니다. WebGL만 허용된 키는 항공영상 체크를 해제하고 SDK 기본 배경으로 연결할 수 있습니다. 같은 호스트의 경로 변경이 재발급을 반드시 요구한다고 단정하지 않습니다.

SDK 준비, 영상 디코딩, 지형 공급자, 관덕정 좌표 고도 표본, 3D 타일 관찰은 각각 별도 지표입니다. 하나를 다른 지표나 완성도로 대체하지 않습니다. 실제 키가 이번 작업에 제공되지 않으므로 테스트의 성공은 실연결 성공을 의미하지 않습니다. sdkLiveTested, geometryVerified, productionReady는 검증 전 false입니다.

구현 근거: https://github.com/V-world/V-world_API_sample 의 2026년 교육 (WebGL 3.0 초기화, facility_build.show/hide, WMTS 경로), https://cesium.com/learn/cesiumjs/ref-doc/UrlTemplateImageryProvider.html 및 https://cesium.com/learn/cesiumjs/ref-doc/Cesium3DTileset.html .

UI 참고: tinyseoul.com, seoul-3d-atlas.synabreu.chatgpt.site. 원본 코드·사진·모델·키를 복제하지 않습니다. 비·눈·교통·수목 연출은 실제 도시 재현과 혼동되지 않도록 이번 원본 지도에는 넣지 않습니다.
