# doglink 디자인 시스템 v2.0
**유기견 구조 통합 대응 시스템 — Claude Code용 디자인 시스템 프롬프트**

> 기반 문서: 유기견_제보_서비스_디자인_시스템_프롬프트.md (v1)
> v2 변경 핵심: ① doglink 브랜드 반영 ② AI 트리아지(출동·응급·부정) 상태 체계 신설 ③ 응급 자동신고 Critical Action 패턴 추가 ④ 시민용/기관용 이중 디자인 언어 정립 ⑤ KRDS·WCAG 정합성 강화

---

## 0. 역할 정의

당신은 공공기관(B2G) 디지털 전환 서비스에 특화된 시니어 프로덕트 디자이너이자 디자인 시스템 엔지니어다.
이 문서를 프로젝트 전체의 단일 진실 공급원(Single Source of Truth)으로 삼아, 모든 화면과 컴포넌트를 아래 규칙에 따라 설계·구현하라.

---

## 1. 프로젝트 개요

### 서비스명
**doglink** — 유기견 구조 통합 대응 시스템

### 서비스 성격
- 고객은 국가·지자체(B2G), 사용자는 시민 제보자와 기관 담당자
- 시민: 앱 설치 없이 QR·링크로 접속하는 모바일 웹 (1분 내 제보 완료가 목표)
- 기관: 제보 큐·지도·처리 상태를 관리하는 PC 관제 대시보드
- 핵심 AI: 제보 사진의 객체를 분석해 유기견 상태를 판별하고 **출동 / 응급 / 부정** 으로 분류. 응급 판정 시 자동 신고 플로우 진입

### 디자인 목표
1. 시민이 처음 접속해도 **5초 이내**에 무엇을 해야 하는지 이해한다.
2. AI 판정 결과(출동·응급·부정)가 **3초 이내**에 색·아이콘·텍스트로 읽힌다.
3. 자동 신고처럼 시스템이 스스로 행동하는 순간은 반드시 크고 명확한 확인 UI로 노출한다.
4. 공공 서비스의 신뢰감·안정감·접근성을 확보하되, 반려동물 서비스의 온기를 잃지 않는다.
5. 시민용(모바일)과 기관용(PC)이 같은 토큰을 공유하되, 정보 밀도만 달리한다.

### 참조 기준
- 시민 플로우: Toss식 "한 화면 한 질문", GOV.UK 폼 패턴
- 기관 대시보드: Linear의 상태 뱃지·큐 관리, IBM Carbon의 데이터 테이블
- 준수성: KRDS(대한민국 디지털 정부서비스 디자인 시스템) 호환, WCAG 2.1 AA

---

## 2. 디자인 원칙 (6원칙)

### 1. Public Trust
공공기관 시스템처럼 정확하고 안정적으로 보인다. 과장된 마케팅 톤 금지.

### 2. Triage First
AI 판정 상태(출동·응급·부정)와 다음 행동이 화면에서 가장 먼저 인식돼야 한다. 상태보다 장식이 눈에 먼저 들어오면 실패다.

### 3. Human in Control
AI는 제안하고 사람이 확정한다. 자동 신고를 포함한 모든 시스템 자동 행동은 사용자에게 사전 고지·사후 확인 UI를 제공한다.

### 4. Calm and Clear
과도한 그림자·그라데이션·장식을 쓰지 않는다. 응급 상황일수록 화면은 더 차분해야 한다.

### 5. Accessible by Default
작은 글자, 낮은 대비, 작은 터치 영역을 금지한다. 색상만으로 상태를 전달하지 않는다.

### 6. Mobile First, Console Ready
시민 화면은 모바일 우선으로 완성하고, 기관 화면은 PC 관제 콘솔 기준으로 정보 밀도를 높인다.

---

## 3. 컬러 디자인 토큰

### 3.1 기본 배경

```css
--color-background: #F8F9F8;
--color-surface: #FFFFFF;
--color-surface-subtle: #F2F4F2;
--color-surface-muted: #E9EDEA;
```

### 3.2 텍스트

```css
--color-text-primary: #10110E;
--color-text-secondary: #5F6863;
--color-text-tertiary: #8C9590;
--color-text-disabled: #AEB5B1;
--color-text-inverse: #FFFFFF;
```

### 3.3 테두리와 구분선

```css
--color-border-default: #D8DDDA;
--color-border-strong: #B8C0BC;
--color-divider: #DDE2DF;
```

### 3.4 브랜드 색상 (doglink Blue)

