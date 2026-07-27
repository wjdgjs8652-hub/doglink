# Mock API 및 Adapter 구조

현재 코드베이스에는 실제 백엔드·지도 SDK·AI API가 없으므로, 모든 외부 연동은
`src/services/`의 adapter 뒤에 mock으로 구현되어 있습니다.
`src/services/mock-config.ts`의 `isMockMode = true`가 기준 플래그입니다.

**실제 행정기관으로 신고가 전송되지 않습니다.** UI 문구도 이를 전제로 작성되어
있으며, 실제 연동 전 배포 시에는 반드시 안내를 추가해야 합니다.

## 서비스별 mock 동작과 교체 지점

### triage-service.ts — AI 상태 판정

- 인터페이스: `TriageService.analyze(draft, signal)`
- mock: 선택한 상황 칩 기반 판정 (2~4초 지연)
  - `다쳐 보여요` / `움직이지 않아요` → **emergency**
  - `도로 근처` / `공격적` / `새끼` → **dispatch**
  - `목줄이 있어요` 단독 → **negative**
  - 그 외 → **dispatch**
- `analyzeWithTimeout()`이 10초 타임아웃을 적용, 초과·오류 시 `unavailable` 반환
- 교체: 실제 AI API 호출로 `triageService` 구현만 교체

### report-service.ts — 접수·조회

- 인터페이스: `ReportService.submit()` / `getPublicReport()`
- mock: localStorage(`doglink.reports.v1`)에 저장
- 접수번호: `JJ-` + 무작위 4자리 (단순 증가 숫자 아님)
- `PublicReport`에는 정확한 좌표를 포함하지 않고 `publicLocationLabel`(동 단위)과 반경만 저장
- 교체: REST API 호출로 구현 교체, `VITE_API_BASE_URL` 사용

### upload-service.ts — 사진 처리·업로드

- `compressPhoto()`: canvas 재인코딩(최대 1600px, JPEG 0.82) — **EXIF/GPS 제거, 회전 보정** 포함. 실제 연동 후에도 유지 권장
- `uploadPhoto()`: mock 진행률 콜백(15→100%), `mock://uploads/…` URL 반환
- 교체: 실제 업로드 엔드포인트로 `uploadPhoto()` 교체

### map-service.ts — 지도·주소

- 인터페이스: `MapService.reverseGeocode()` / `searchPlaces()`
- mock: 제주 지역 한국어 주소 데이터 (노형동, 연동, 함덕리 등)
- `LocationPicker`의 mock map은 드래그로 좌표를 조정하는 대체 UI
- 교체: Kakao Maps / Naver Maps SDK 로드 + 실제 지오코딩. API 키는
  `VITE_KAKAO_MAP_KEY` 등 환경 변수로만 주입 (소스 하드코딩 금지)

### geolocation-service.ts — GPS

- 브라우저 Geolocation API 래퍼. mock 아님 (실제 동작)
- 거부/시간초과/미지원을 `GeoError.reason`으로 구분해 폴백 안내

### share-service.ts — 공유

- Web Share API → 클립보드 복사 폴백 (실제 동작)
- 카카오톡 공유: `VITE_KAKAO_SHARE_KEY`가 있을 때만 활성화되는 adapter 스텁.
  키가 없으면 UI에 노출되지 않음 (키를 임의 생성하지 않음)

## mock 데이터 예시

```text
발견 위치: 제주특별자치도 제주시 노형동 925 인근
판정 근거: 부상이 의심되고 움직임이 적어 보입니다. 빠른 확인이 필요해 보입니다.
접수번호: JJ-4818
공개 위치: 제주특별자치도 제주시 노형동 주변 (약 500m 범위)
```

## 실제 연동 시 체크리스트

1. `.env`에 실제 키·엔드포인트 설정 (`.env.example` 참고)
2. 각 서비스의 mock 구현을 production adapter로 교체
3. `isMockMode = false` 전환 및 mock 전용 코드 제거
4. 사진 EXIF 처리 정책을 서버 정책과 일치시킴
5. 응급 신고 실제 전달 경로(기관 API) 연결 전까지 응급 문구 검토
