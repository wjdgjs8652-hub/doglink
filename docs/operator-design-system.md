# DOG-LINK 운영자 콘솔 — 디자인 시스템 적용 문서

SSOT: `doglink_design_system_v2.md` + 운영자 프롬프트 §7~§10.
운영자 짝 문서(`doglink_운영자_플로우_디자인시스템.md`)는 저장소에 없어, 프롬프트에 포함된
운영자 디자인 시스템 명세를 그 대체 근거로 사용했다.
라이브 미리보기: 콘솔 로그인 후 `#/design-system`.

## 공용 자산 (`shared/`) — 시민 서비스와 공동 사용

| 파일 | 내용 |
|---|---|
| `shared/tokens.css` | v2 토큰 전량 (`--color-*`, `--triage-*`, `--status-*`, spacing, radius). 값은 프롬프트 §8과 동일 |
| `shared/components.css` | Button(+Emergency variant), TriageBadge, StatusBadge, ProcessTimeline, Dialog, Toast, InlineNotice, Empty/Loading, `.sr-only` |
| `shared/components.js` | `DL.*` — 배지·타임라인 렌더러, Dialog(포커스 트랩·Esc·포커스 복원), Toast, 날짜·시간·사건번호 표시 규칙(`ymdhm/ymdhms/relTime/durText`), XSS 이스케이프, 시연용 dogSVG |

**충돌 기록**: 시민 프로토타입 `mvp-prototype.html`은 "단일 HTML 파일로 직접 열림"이 문서화된
속성이라 내부 IIFE의 배지 구현을 외부 파일로 빼지 않았다. 대신 같은 규격을 `shared/`에 공용
구현으로 두고 운영자 콘솔이 사용한다. 두 구현은 클래스 계약(`.triage[data-state]`,
`.badge`)과 토큰 값이 동일하며, 시민 서비스가 다중 파일로 전환되는 시점에 `shared/`를
import 하면 된다.

## 운영자 콘솔 고유 규칙 (operator/css/operator.css)

- 레이아웃: GlobalBar 56px 고정 · 3패널(240/가변/400) · 최대 1440px · 패널 사이 구분선(그림자 금지)
- 큐 행 48px · 응급 좌측 액센트 4px · 선택 좌측 2px primary · 선택된 응급은 우측 inset으로 동시 구분
- solid 응급색(`--triage-emergency-solid`) 허용처 4곳: EmergencyCounter(1건+), EmergencyToast 테두리, 지도 응급 마커, 큐 응급 액센트 바
- 그림자는 토스트·팝오버·다이얼로그에만 · **점선 테두리 금지** · **다크 모드 없음**(SSOT 라이트 전용)
- 사건번호·시간·좌표·통계 수치 `tabular-nums` · 중요 정보 12px 미만 금지 · 터치 영역: 주요 버튼 44px, 큐 내부 컨트롤 최소 32~40px

## 상태 표현

- TriageBadge: 아이콘+한글 라벨+색 3요소 필수. AI 판정 문구는 단정형 금지("~로 판단됩니다")
- StatusBadge: variant 5종(pending/transfer/success/danger/neutral). 배지 앞 점이 색 외 보조 채널
- 지도 마커: 색+형태 이중 부호화 — 응급=원(+!), 출동=사각(+▶), 부정=작은 점, 종결=체크 글리프
- 차트: 일반 추이 primary, 트리아지 시리즈에만 응급색(+▲ 마커 병기), 아래 데이터 표 제공

## 접근성 (WCAG 2.1 AA + KRDS 지향)

- EmergencyCounter·응급 토스트 `aria-live="assertive"` / 일반 토스트 `polite`
- 큐 listbox + roving `aria-activedescendant`, 행에 `aria-selected`·통짜 `aria-label`(논리 낭독 순서)
- 다이얼로그 포커스 트랩·Esc·이전 포커스 복원 / 상세 닫으면 큐 행 포커스 복원
- 자동 갱신(30초)은 포커스를 이동시키지 않고, 입력 중에는 목록 재렌더를 건너뜀
- `prefers-reduced-motion` 지원, 아이콘 버튼 전부 `aria-label`, 지도는 좌표 목록 폴백 제공
- 사운드는 설정으로 켜는 보조 수단(기본 꺼짐) — 시각 알림을 대체하지 않음