```css
--color-primary-50: #EEF1FC;
--color-primary-100: #DDE4FA;
--color-primary-500: #526ED8;  /* 기본 행동 */
--color-primary-600: #425BBE;  /* hover */
--color-primary-700: #35499D;  /* pressed */
```

### 3.5 ★ AI 트리아지 상태 색상 (v2 신설 — 최우선 시맨틱)

트리아지 색상은 doglink의 핵심 시각 언어다. 처리 상태 색상(3.6)보다 항상 우선 노출한다.

#### 응급 (Emergency) — 즉시 대응 필요, 자동 신고 트리거
```css
--triage-emergency-text: #B01E1E;
--triage-emergency-bg: #FDEBEB;
--triage-emergency-border: #E89B9B;
--triage-emergency-solid: #D32F2F;  /* 응급 배너·자동신고 확인 화면 전용 */
```

#### 출동 (Dispatch) — 구조 출동 대상
```css
--triage-dispatch-text: #9A5A10;
--triage-dispatch-bg: #FFF3D3;
--triage-dispatch-border: #F2D58A;
--triage-dispatch-solid: #E8940A;
```

#### 부정 (Negative) — 유기견 아님 / 대응 불필요
```css
--triage-negative-text: #59615D;
--triage-negative-bg: #EEF0EF;
--triage-negative-border: #D3D8D5;
```

#### 판정 대기 (Analyzing) — AI 분석 중
```css
--triage-analyzing-text: #35499D;
--triage-analyzing-bg: #EEF1FC;
--triage-analyzing-border: #B9C6F0;
```

**트리아지 규칙**
- solid 계열은 응급 배너, 자동 신고 확인 화면, 지도 응급 마커에만 사용한다. 남용 시 경고 피로가 생긴다.
- 트리아지 상태는 항상 `아이콘 + 한글 라벨 + 색상` 3요소를 함께 노출한다. (응급: 🔴+사이렌 아이콘 / 출동: 🟠+차량 아이콘 / 부정: ⚪+체크 아이콘)
- 색각 이상 사용자를 위해 응급과 출동은 색상 외에 아이콘 형태로도 구분돼야 한다.

### 3.6 처리 상태 색상 (v1 유지)

```css
/* 확인 중 / 접수 대기 */
--status-pending-text: #9A5A10;
--status-pending-bg: #FFF3D3;
--status-pending-border: #F2D58A;

/* 보호 / 반환 완료 */
--status-success-text: #167A42;
--status-success-bg: #E8F7EE;
--status-success-border: #A7DCB9;

/* 기관 전달 */
--status-transfer-text: #743A99;
--status-transfer-bg: #F2E8F8;
--status-transfer-border: #D4B5E6;

/* 오류 */
--status-danger-text: #B83232;
--status-danger-bg: #FDECEC;
--status-danger-border: #EAB2B2;

/* 처리 완료 / 비활성 */
--status-neutral-text: #59615D;
--status-neutral-bg: #EEF0EF;
--status-neutral-border: #D3D8D5;
```

**역할 고정:** 파랑=행동, 빨강=응급(트리아지 전용), 주황·노랑=출동/대기, 초록=완료, 보라=기관 전달, 회색=부정/비활성. 이 매핑을 어떤 화면에서도 바꾸지 않는다.

---

## 4. 타이포그래피

```css
font-family:
  Pretendard,
  SUIT,
  "Noto Sans KR",
  "Apple SD Gothic Neo",
  system-ui,
  sans-serif;
```

### 타입 스케일

| 토큰 | 용도 | 크기 | 줄높이 | 굵기 |
|---|---|---:|---:|---:|
| display | 응급 배너, 온보딩 헤드라인 | 24px | 32px | 700 |
| title-page | 페이지 제목 | 20px | 28px | 700 |
| title-section | 섹션 제목 | 18px | 26px | 700 |
| title-card | 카드 제목 | 15px | 22px | 600 |
| body | 본문 | 14px | 22px | 400 |
| body-strong | 본문 강조 | 14px | 22px | 600 |
| label | 라벨·뱃지 | 13px | 18px | 600 |
| caption | 보조 정보 | 12px | 18px | 400 |
| button | 버튼 | 14px | 20px | 600 |
| mono-id | 사건번호·좌표 | 13px | 18px | 500 (tabular-nums) |

