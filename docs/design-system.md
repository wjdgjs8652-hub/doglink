# DOG-LINK 디자인 시스템

시민 제보자 서비스에 적용된 디자인 시스템 문서입니다.
`/design-system` 라우트에서 모든 컴포넌트 상태를 미리볼 수 있습니다.

## 디자인 원칙

1. **Public Trust** — 공공기관 서비스처럼 정확하고 안정적으로 보인다.
2. **Status First** — 제보의 현재 상태와 다음 행동을 가장 먼저 인식할 수 있다.
3. **Calm and Clear** — 과도한 장식·그림자·그라데이션을 사용하지 않는다.
4. **Accessible by Default** — 작은 글자, 낮은 대비, 작은 터치 영역을 금지한다.
5. **Mobile First, Desktop Ready** — 360~430px에서 먼저 완성하고 PC로 확장한다.

## 컬러 토큰

모든 색상은 `src/styles/tokens.css`의 CSS 변수로 정의되어 있으며, 하드코딩을 금지합니다.

| 그룹 | 토큰 | 용도 |
|---|---|---|
| Background | `--color-background` `--color-surface` `--color-surface-subtle` `--color-surface-muted` | 화면·카드 배경 |
| Text | `--color-text-primary` ~ `--color-text-inverse` | 텍스트 위계 |
| Border | `--color-border-default` `--color-border-strong` `--color-divider` | 테두리·구분선 |
| Primary | `--color-primary-50/100/500/600/700` | 주요 행동 (500 기본, 600 hover, 700 active) |
| Triage | `--triage-emergency/dispatch/negative/analyzing-*` | AI 판정 상태 |
| Status | `--status-pending/success/transfer/danger/neutral-*` | 기관 처리 상태 |

### 색상 역할 고정

- **primary**: 일반적인 주요 행동
- **emergency**: 응급 가능성 (solid 색은 S5-E 응급 확인 화면에서만 대면적 사용)
- **dispatch**: 기관 확인·출동 필요
- **negative**: 대응 필요성 낮음
- **analyzing**: AI 분석 중
- **success**: 보호·전달 완료 / **transfer**: 기관 전달 / **neutral**: 예정·비활성·종결

트리아지 상태는 항상 **색상 + 아이콘 + 한글 라벨** 세 요소를 함께 사용합니다. 색상만으로 의미를 전달하지 않습니다.

## 타이포그래피

Pretendard → SUIT → Noto Sans KR → 시스템 폰트 순서.
`--font-display`(24/32/700)부터 `--font-caption`(12/18/400)까지 토큰으로 정의.

- 중요한 텍스트에 12px 미만 금지, 본문 14px 이상
- 제목 700 / 강조 600 / 본문 400
- 접수번호에는 `tabular-nums` 유틸리티 클래스 적용

## 간격·모서리

- 4px 기반 스케일: `--space-1`(4) ~ `--space-10`(40)
- 화면 좌우 20px, 카드 내부 16px, 카드 간격 12px, 섹션 간격 32~40px
- 모서리: 배지 pill / 버튼 12px / 카드 16px / 지도 20px
- 기본 카드에 그림자 금지, 테두리로 구분. 바텀시트에만 약한 그림자
- 점선 테두리 사용 금지

## 컴포넌트 사용법

| 컴포넌트 | 파일 | 핵심 규칙 |
|---|---|---|
| `AppHeader` | components/AppHeader.tsx | 뒤로가기 44×44px 터치 영역, 제목 중앙 정렬 |
| `StepIndicator` | components/StepIndicator.tsx | 완료 primary 채움, 현재 강조, `aria-current="step"` |
| `BottomCTA` | components/BottomCTA.tsx | 높이 52px, safe-area 대응, 로딩 시 중복 제출 방지, 비활성 이유 helperText |
| `Button` | components/Button.tsx | variants: primary/secondary/tertiary/destructive/emergency-solid |
| `PhotoCapture` | components/PhotoCapture.tsx | 카메라 우선 + 업로드 폴백, 최대 3장, 진행률·삭제·재시도 |
| `LocationPicker` | components/LocationPicker.tsx | GPS + mock map + 검색·직접 입력 폴백 |
| `SituationChips` | components/SituationChips.tsx | 다중 선택, `aria-pressed`, 터치 영역 44px |
| `TriageBadge` | components/TriageBadge.tsx | 기본 28px / 대형 32px, 아이콘+한글 라벨 필수 |
| `StatusBadge` | components/StatusBadge.tsx | 처리 상태 전용. TriageBadge와 혼합 금지 |
| `TriageResultCard` | components/TriageResultCard.tsx | 사진→배지→근거→AI 고지→수정 진입점 순서 |
| `EmergencyConfirmSheet` | components/EmergencyConfirmSheet.tsx | 카운트다운 10초+연장, 중단 버튼 동등 크기, `aria-live="assertive"` |
| `ProcessTimeline` | components/ProcessTimeline.tsx | 완료/현재/예정 구분, 상태 화면에서 타임스탬프 |
| `InlineNotice` | components/InlineNotice.tsx | info/warning/success/error |

## 잘못된 사용 예

- ❌ 색상만으로 응급/일반 구분 → 반드시 아이콘+라벨 동반
- ❌ `--triage-emergency-solid`를 S5-E 밖에서 넓은 면적으로 사용
- ❌ 화면마다 별도 배지 구현 → TriageBadge/StatusBadge 재사용
- ❌ `#526ED8` 같은 색상 하드코딩 → 토큰 변수 사용
- ❌ 응급 중단 버튼을 링크·회색·작은 글씨로 약화
- ❌ AI 판정을 "응급입니다"처럼 단정 표현 → "응급 상황으로 판단됩니다"

## 반응형 규칙

- **360~430px**: 한 열, 좌우 20px, 하단 CTA 고정, 가로 넘침 금지
- **768px 이상**: 콘텐츠 최대 너비 600px 유지, 폼을 2열로 만들지 않음
- **1024px 이상**: 중앙 콘텐츠 최대 너비 600px, 모바일 폼을 늘리지 않음
