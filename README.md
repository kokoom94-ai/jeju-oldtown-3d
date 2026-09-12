# JEJU:BEFORE 3.3 — 제주 원도심 3D 여행지도

`kokoom94-ai/jeju-oldtown-3d` 전용 개발 저장소입니다. 이전 9.81 저장소와 배포를 분리했습니다.

| 구분 | 위치 / 상태 |
| --- | --- |
| 개발 | `jeju-before-web` / `precision/` |
| 배포 파일 | `jeju-precision-site` / 루트 |
| 서비스 예정 주소 | `https://kokoom94-ai.github.io/jeju-oldtown-3d/` |
| 초기 방식 | 정적 Pages + 발급받은 브이월드 WebGL 키 직접 연결 |
| 기본 서버·DB | 없음. Render 프록시는 선택 기능이며 생성·배포하지 않음 |
| 기존 지도 | 소스의 `index.html`, `real.html`, `realism/` 보존. 게시본에서는 `legacy/` 아래 별도 추정형 베타 |

## 지금 필요한 설정

이 저장소의 Settings → Pages에서 **Deploy from a branch → jeju-precision-site → /(root)**를 선택합니다.

게시 성공과 접속을 확인한 후 브이월드 인증키 관리에서 서비스 URL을 `https://kokoom94-ai.github.io/jeju-oldtown-3d/`와 일치시키세요. 이전에 안내한 URL은 `https://kokoom94-ai.github.io/jeju-now-981/`였습니다. 호스트는 같고 경로가 바뀌었지만, 제공기관이 경로 차이를 허용한다고 가정하지 않습니다. 기존 키의 수정 가능 여부는 관리 화면에서 확인하고, 바로 재발급할 필요가 있다고 단정하지 않습니다.

전용 사이트에서 발급받은 **WebGL 3D JavaScript 공개 키**를 입력하고 등록 주소·권한 확인 후 연결합니다. 채팅, 저장소, 쿼리스트링에 키를 붙이지 마세요. 앱은 키를 저장·진단에 포함하지 않으나 브라우저 SDK 요청에서는 노출될 수 있습니다.

[연결·검증 절차](precision/CONNECT.md) · [실제 게시 상태 점검](precision/readiness.json) · [게시 기록](precision/publication.json)

## 개발 및 검증

Node.js 22 이상에서 다음을 실행합니다. 프런트 빌드와 단위 검사에는 npm 패키지 설치가 필요 없습니다.

```sh
npm test
npm run build
npm run serve
```

로컬 주소는 `http://127.0.0.1:8000/`입니다. Pages용 키가 로컬 주소에서도 허용된다고 가정하지 마세요. 브라우저 QA는 GitHub Actions에서 수행하며 API 성공을 모의해 정밀지도 완성으로 판정하지 않습니다.

자동 검증·스테이징은 이 저장소의 개발 브랜치만 대상으로 합니다. 새 `main`은 안내용 초기 상태를 보존합니다. 이전 저장소·Render 서비스·기존 `main`에는 쓰기 작업을 하지 않습니다.

GitHub Actions의 `GITHUB_TOKEN`으로 배포 브랜치를 올린 경우 Pages 자동 재게시가 발생하지 않을 수 있습니다. 준비 파일 생성과 실제 배포는 구분하며, `readiness.json`에서 HTTP 및 파일 해시를 확인합니다. Pages 활성화 후 후속 배포를 위해 배포 브랜치의 일반 사용자 커밋 또는 아래 공식 게시 지침에 따른 재게시가 필요할 수 있습니다.

## 실제 형상에 대한 범위

정밀지도는 제공기관의 원본 3D만 사용하며 빈 구역에 임의 높이·지붕을 만들지 않습니다. SDK 초기화, 원본 객체 선택, 건물 높이·지붕 정확도, 전체 지역 범위, 보행 충돌 검증은 별개입니다. **제주 원본 모델 수신과 실제 형상 검증은 아직 미완료**입니다.

일도동·이도동·건입동·삼도동·용담동·공항 일대 6개 대표점과 장소 초안 32개를 유지합니다. 행정경계·실제 출입구·시설정보는 별도 검증 대상입니다. 기존 `legacy/` 도보 체험의 OSM 기반 건물과 추정 높이는 정밀 원본이 아닙니다.

## 출처와 라이선스

이관 출처·원본 파일 해시: `SOURCE.json`. 기존 텍스처와 Three.js 라이선스는 `realism/LICENSES.txt`, `realism/vendor/THREE-LICENSE.txt`에 유지합니다. 재료 이미지가 실제 제주 외벽 사진이라는 의미는 아닙니다.

공식 참고:
- https://github.com/V-world/V-world_API_sample
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