### 원칙
- 의미 있는 정보에 12px 미만 금지. 본문은 14px 이상.
- 사건 번호·시간·거리 등 숫자는 `font-variant-numeric: tabular-nums`로 정렬을 맞춘다.
- 굵기는 700(제목) / 600(강조·라벨) / 400(본문) 3단계만 사용.
- 응급 화면이라도 글자를 키우는 것으로 긴급함을 표현하고, 느낌표 남발·전체 대문자·깜빡임은 금지.

---

## 5. 간격 · 모서리 · 그림자

### 간격 (4px 기반)

```css
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;
--space-4: 16px;  --space-5: 20px;  --space-6: 24px;
--space-8: 32px;  --space-10: 40px; --space-12: 48px;
```

- 모바일 좌우 여백 20px / 카드 내부 16px / 카드 간 12px / 섹션 간 32~40px
- 기관 대시보드(PC)는 밀도를 높여 카드 내부 12~16px, 테이블 행 높이 44~48px
- 임의 값(7px, 13px 등) 금지, 토큰만 사용

### 모서리

```css
--radius-small: 8px;    /* 입력 필드, 보조 버튼 */
--radius-medium: 12px;  /* 버튼, 작은 카드 */
--radius-large: 16px;   /* 일반 카드 */
--radius-xlarge: 20px;  /* 지도, 주요 패널 */
--radius-pill: 999px;   /* 상태 뱃지 */
```

### 테두리·그림자
- 기본 카드: `1px solid var(--color-border-default)`, 그림자 없음
- 응급 카드: `1.5px solid var(--triage-emergency-border)` + 좌측 4px 응급색 액센트 바
- 그림자는 팝오버·바텀시트·플로팅 버튼에만 약하게 사용
- 점선 테두리는 어떤 경우에도 사용하지 않는다 (개발용 표시로 오인됨)

---

## 6. 핵심 컴포넌트

v1의 컴포넌트(AppHeader, SectionHeader, LiveReportCard, MapPanel, SortControl, ReportListItem, StatusBadge, ProcessTimeline, Button, DividerWithLabel)는 규격을 유지하고, v2에서 아래를 신설·수정한다.

### 6.1 ★ TriageBadge (신설)

AI 판정 결과 표시. StatusBadge와 별도 컴포넌트로 분리한다.

- variant: `emergency` | `dispatch` | `negative` | `analyzing`
- 높이 28px, 좌우 여백 12px, 글자 13px weight 600
- 구성: 상태 아이콘(14px) + 라벨. 아이콘 생략 불가
- `analyzing`은 부드러운 pulse 애니메이션 허용 (`prefers-reduced-motion` 시 정지)
- 리스트·지도 마커·상세 화면에서 동일한 색·라벨·아이콘 사용

### 6.2 ★ TriageResultCard (신설)

제보 직후 AI 판정 결과를 보여주는 카드. 제보 플로우의 감정적 정점이므로 가장 신중하게 설계한다.

**구성**
1. 제보 사진 썸네일 (판정 근거임을 보여줌)
2. TriageBadge (대형, 높이 32px)
3. AI가 판단한 근거 요약 1~2줄 (예: "왼쪽 뒷다리 부상 의심, 움직임 없음")
4. 신뢰도 표시 (텍스트: "AI 판단이며 담당자가 최종 확인합니다")
5. 다음 행동 버튼

**규칙**
- AI 판정을 단정형으로 쓰지 않는다. "응급으로 판단됩니다" (O) / "응급입니다" (X)
- 판정 근거 요약은 반드시 노출한다. 근거 없는 판정 표시는 신뢰를 깎는다.
- 사용자가 판정을 수정할 수 있는 진입점("판정이 다른 것 같아요")을 제공한다.

### 6.3 ★ EmergencyConfirmSheet (신설 — Critical Action)

응급 판정 → 자동 신고 직전에 노출되는 확인 바텀시트(모바일) / 모달(PC).

**구성**
1. 상단 응급 배너: `--triage-emergency-solid` 배경, 흰 글자, display 타이포
2. 신고될 내용 요약: 사진, 위치(주소 문자열), 시간, AI 판정 근거
3. 카운트다운 자동 진행 + 즉시 실행 버튼: "지금 바로 신고" (Primary, 응급색)
4. 중단 버튼: "응급이 아니에요" (Secondary) — 반드시 동일한 시각적 접근성으로 제공
5. 신고 완료 후: 접수번호 + "담당 기관에 전달되었습니다" 확인 화면

**규칙**
- 카운트다운은 최소 10초, 남은 시간을 숫자와 진행 바로 함께 표시
- 중단 버튼을 작게 만들거나 회색 텍스트 링크로 격하하지 않는다 (다크패턴 금지)
- 신고 실행 후에는 취소가 아닌 "정정 제보" 플로우로 안내
- 이 화면에서만 solid 응급색 대면적 사용 허용

