// Bounded, credential-free diagnostics. Raw URLs, exception messages and provider bodies are never exported.
export const SDK_PHASES=Object.freeze({
 'frame-loading':'연결 프레임 로딩','bootstrap-requested':'공식 SDK 요청','script-loaded':'SDK 응답 스크립트 실행',
 'waiting-for-api':'SDK 내부 API 준비 대기','map-construct':'지도 객체 생성','map-configure':'지도 위치 설정',
 'map-start-requested':'공식 지도 시작','waiting-for-viewer':'3D 뷰어 준비 대기','viewer-ready':'뷰어 초기화 확인',
 'adapter-setup':'앱 조작·장소 연결','render':'화면 렌더링'
});
export const SDK_ERRORS=Object.freeze({
 FRAME_LOAD_FAILED:'사이트의 SDK 연결 프레임을 불러오지 못했습니다. 이 페이지를 강력 새로고침한 뒤 다시 연결하세요.',
 ENV_WEBGL_UNAVAILABLE:'이 브라우저에서 WebGL을 만들지 못했습니다. 하드웨어 가속 설정을 확인하거나 일반 Chrome·Edge 창에서 시험하세요.',
 SDK_NETWORK_FAILED:'공식 SDK 스크립트를 불러오지 못했습니다. 제공기관 응답·네트워크·브라우저 차단을 구분해야 하며, 키 오류로 확정된 것은 아닙니다.',
 SDK_DEPENDENCY_FAILED:'공식 SDK가 추가로 불러오는 스크립트가 실패했습니다. 제공기관 후속 자원 또는 네트워크 차단을 확인해야 합니다.',
 SDK_SCRIPT_ERROR:'SDK 스크립트 실행 중 오류가 발생했습니다. 키·도메인 오류인지 여부는 아직 확인되지 않았습니다.',
 PROVIDER_DOMAIN_REJECTED:'제공기관 스크립트가 도메인 또는 서비스 URL 관련 거절 알림을 반환했습니다. 기존 키의 등록 주소를 이 전용 사이트와 대조하세요.',
 PROVIDER_AUTH_REJECTED:'제공기관 스크립트가 인증 또는 사용 권한 관련 거절 알림을 반환했습니다. 기존 키의 등록 주소와 WebGL 3D 권한을 확인하세요.',
 PROVIDER_NOTICE:'제공기관이 초기화 중 알림을 반환했습니다. 키 보호를 위해 원문은 기록하지 않았습니다. 제공기관 계정의 인증 상태를 확인하세요.',
 SDK_UNAVAILABLE:'SDK 응답 이후에도 지도 API 클래스가 준비되지 않았습니다. 등록 주소·권한 또는 SDK 내부 파일 수신 문제를 확인해야 합니다.',
 SDK_MAP_CONSTRUCTION_FAILED:'공식 지도 객체 생성 단계에서 오류가 발생했습니다. 앱 호환성 또는 SDK 실행 문제이며 키 문제로 단정하지 않습니다.',
 SDK_OPTIONS_FAILED:'공식 지도 옵션·초기 위치 설정 단계에서 오류가 발생했습니다. 앱과 SDK 사이의 호환성을 확인해야 합니다.',
 SDK_START_FAILED:'공식 map.start() 호출 단계에서 오류가 발생했습니다. 표시된 단계·기기 지원 결과를 기준으로 확인해야 합니다.',
 SDK_INIT_TIMEOUT:'지도 시작 후 제한시간 안에 3D 뷰어가 준비되지 않았습니다. 제공기관 후속 자원·WebGL 상태를 확인해야 합니다.',
 SDK_INIT_FAILED:'초기화 중 분류되지 않은 오류가 발생했습니다. 아래 단계·오류 코드를 확인하세요.',
 RENDER_FAILED:'초기화 이후 3D 렌더링 오류가 발생했습니다. WebGL·그래픽 메모리·제공기관 자원을 확인해야 합니다.',
 PREFLIGHT_FAILED:'선택적 프록시의 연결 전 검사가 실패했습니다. 서버 배포·실연결 성공을 뜻하지 않습니다.'
});
export const errorCode=code=>Object.hasOwn(SDK_ERRORS,code)?code:'SDK_INIT_FAILED';
export function cleanSDKDiagnostic(value){
 const d=value&&typeof value==='object'?value:{};
 return {stage:Object.hasOwn(SDK_PHASES,d.stage)?d.stage:null,
  exceptionName:['Error','TypeError','ReferenceError','SyntaxError','SecurityError','RangeError'].includes(d.exceptionName)?d.exceptionName:null,
  mapClass:d.mapClass===true,coordinateClasses:d.coordinateClasses===true,cesium:d.cesium===true,viewer:d.viewer===true,
  frameDocument:['http-page','https-page','srcdoc','other'].includes(d.frameDocument)?d.frameDocument:'other',
  webgl:[0,1,2].includes(d.webgl)?d.webgl:null};
}
export function errorText(code,detail={}){
 const c=errorCode(code),d=cleanSDKDiagnostic(detail);
 return '['+c+'] '+SDK_ERRORS[c]+(d.stage?' · 단계: '+SDK_PHASES[d.stage]:'');
}
export function connectionReport({failureCode=null,diagnostic=null,timeline=[]}={}){
 return {failureCode:failureCode?errorCode(failureCode):null,diagnostic:cleanSDKDiagnostic(diagnostic),
 timeline:Array.isArray(timeline)?timeline.filter(x=>Object.hasOwn(SDK_PHASES,x)).slice(-20):[],
 actualKeyIncluded:false,geometryVerified:false,productionReady:false};
}
