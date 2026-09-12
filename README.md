# JEJU:BEFORE — 제주 원도심 3D 여행지도

이 저장소는 제주 원도심 3D 여행지도 전용 저장소입니다. 기존 `kokoom94-ai/jeju-now-981`의 9.81 서비스와 분리합니다.

- 개발 소스: [`jeju-before-web`](https://github.com/kokoom94-ai/jeju-oldtown-3d/tree/jeju-before-web)
- 정적 배포 산출물: [`jeju-precision-site`](https://github.com/kokoom94-ai/jeju-oldtown-3d/tree/jeju-precision-site)
- 신규 전용 서비스 예정 주소: `https://kokoom94-ai.github.io/jeju-oldtown-3d/`

새 저장소의 `main`은 안내용입니다. 기존 저장소의 `main` 및 서비스 설정은 변경하지 않습니다.

## 연결 순서

1. 소스 이관·테스트·배포 브랜치 준비 결과를 개발 브랜치의 README 및 Actions에서 확인합니다.
2. 이 저장소 Settings → Pages → Deploy from a branch → `jeju-precision-site` → `/(root)`로 게시합니다.
3. 새 주소가 실제 열리는 것을 확인한 뒤 브이월드 인증키 관리 화면에서 등록 서비스 URL을 새 주소와 일치시키세요. 이전 안내 주소는 `https://kokoom94-ai.github.io/jeju-now-981/`였습니다. 경로만 바뀌는 경우의 인증 정책을 임의로 단정하지 않습니다.
4. 발급받은 WebGL 3D 키는 전용 사이트의 직접 연결 입력란에만 입력합니다. 채팅·GitHub 소스에 넣지 않습니다.

현재 문서는 저장소 초기 안내입니다. 사이트 게시, 제공기관 실응답 및 제주 건물 높이·지붕·지형 검증이 완료됐다는 뜻이 아닙니다. 초기 기본 구성은 정적 사이트+브이월드 직접 연결이며 별도 유료 서버·DB를 만들지 않습니다.