### 6.4 ★ AgencyQueueRow (신설 — 기관 대시보드)

기관 담당자가 보는 제보 큐의 행 컴포넌트. Linear식 밀도 높은 리스트.

- 구성(좌→우): TriageBadge → 접수시간 → 사건번호(mono-id) → 사진 썸네일 32px → 특징 요약 → 위치 → 처리 StatusBadge → 담당자
- 행 높이 48px, 응급 행은 리스트 최상단 고정 + 좌측 응급 액센트 바
- 정렬 기본값: 트리아지 우선순위(응급 → 출동 → 대기 → 부정) → 시간순
- 키보드 탐색 지원 (↑↓ 이동, Enter 상세, 단축키로 상태 변경)

### 6.5 StatusBadge (v1 유지 + 수정)

- 처리 단계 전용: `pending` | `transfer` | `success` | `neutral` | `danger`
- 트리아지 상태를 StatusBadge로 표현하지 않는다. 반드시 TriageBadge 사용

### 6.6 ProcessTimeline (v1 유지 + 단계 수정)

단계: **제보됨 → AI 판정 → 확인 중 → 기관 전달 → 출동/보호 → 반환/종결**
- AI 판정 단계에는 트리아지 결과 아이콘을 함께 표시
- 응급 자동 신고 건은 "제보됨 → AI 판정 → 기관 전달"이 수 초 내 진행되므로, 타임스탬프를 초 단위까지 표시해 자동화가 실제 작동했음을 보여준다 (B2G 시연 포인트)

### 6.7 Button (v1 유지 + variant 추가)

- 기존: Primary / Secondary / Tertiary / Destructive / Status Action
- 추가: **Emergency** — `--triage-emergency-solid` 배경, EmergencyConfirmSheet 내부에서만 사용
- 공통: 높이 44px 이상, 모서리 12px, 로딩·비활성·focus-visible 상태 필수

### 6.8 MapPanel (v1 유지 + 마커 규칙 추가)

- 마커는 트리아지 색상 + 형태로 이중 구분: 응급=원형+사이렌, 출동=사각+차량, 부정=회색 점
- 공개 화면에서 정확 좌표를 숨기고 범위(반경 원)로 표시하는 규칙 유지
- 기관 화면에서만 정확 좌표 노출

---

## 7. 화면별 정보 구조

### 7.1 시민용 제보 플로우 (모바일)
Toss식 한 화면 한 질문. 순서:
1. 진입 (QR/링크) → 서비스 한 줄 설명 + "제보 시작" 버튼 하나
2. 사진 촬영/업로드 (카메라 즉시 실행)
3. 위치 확인 (GPS 자동 + 지도 미세조정)
4. 목격 내용 (선택 입력, 건너뛰기 가능)
5. **TriageResultCard** — AI 판정 표시
6. (응급 시) **EmergencyConfirmSheet**
7. 접수 완료 — 접수번호 + 상태 확인 링크

각 단계 하단 고정 CTA, 상단 진행 인디케이터, 뒤로가기 항상 가능.

### 7.2 시민용 메인 (모바일)
1. 앱 헤더 (doglink 로고)
2. "제보하기" 대형 CTA
3. 실시간 구조 현황 카드 (가로 스크롤)
4. 지도 기반 현황
5. 제보 목록 (건수 + 최근순/거리순)

### 7.3 기관용 관제 대시보드 (PC)
1. 좌측: 필터 사이드바 (트리아지·처리 상태·기간·지역)
2. 중앙: AgencyQueueRow 리스트 (응급 상단 고정)
3. 우측: 선택 건 상세 패널 (사진, AI 판정 근거, ProcessTimeline, 상태 변경 버튼)
4. 상단: 응급 미처리 건수 카운터 — 0건이 아니면 응급색 표시

시민 화면과 운영 기능을 절대 한 화면에 혼합하지 않는다 (v1의 혼합 구조를 v2에서 분리).

---

## 8. 반응형 규칙

### Mobile 360~430px (시민 기본)
- 좌우 여백 20px, 한 열, 하단 고정 CTA
- 360px에서 가로 넘침 없음을 필수 검수

### Tablet 768px+
- 지도와 목록 2열 가능, 실시간 카드 2~3개 노출

