# DOG-LINK 운영자 콘솔 — 운영 흐름 구현 문서

근거: `doglink_운영자_플로우차트.md`(불변 규칙·상태 머신) + `DOG-LINK_운영자_서비스_Claude_Code_프롬프트.md`.
실행: `operator/index.html`을 브라우저로 직접 연다 (빌드·서버 불필요, file:// 호환).

## 라우트

| 경로 | 화면 |
|---|---|
| `#/login` | O1 기관 계정 로그인 (`?return=`으로 원래 경로 복원, `?expired=1` 세션 만료 안내) |
| `#/queue` | O2 관제 홈·제보 큐. `?view=list\|map`, `?reportId=`, 필터 전부 query로 보존 |
| `#/reports/:id` | 좁은 화면 전체 상세 진입용 — `#/queue?reportId=`로 정규화 |
| `#/statistics` | O7 통계·보고 |
| `#/design-system` | 운영자 컴포넌트 미리보기 |

로그인 전 보호 라우트 접근은 전부 `#/login`으로 차단되고, 로그인 후 원 경로가 복원된다.
세션은 30분(sessionStorage, mock adapter)이며 만료 시 작업 경로를 보존한 채 재로그인으로 보낸다.

## 메인 플로우 대응

```
O1 로그인            → screens.js renderLogin + services.js auth adapter
O2 관제 홈·제보 큐    → renderConsole/renderQueueArea (기본 정렬: 응급→출동→대기→부정, 오래된 순)
O2-E 응급 알림       → components.js pushEmergencyToast (자동 소멸 없음) + EmergencyCounter(assertive)
O2-Map 지도 뷰       → mapHTML/bindMap — mock 지도 패널, 큐와 동일 필터 공유
O3 건 상세           → renderDetail (사진 뷰어·AITriageCard·제보 정보·타임라인·매칭·감사 로그·ActionBar)
O4-R 판정 번복       → openOverrideDialog — 사유 필수, 원 판정 보존
O4-M 중복·실종 매칭   → candCardHTML/handleMatchDecision — 연결/병합(미리보기)/무관
O5 상태 변경         → requestAction → services.requestTransition (상태 머신 + 감사 로그 원자 처리)
O6 종결·기록         → openCloseDialog/openNegativeCloseDialog + closureSummaryHTML (삭제 불가)
O7 통계·보고         → renderStats (지표 정의 병기, 추이 차트+데이터 표, CSV/인쇄)
시민 S7 연동         → services.citizenView — 정확 좌표가 응답에서 제거된 투영. 성공 토스트에 "시민 화면에 반영됨" 표기
```

## 불변 규칙 구현 위치

- **Emergency Never Buried**: 전역 카운터(`emergencyCounterHTML`, 필터와 무관하게 전체 집계, 15분+ 시 최장 경과 병기) + 큐 최상단 고정(트리아지 우선 정렬) + 자동 소멸하지 않는 토스트(중복 방지, 닫아도 카운터·고정 유지).
- **3클릭 처리**: 행 클릭(1) → ActionBar(2) → 확인 다이얼로그(3, 종결류만).
- **AI Proposes, Human Decides**: 자동 병합·자동 상태 변경 경로 없음. 번복·병합·연결은 전부 다이얼로그를 거쳐 사람이 확정하고 감사 로그에 남는다.
- **감사 추적**: 모든 변경이 `writeAudit`와 같은 함수 안에서 원자적으로 기록. 삭제 UI 없음.
- **응급 미처리 정의**: 트리아지 응급이면서 아직 `접수됨` 상태인 사건.

## 키보드 워크플로

`↑/↓` 행 이동(roving, `aria-activedescendant`) · `Enter` 상세 · `Esc` 닫기(큐 포커스 복원) ·
`E` 기관 전달 · `P` 보호 · `R` 반환 · `A` 나에게 배정 · `/` 검색 · `?` 도움말.
입력 필드 포커스 중에는 업무 단축키 비활성. 허용되지 않는 전환 단축키는 실행되지 않고 토스트로 사유 안내.
단축키 실행도 버튼과 동일한 확인·검증 경로(`requestAction`)를 탄다.

## 반응형

- 1280px+: 3패널(필터 240 / 큐 가변 / 상세 400), 구분선 분리
- 1024~1279: 필터 드로어, 2패널
- 768~1023: 상세 오버레이, 닫으면 큐 포커스 복원
- ≤640: GlobalBar 2줄 랩(응급 카운터 항상 노출), 큐 행 축약, 상세 전체 화면. 360px 가로 넘침 0 검증됨

## 수동 검수 결과 (2026-07-27, 테스트 러너 없음 — 브라우저 검증)

- 로그인/실패 문구/보호 라우트/세션 만료 복원 ✓
- 큐 정렬(응급 3건 최상단·오래된 순), 응급 카운터 "응급 2건 · 최장 17분 경과" ✓
- 확인 시작 → 자동 배정 고지 + "시민 화면에 반영됨" 토스트 + 감사 로그 ✓
- 허용되지 않는 전환 데이터 계층 차단 ✓ / 번복 사유 미선택·기타 무설명 저장 거부 ✓ / 원 판정 보존 ✓
- 병합 미리보기 → 확정 → 원 사건 보존(`mergedIntoReportId`) + 양쪽 감사 로그 ✓
- 응급 토스트 생성·자동 소멸 없음·클릭 시 상세 ✓
- 지도: 마커(색+형태 이중 부호화)·클러스터·미니 카드·좌표 목록 폴백 ✓
- 종결: 결과 분류 필수·요약 카드·기본 큐 숨김·필터 재조회 ✓
- 시민 투영에 정확 좌표·주소 없음 ✓ / 통계 6지표 정의 병기·차트+데이터 표·CSV/인쇄 ✓
- 360px 가로 넘침 0, 콘솔 에러 0 ✓

## 재검수 및 수정 (2026-07-27 2차)

- 수정 1: `consoleApi.onRealtime`이 `report.updated/status_changed/assigned/merged` 이벤트를
  처리하도록 보강 — 현재 선택 사건 갱신 시 상세 반영(§14 갱신 규칙). 입력 포커스·열린
  다이얼로그는 건드리지 않는다. mock에서는 본인 조치가 직접 렌더하므로 동작 변화 없음,
  실제 realtime adapter 연동 시 타 담당자 변경 반영 경로.
- 수정 2: 통계·지도 데이터 표의 `<caption class="sr-only">`(절대배치)가 정적 위치의 스크롤
  컨테이너 클리핑을 벗어나 문서 높이를 늘리는 팬텀 스크롤 버그 수정 — `.stats-wrap`,
  `.chart-card`, `.map-area details`, `.ds-sec`에 `position: relative` 추가.
- 재검수(브라우저): 로그인 → 큐 정렬·응급 카운터(미처리 정의 포함) → 확인 시작(자동 배정
  고지) → 판정 번복(새 판정·사유 필수 검증, 원 판정 보존, 감사 로그) → 번복 후 큐 재정렬 →
  시민 투영 좌표·주소 누출 없음 → 응급 주입(토스트 자동 소멸 없음·카운터 증가) → 병합
  미리보기 → 지도 뷰(마커·클러스터·폴백) → 통계(지표 정의·차트+표·내보내기, 스크롤 정상) →
  `?` 도움말(상태별 사용 가능 키 구분)·Esc → 디자인 시스템 페이지 → 모바일 375px 넘침 0 →
  콘솔 에러 0 ✓