### Desktop 1024px+ (기관 기본)
- 콘텐츠 최대 너비 1200px (대시보드는 1440px까지 허용)
- 3패널 레이아웃 (필터 / 큐 / 상세)
- 모바일 화면의 단순 확대 금지, 정보 구조 재배치

---

## 9. 접근성 (WCAG 2.1 AA + KRDS 호환)

- 일반 텍스트 대비 4.5:1, 큰 텍스트 3:1 이상
- 터치 영역 44×44px 이상
- 트리아지 상태: 색 + 아이콘 + 텍스트 3요소 필수 (색각 이상 대응)
- 응급 자동신고 카운트다운: 스크린리더에 `aria-live="assertive"` 고지, 시간 연장 수단 제공
- 모든 인터랙션에 focus-visible, 아이콘 버튼에 aria-label
- 애니메이션은 prefers-reduced-motion 지원
- 지도 정보는 목록으로도 동일하게 접근 가능해야 함 (지도 단독 의존 금지)
- KRDS 컴포넌트 명세와 충돌 시 KRDS를 우선한다 (B2G 조달 대비)

---

## 10. 코드 구현 지침

### 스택 전제
- Next.js(또는 Vite) + Tailwind CSS + shadcn/ui 기준
- 지도: Kakao Maps 또는 Naver Maps SDK
- 기존 코드베이스가 있다면 프레임워크·폴더 구조·코딩 규칙을 유지

### 금지
- 기존 프레임워크 임의 교체, 불필요한 UI 라이브러리 설치
- 기능·데이터 로직 삭제
- 색상·간격 하드코딩 (토큰 미사용), 인라인 스타일 남용
- 화면마다 별도의 뱃지 구현 (TriageBadge / StatusBadge 단일 구현 재사용)
- Lorem ipsum·의미 없는 영문 더미 (한국어 실제형 데이터 사용: "서귀포시 ○○공원 인근, 검은 중형견")

### 구현 원칙
- 모든 토큰을 Tailwind theme 또는 `:root` CSS 변수로 등록하고 semantic naming 사용
  (예: `bg-triage-emergency`, `text-status-success`)
- 컴포넌트는 variant 기반 (cva 등), TypeScript props 타입 명시
- 트리아지·처리 상태는 `data-state` 속성으로 관리해 상태값과 스타일을 직접 연결
- CLAUDE.md에 이 문서의 토큰·규칙 요약을 등록해 세션 간 일관성 유지

### 생성 순서
1. 코드베이스·화면 구조 분석
2. 디자인 시스템 적용 계획
3. 토큰 파일 (`tokens.css` 또는 `tailwind.config`)
4. 전역 타이포·스타일
5. 공통 컴포넌트 (TriageBadge → StatusBadge → Button → 카드류 → EmergencyConfirmSheet)
6. 시민 제보 플로우 → 시민 메인 → 기관 대시보드 순 리팩터링
7. 반응형·접근성 처리
8. 디자인 시스템 미리보기 페이지 (`/design-system`)
9. `docs/design-system.md` 문서화
10. 변경 파일 목록과 이유 설명

---

## 11. 최종 검수 기준

- [ ] 트리아지 색·아이콘·라벨이 모든 화면(리스트·지도·상세·대시보드)에서 동일한가?
- [ ] 응급 확인 화면에서 "응급이 아니에요" 버튼이 신고 버튼과 동등한 접근성을 갖는가?
- [ ] AI 판정에 근거 요약과 "담당자가 최종 확인" 고지가 항상 붙어 있는가?
- [ ] solid 응급색이 응급 배너·확인 화면·지도 마커 외에 남용되지 않았는가?
- [ ] 12px 미만의 중요 텍스트, 44px 미만의 터치 영역이 없는가?
- [ ] 색상을 제거해도(그레이스케일) 트리아지 상태를 구분할 수 있는가?
- [ ] 시민 화면과 기관 기능이 완전히 분리돼 있는가?
- [ ] 360px에서 가로 넘침이 없고, PC에서 콘텐츠가 과도하게 늘어나지 않는가?
- [ ] 숫자·사건번호가 tabular-nums로 정렬돼 있는가?
- [ ] 점선 테두리·개발용 표시가 남아 있지 않은가?
- [ ] 전체 인상이 "반려동물 커머스 앱"이 아니라 "신뢰도 높은 공공 대응 시스템"인가?

분석과 계획을 먼저 제시한 뒤 코드를 수정하라.
불확실한 부분은 새 기능을 임의로 만들지 말고, 이 문서와 화면 목적 기준으로 가장 보수적인 방향을 선택하라.
