# DOG-LINK 운영자 서비스 제작 프롬프트

당신은 공공기관용 B2G 관제·운영 시스템 구축 경험이 있는 시니어 프로덕트 디자이너이자 시니어 프론트엔드 엔지니어다.

현재 프로젝트 디렉터리에 포함된 다음 문서를 먼저 읽고, 문서의 요구사항을 기준으로 DOG-LINK 운영자 서비스를 구현하라.

- `TalkFile_doglink_운영자_플로우_디자인시스템(1).md`
- `TalkFile_doglink_운영자_플로우차트(1).md`

파일명이 다르더라도 내용이 동일한 운영자 플로우·디자인 시스템 문서를 찾아 사용하라.

두 문서는 참고 자료가 아니라 이번 구현의 핵심 요구사항이다. 문서에 명시된 화면 흐름, 상태 머신, 응급 처리 원칙, 디자인 토큰, 컴포넌트 규칙, 접근성 기준을 임의로 삭제하거나 소비자용 서비스 구조로 변경하지 마라.

시민 제보자 서비스가 같은 저장소에 존재한다면 다음 공통 자산을 반드시 재사용하라.

- 디자인 토큰
- Button
- TriageBadge
- StatusBadge
- ProcessTimeline
- 공통 아이콘 및 접근성 유틸리티
- 날짜·시간·사건번호 표시 규칙

운영자용이라는 이유로 같은 컴포넌트를 별도로 복제하지 마라.

구현 전 반드시 현재 코드베이스를 분석하고, 분석 결과와 작업 계획을 먼저 출력한 뒤 코드를 작성하라.

---

## 0. 요구사항 우선순위

충돌이 발생할 경우 다음 순서로 판단하라.

1. 업로드된 운영자 플로우차트의 불변 규칙과 상태 머신
2. 업로드된 운영자 플로우 디자인 시스템
3. 현재 코드베이스의 기존 데이터 모델·API 계약
4. 현재 코드베이스의 프레임워크·폴더 구조·코딩 규칙
5. 이 프롬프트의 구현 기본값

기존 코드가 업로드 문서와 충돌한다면 임의로 한쪽을 삭제하지 말고, 충돌 지점과 보수적인 해결 방식을 먼저 설명하라.

---

## 1. 프로젝트 정의

### 프로젝트명

DOG-LINK  
유기견·유실견 발견 제보 연계 서비스 — 기관 운영자 콘솔

### 구현 범위

지자체, 동물보호센터, 구조기관의 담당자가 시민 제보 큐를 확인하고 다음 업무를 처리하는 별도 운영자 콘솔을 구현한다.

- 기관 계정 로그인
- 제보 큐 확인
- 응급 건 상시 인지
- 필터·검색·정렬
- 사건 상세 확인
- AI 트리아지 제안 검토
- AI 판정 번복
- 중복 제보 및 실종 신고 매칭
- 담당자 배정
- 상태 변경
- 종결 결과 기록
- 감사 로그 확인
- 지도 기반 현황 확인
- 통계·보고서 확인 및 내보내기
- 시민 상태 확인 페이지와 처리 상태 연동

### 이번 범위에서 제외할 항목

현재 코드베이스나 API 명세에 없는 다음 기능은 임의로 완성된 것처럼 구현하지 마라.

- 실제 공공 SSO 인증 서버
- 실제 기관 간 공문 또는 출동 배차 시스템
- 실제 보호자 문자·푸시 발송
- 실제 AI 모델 학습 파이프라인
- 실제 행정망 연계
- 실제 PDF 보고서 서버 생성
- 문서에 없는 세부 직급·권한 체계

필요한 외부 시스템이 준비되지 않았다면 adapter와 mock을 분리하여 구현하고, 실제 연동이 필요한 지점을 문서화하라.

### 시민 서비스와의 분리

- 운영자 콘솔은 시민 제보 화면과 완전히 분리한다.
- 운영자 콘솔은 로그인 후에만 접근 가능하다.
- 시민 서비스의 모바일 제보 플로우를 운영자 콘솔 안에 섞지 않는다.
- 운영자의 상태 변경은 시민 상태 확인 페이지 S7에 반영되는 데이터 계약을 사용한다.
- 운영자 화면에는 처리에 필요한 정확 좌표를 표시할 수 있지만 시민 공개 화면에는 위치 범위만 노출한다.

---

## 2. 핵심 사용자와 업무 환경

### 주요 사용자

- 지자체 동물보호 담당 공무원
- 동물보호센터 운영자
- 구조기관 담당자

### 업무 환경

- 하루 수십 건의 제보를 PC에서 처리
- 전화 응대와 현장 업무를 동시에 수행
- 짧은 시간에 많은 행을 스캔
- 긴급 제보를 놓치면 큰 피해가 발생할 수 있음
- 마우스와 키보드를 번갈아 사용
- 노트북, 태블릿, 현장 모바일에서도 최소 기능을 확인할 수 있어야 함

### 설계 3대 전제

#### 1. Emergency Never Buried

응급 건은 어떤 필터, 정렬, 스크롤 위치에서도 묻히지 않아야 한다.

반드시 다음 세 가지 경로로 인지 가능하게 한다.

- 글로벌 응급 미처리 카운터
- 큐 최상단 고정
- 자동 소멸하지 않는 응급 토스트

#### 2. Queue → Detail → Action

운영자는 큐에서 사건을 선택하고, 상세에서 판단하고, 한 번의 행동으로 상태를 변경한다.

큐에서 상태 변경까지 3클릭 이내를 목표로 한다.

#### 3. AI Proposes, Human Decides

AI는 다음 항목을 제안할 수 있다.

- 트리아지 판정
- 판정 근거
- 유사 제보 후보
- 실종 신고 매칭 후보

그러나 AI는 다음 작업을 자동으로 확정하지 않는다.

- 상태 변경
- 중복 병합
- 실종 신고 연결
- 판정 번복
- 종결

최종 결정은 항상 운영자가 수행하고, 모든 결정은 감사 로그에 남긴다.

---

## 3. 반드시 구현할 전체 운영 흐름

다음 순서를 기본 흐름으로 유지하라.

```text
O1 로그인
→ O2 관제 홈·제보 큐
→ O3 건 상세
→ O4 판단·조치
→ O5 상태 변경
→ O6 종결·기록
→ O7 통계·보고
```

다음 보조 흐름은 상시 병행한다.

```text
O2-E 응급 알림 처리
O2-Map 지도 뷰
O4-R AI 판정 번복
O4-M 중복 제보·실종 매칭
```

### 시민 화면 연동

```text
O5 운영자 상태 변경
→ 공용 사건 상태 데이터 갱신
→ 시민 상태 확인 페이지 S7 반영
→ 운영자 성공 토스트에 "시민 화면에 반영됨" 표시
```

실제 실시간 채널이 없다면 polling 또는 mock event adapter로 구현하되, 실제 연동처럼 속이지 말고 개발 문서에 명확히 기록한다.

---

## 4. 처리 상태 머신

운영자가 변경할 수 있는 처리 상태는 아래 상태 머신을 기준으로 한다.

```text
접수됨
├─ 확인 시작 → 확인 중
└─ 부정 종결 → 부정 종결

확인 중
├─ 기관 전달 → 기관 전달
├─ 출동 지시 → 출동
└─ 부정 종결 → 부정 종결

기관 전달
├─ 보호 처리 → 보호
└─ 반환 처리 → 반환

출동
├─ 보호 처리 → 보호
└─ 반환 처리 → 반환

보호
└─ 종결 → 종결

반환
└─ 종결 → 종결
```

### 상태 코드 권장안

현재 API 상태 코드가 있다면 기존 코드를 우선 사용한다.

상태 코드가 없다면 다음 타입을 사용할 수 있다.

```ts
type ProcessingStatus =
  | "submitted"
  | "reviewing"
  | "transferred"
  | "dispatched"
  | "protected"
  | "returned"
  | "negative_closed"
  | "closed";
```

### 허용 전환

```ts
const ALLOWED_TRANSITIONS: Record<
  ProcessingStatus,
  readonly ProcessingStatus[]
> = {
  submitted: ["reviewing", "negative_closed"],
  reviewing: ["transferred", "dispatched", "negative_closed"],
  transferred: ["protected", "returned"],
  dispatched: ["protected", "returned"],
  protected: ["closed"],
  returned: ["closed"],
  negative_closed: [],
  closed: [],
};
```

### 상태 머신 규칙

- 상태 머신에 없는 전환 버튼은 UI에 표시하지 않는다.
- 단순히 버튼을 비활성화하는 데 그치지 말고 데이터 계층에서도 전환을 검증한다.
- 종결은 확인 다이얼로그를 한 번 거친다.
- 담당자가 배정되지 않은 사건의 상태를 변경하면 현재 사용자에게 자동 배정하고 이를 고지한다.
- 모든 상태 변경은 감사 로그 기록과 함께 원자적으로 처리해야 한다.
- 낙관적 업데이트를 사용할 수 있지만 실패 시 이전 상태로 롤백하고 오류 토스트를 표시한다.
- 종결 및 부정 종결 사건은 기본 큐에서 숨길 수 있으나 필터로 다시 조회 가능해야 한다.
- 사건 삭제 기능은 만들지 않는다.

---

## 5. 기본 정보 구조와 레이아웃

운영자 콘솔은 Desktop First로 구현한다.

### Desktop 1280px 이상

기본 3패널 구조:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ GlobalBar: 서비스명 · 응급 카운터 · 갱신 시각 · 계정               │
├──────────────┬───────────────────────────────┬───────────────────────┤
│ FilterSidebar│ 제보 큐                       │ DetailPanel           │
│ 240px        │ 가변 너비                     │ 400px                 │
│              │ AgencyQueueRow 목록           │ 선택 사건 상세        │
└──────────────┴───────────────────────────────┴───────────────────────┘
```

- 전체 콘텐츠 최대 너비 약 1440px
- 필터 240px
- 큐 영역 가변
- 상세 패널 400px
- 패널 사이는 그림자가 아닌 구분선으로 나눈다.
- 상세 패널 하단에 ActionBar를 고정한다.

### Laptop 1024~1279px

- FilterSidebar를 접이식 드로어 또는 팝오버로 전환
- 큐와 상세의 2패널 구조 유지
- 상세 패널은 약 380~400px
- 응급 카운터는 항상 노출

### Tablet 768~1023px

- 큐를 기본 화면으로 표시
- 상세는 오버레이 또는 전체 너비 패널로 표시
- 필터는 드로어로 전환
- 상세를 닫으면 이전 큐 포커스와 스크롤 위치를 복원

### Mobile 430px 이하

현장 대응을 위한 최소 지원 모드다.

- 큐 목록
- 응급 사건 확인
- 사진과 위치 확인
- 상태 변경
- 상세 전체 화면 전환

다음 기능은 모바일에서 조회 전용으로 제한할 수 있다.

- 통계·보고
- 중복 및 실종 매칭
- 복잡한 필터 조합

모바일에서도 응급 카운터를 숨기지 않는다.

---

## 6. 화면별 상세 명세

# O1. 기관 계정 로그인

### 목표

장식보다 신뢰성과 명확한 인증 상태를 우선한다.

### 필수 구성

- DOG-LINK 운영자 콘솔 서비스명
- 기관 계정 로그인 폼
- 아이디 또는 기관 계정 식별자
- 비밀번호
- 로그인 버튼
- 로그인 오류 메시지
- 세션 만료 안내
- 공공 SSO 연동 예정 구조를 고려한 인증 adapter

### 디자인

Desktop에서는 다음과 같이 구성할 수 있다.

- 좌측: 서비스 소개 한 줄과 운영 목적
- 우측: 로그인 폼

좁은 화면에서는 단일 열로 전환한다.

### 보안·오류 문구

로그인 실패 시 존재하는 계정인지, 비밀번호가 틀렸는지 구체적으로 노출하지 않는다.

권장 문구:

> 계정 정보를 확인하고 다시 시도해 주세요.

세션 만료 문구:

> 보안을 위해 로그인 세션이 종료되었습니다. 다시 로그인해 주세요.

### 구현 규칙

- 실제 인증 API가 있으면 기존 계약 사용
- 없다면 auth adapter와 mock session을 분리
- 인증 토큰을 소스 코드에 하드코딩하지 않음
- 보호된 라우트 적용
- 세션 만료 시 작업 중이던 상세 경로를 안전하게 복원할 수 있도록 return URL 처리
- 문서에 없는 세부 역할 권한은 임의로 만들지 않음

---

# O2. 관제 홈·제보 큐

운영자가 하루 중 가장 오래 머무는 핵심 화면이다.

### 우선순위

1. 응급 건 인지
2. 빠른 스캔
3. 정확한 선택
4. 짧은 상태 변경 경로
5. 필터와 검색
6. 포커스 및 스크롤 유지

### 상단 GlobalBar

필수 요소:

- 서비스명
- 현재 화면 또는 기관명
- EmergencyCounter
- 최근 갱신 시각
- 수동 새로고침
- 자동 갱신 상태
- 담당자 계정 메뉴

### EmergencyCounter

#### 0건

- neutral 스타일
- `응급 미처리 0건`

#### 1건 이상

- `--triage-emergency-solid` 배경
- 흰색 텍스트
- 사건 수 표시
- 클릭 시 응급 필터 즉시 적용
- `aria-live="assertive"`

#### 15분 이상 미처리 사건 존재

다음 형식으로 최장 경과 시간을 병기한다.

> 응급 2건 · 최장 17분 경과

### 자동 갱신

- 기본적으로 polling 또는 SSE 사용
- 최근 갱신 시각 표시
- 새 데이터가 들어와도 현재 포커스를 강제로 이동하지 않음
- 신규 일반 제보는 `aria-live="polite"`
- 신규 응급 제보는 `aria-live="assertive"`
- 네트워크 오류 시 자동 재시도와 수동 새로고침 제공
- 데이터 갱신 중 기존 큐를 불필요하게 비우지 않음

### 큐 기본 정렬

기본 우선순위는 다음과 같다.

```text
응급 → 출동 → 대기·확인 필요 → 부정
```

같은 우선순위 안에서는 오래된 미처리 건이 먼저 오도록 시간순으로 정렬한다.

응급 건은 다음 조건을 가진다.

- 리스트 최상단 고정
- 좌측 4px 응급 액센트 바
- 필터로 리스트에서 감춰지더라도 글로벌 응급 카운터는 유지
- 신규 유입 시 상단에 삽입
- 약 2초간 배경 하이라이트
- 스크롤 위치를 갑자기 강탈하지 않음

### AgencyQueueRow

행 높이는 기본 48px이다.

왼쪽에서 오른쪽 순서:

1. TriageBadge
2. 접수 시간
3. 사건번호
4. 사진 썸네일 32px
5. AI 특징 요약
6. 발견 위치
7. 처리 StatusBadge
8. 담당자 표시

#### 행 상태

- 기본: surface
- hover: surface-subtle
- 선택: primary-50 배경 + 좌측 2px primary bar
- 응급: 좌측 4px emergency bar
- 선택된 응급: 응급 액센트와 선택 상태가 모두 구분되어야 함
- 신규: 일시적 하이라이트
- 읽지 않음이 필요하면 기존 API 필드를 사용하며 임의로 상태를 추가하지 않음

#### 텍스트

- 사건번호, 시간, 좌표는 `tabular-nums`
- 긴 특징과 위치는 한 줄 말줄임
- 전체 값은 title, tooltip 또는 상세 패널에서 확인 가능
- 상대 시간과 절대 시간을 함께 접근 가능하게 제공
- 예: `12분 전`과 `2026-07-27 14:20`

### 큐 빈 상태

필터 결과가 없는 경우:

> 조건에 맞는 제보가 없습니다.

전체 제보가 없는 경우:

> 현재 접수된 제보가 없습니다.

빈 상태에서도 다음 기능은 유지한다.

- 필터 초기화
- 새로고침
- 응급 카운터
- 지도 뷰 전환

---

# O2 필터 사이드바

### 필터 종류

- 트리아지: 다중 선택
- 처리 상태: 다중 선택
- 기간
- 지역
- 담당자
- 나에게 배정된 건
- 검색: 사건번호, 위치, AI 특징 요약

### 적용 규칙

- 적용된 필터를 칩으로 표시
- 각 칩 개별 해제
- 전체 필터 초기화
- 큐와 지도 뷰가 같은 필터 상태 공유
- URL query 또는 복원 가능한 상태로 관리
- 페이지를 새로고침해도 주요 필터가 가능하면 유지
- 응급 카운터는 현재 필터와 독립적으로 전체 미처리 응급 수를 보여준다.

### 검색

- `/` 키로 검색창 포커스
- 입력 필드에 포커스된 동안 전역 단축키 비활성화
- 검색 중에도 응급 알림은 유지
- 서버 검색 API가 있다면 debounce 적용
- 클라이언트 검색만 가능한 경우 데이터 규모 한계를 문서화

---

# O2 키보드 워크플로

다음 단축키를 구현한다.

```text
↑ / ↓ : 큐 행 이동
Enter : 선택 사건 상세 열기
Esc   : 상세·오버레이 닫기
E     : 기관 전달
P     : 보호 처리
R     : 반환 처리
A     : 나에게 배정
/     : 검색 포커스
?     : 단축키 도움말
```

### 키보드 규칙

- 현재 상태에서 허용되지 않는 단축키는 실행하지 않는다.
- 실행되지 않은 이유를 필요할 경우 안내한다.
- input, textarea, select, contenteditable에 포커스된 동안 업무 단축키를 비활성화한다.
- 행 이동 시 `aria-activedescendant` 또는 명확한 roving tabindex 패턴을 사용한다.
- 상세를 닫으면 기존 큐 행에 포커스를 복원한다.
- 단축키 도움말은 `?`로 열고 Esc로 닫는다.


---

# O2-E. 응급 알림 처리

응급 알림은 단순한 장식용 토스트가 아니라 놓치면 안 되는 지속 알림이다.

### 신규 응급 유입

다음을 동시에 수행한다.

1. EmergencyCounter 증가
2. 큐 최상단에 사건 삽입
3. 우상단 EmergencyToast 표시
4. 시각적 하이라이트
5. 스크린리더 assertive 안내
6. 설정이 켜진 경우 보조 사운드 재생

### EmergencyToast 구성

- 응급색 테두리
- 사진 썸네일
- 위치
- 접수 시간
- AI 판정 근거 한 줄
- 사건 열기 버튼
- 수동 닫기 버튼

### 규칙

- 자동 소멸시키지 않는다.
- 클릭하면 해당 사건 상세를 즉시 연다.
- 토스트를 닫아도 EmergencyCounter와 큐 최상단 고정은 유지한다.
- 사운드는 시각 알림을 대체하지 않는다.
- 사운드는 사용자 설정으로 켜고 끌 수 있다.
- 같은 사건의 중복 토스트를 방지한다.
- 이미 상세를 열고 있는 사건이 갱신되면 중복 상세를 열지 않고 변경 사실을 안내한다.
- 15분 이상 미처리 상태가 지속되면 경과 시간을 카운터와 상세에 표시한다.
- 응급 자동신고로 유입된 건은 `시민 확인 후 자동 접수` 이력을 상세와 감사 로그에 표시한다.

---

# O2-Map. 지도 뷰

큐와 같은 사건 데이터를 지도에서 확인하는 탭이다.

### 필수 기능

- 큐와 같은 필터 상태 공유
- 정확 좌표 기반 마커
- 마커 클러스터링
- 지도 이동 및 확대·축소
- 마커 클릭 시 미니 카드
- 미니 카드에서 상세 패널 열기
- 리스트 뷰로 복귀
- 선택 사건과 지도 마커의 상호 강조

### 마커 구분

색상과 형태를 함께 사용한다.

- 응급: 원형 + 사이렌 아이콘
- 출동: 사각형 + 차량 아이콘
- 부정: 회색 점 + 체크 또는 중립 아이콘
- 기타 처리 상태는 트리아지 의미를 침범하지 않도록 보조 표현만 사용

### 위치 정보 규칙

- 운영자 화면에서는 처리 목적상 정확 좌표와 주소를 표시할 수 있다.
- 시민 상태 확인 화면에는 정확 좌표를 전달하지 않는다.
- 지도 데이터를 권한 없는 공개 API 응답에 포함하지 않는다.
- 지도만으로 사건 접근이 가능하도록 만들지 말고 동일 데이터에 리스트로도 접근할 수 있어야 한다.

### SDK 처리

현재 프로젝트에 Kakao Maps 또는 Naver Maps SDK가 있다면 기존 방식을 유지한다.

API 키가 없거나 SDK가 준비되지 않았다면 다음을 구현한다.

- map adapter
- mock 지도 패널
- 좌표 목록 또는 리스트 폴백
- SDK 로드 실패 안내
- 빈 지도 화면 방치 금지

---

# O3. 건 상세 패널

Desktop에서는 우측 400px 패널, 좁은 화면에서는 전체 화면 또는 오버레이로 표시한다.

### 상세 패널 구성 순서

1. 사건 헤더
2. 사진 원본 뷰어
3. AI 판정 카드
4. 제보 정보
5. ProcessTimeline
6. 중복·실종 매칭 후보
7. 감사 로그
8. 하단 고정 ActionBar

### 1. 사건 헤더

필수 요소:

- 사건번호
- 사건번호 복사
- TriageBadge
- StatusBadge
- 담당자
- 접수 시각
- 마지막 갱신 시각
- 패널 닫기

### 2. 사진 원본 뷰어

- 최대 3장 대응
- 확대·축소
- 다음·이전 사진
- 전체 화면 보기
- 원본 비율 유지
- 이미지 로드 실패 폴백
- 썸네일과 큰 이미지 연결
- 키보드 접근 가능
- 이미지 alt는 사건 맥락을 설명하되 AI 판정을 사실처럼 단정하지 않음

### 3. AITriageCard

다음을 표시한다.

- AI 트리아지 결과
- 판정 근거
- 신뢰도 또는 참고 점수
- 분석 시각
- 담당자 최종 확인 여부
- `판정 번복` 버튼

신뢰도 수치는 보조 caption으로 표시하고, 판정 근거가 정보 위계의 주인공이 되게 한다.

예시:

> 왼쪽 뒷다리 부상이 의심되며 움직임이 적어 보입니다.

AI 결과는 확정 사실이 아닌 제안으로 표현한다.

### 4. 제보 정보

- 정확 좌표
- 읽기 쉬운 주소
- 지도 열기
- 목격 시각
- 접수 시각
- 시민 서술
- 상황 칩
- 사진 수
- 응급 자동신고 여부
- 데이터가 없는 항목의 명확한 빈 상태

### 5. ProcessTimeline

다음 처리 흐름을 공용 컴포넌트로 표시한다.

```text
제보됨
→ AI 판정
→ 확인 중
→ 기관 전달 또는 출동
→ 보호 또는 반환
→ 종결
```

- 각 단계 타임스탬프
- 중요한 응급 이벤트는 초 단위 표시 가능
- 현재·완료·예정 구분
- 상태 변경자 정보는 감사 로그에서 확인
- 제보자 서비스와 같은 ProcessTimeline 구현 재사용

### 6. 중복·실종 매칭 후보

O4-M 컴포넌트를 상세 안에 배치한다.

### 7. 감사 로그

최신순 또는 사용자가 선택 가능한 정렬을 제공한다.

### 8. ActionBar

현재 상태에서 가능한 다음 행동만 표시한다.

---

# O4-R. AI 판정 번복

운영자는 AI의 트리아지 판정을 검토하고 번복할 수 있다.

### 번복 진입

`판정 번복` 버튼을 누르면 다이얼로그 또는 상세 내부 폼을 표시한다.

### 필수 입력

번복 사유를 반드시 선택하게 한다.

- 오탐
- 상태 변화
- 정보 부족
- 기타

`기타`를 선택한 경우 간단한 설명 입력을 요구할 수 있다.

### 번복 결과

- 새로운 트리아지 값 저장
- 번복 사유 저장
- 변경 담당자 저장
- 변경 시각 저장
- 원 판정은 삭제하지 않음
- 원 판정은 취소선 또는 `이전 판정` 레이블로 보존
- 감사 로그 기록
- AI 개선 데이터로 활용될 수 있음을 UI에 고지
- 시민 공개 화면에 어떤 결과를 노출할지는 기존 API 정책을 따름

### 금지

- 번복 사유 없는 저장
- 원 판정 덮어쓰기
- AI 신뢰도만 보고 자동 번복
- 번복과 처리 상태 변경을 하나의 숨은 동작으로 결합
- 로그에서 원 기록 삭제

---

# O4-M. 중복 제보·실종 신고 매칭

AI가 후보를 제안하고 운영자가 확정하는 영역이다.

AI는 후보를 자동 병합하거나 자동 연결하지 않는다.

### 후보 카드

최대 3건을 우선 표시한다.

각 후보에는 다음 정보를 제공한다.

- 현재 사건 사진
- 후보 사건 또는 실종 신고 사진
- 사건번호
- 접수 또는 신고 시각
- 거리
- 위치
- 털색
- 무늬
- 크기
- 시간 차이
- 참고 유사 점수
- 유사 근거 항목

사진은 좌우 비교가 가능하게 배치한다.

### 가능한 행동

- 같은 개체 — 연결
- 중복 — 병합
- 무관

각 버튼은 최소 44px 터치·클릭 영역을 갖는다.

### 같은 개체 연결

- 두 사건을 관계로 연결
- 원 사건 데이터 유지
- 각 사건 상세에서 연결 관계 확인 가능
- 감사 로그 기록

### 중복 병합

병합 전 다음을 표시한다.

- 대표 사건
- 병합될 사건
- 유지되는 사진과 정보
- 병합 후 시민 상태 링크 처리 방식
- 병합으로 사라지지 않고 보존되는 원 기록
- 병합 취소 가능 여부

병합은 미리보기 후 운영자가 확정한다.

병합 완료 후에도 원 사건은 감사 추적을 위해 삭제하지 않는다.

### 무관

- 후보 제외
- 판단자와 시각 기록
- 이후 동일 후보가 반복 제안될지에 대한 기존 API 정책 준수

### 실종 신고 매칭

실종 신고와 연결한 뒤 보호자 알림을 실제로 발송하기 전에 별도 확인 단계를 둔다.

실제 알림 API가 없다면 다음만 구현한다.

- 연결 상태
- 발송 확인 UI
- notification adapter
- mock 결과
- 실제 발송이 필요하다는 문서

---

# O5. 상태 변경 ActionBar

상세 패널 하단에 고정한다.

### 현재 상태별 활성 액션

| 현재 상태 | 활성 액션 |
|---|---|
| 접수됨 | 확인 시작, 부정 종결 |
| 확인 중 | 기관 전달, 출동 지시, 부정 종결 |
| 기관 전달 | 보호 처리, 반환 처리 |
| 출동 | 보호 처리, 반환 처리 |
| 보호 | 종결 |
| 반환 | 종결 |
| 부정 종결 | 없음 |
| 종결 | 없음 |

### ActionBar 규칙

- 높이 44px 이상의 Status Action 버튼
- 현재 가능한 다음 행동만 표시
- 가장 일반적인 다음 행동을 시각적으로 우선하되 위험 행동과 혼동시키지 않음
- 종결과 부정 종결은 확인 다이얼로그 사용
- 상태 변경 중 버튼 비활성화
- 중복 클릭 방지
- 성공 후 큐 행·상세·시민 상태 데이터를 동기화
- 실패 시 롤백
- 성공 토스트에 `시민 화면에 반영됨` 표시
- 담당자 미배정 상태에서 변경하면 본인 자동 배정 고지
- 단축키로 실행할 때도 같은 확인·검증 경로 사용

### 부정 종결 확인

부정 종결은 기록이 남는 종결 상태다.

확인 다이얼로그에 다음을 표시한다.

- 사건번호
- 현재 트리아지
- 부정 종결 사유
- 시민 상태 페이지에 표시될 상태
- 되돌림 정책

API에 되돌림 기능이 없다면 가능한 것처럼 표현하지 않는다.

---

# O6. 종결·기록

### 종결 결과 분류

- 보호소 인계
- 보호자 반환
- 자연 복귀
- 부정 또는 오인
- 기타

### 종결 시 필수 처리

- 결과 분류 저장
- 종결 담당자 저장
- 종결 시각 저장
- 선택적 종결 메모
- 전체 처리 소요 시간 계산
- 단계별 경과 시간 계산
- 관여 담당자 표시
- 시민 상태 페이지 반영
- 감사 로그 기록

### 종결 요약 카드

다음을 제공한다.

- 접수번호
- 최종 결과
- 총 소요 시간
- 초동 대응 시간
- 단계별 경과
- 담당자
- 연결·병합 관계
- 최종 갱신 시각

### 기록 보존

- 종결 사건 삭제 금지
- 기본 큐에서는 숨길 수 있음
- 필터로 조회 가능
- 감사 로그와 원 판정 보존
- 병합된 사건도 원 기록 보존
- 임의의 영구 삭제 UI 생성 금지

---

# O7. 통계·보고

국가·지자체 고객에게 운영 현황과 시스템 효과를 설명하는 화면이다.

### 기간 필터

- 오늘
- 최근 7일
- 최근 30일
- 이번 달
- 사용자 지정 기간

### 지표 카드

- 총 제보 수
- 응급 건수
- 평균 초동 대응 시간
- 평균 종결 시간
- 중복 병합 건수
- AI 판정 번복률

### 기준 정의

모든 수치에는 기준 정의를 caption으로 표시한다.

예:

> 초동 대응 시간 = 접수 시각부터 확인 시작 시각까지

> 종결 시간 = 접수 시각부터 종결 시각까지

> AI 판정 번복률 = 운영자가 AI 최초 판정을 변경한 사건 수 ÷ AI 판정 완료 사건 수

데이터 계약에 정의가 있다면 기존 정의를 우선 사용한다.

### 추이 차트

- 주 단위 제보량
- 월 단위 제보량
- 평균 대응 시간
- 평균 종결 시간
- 응급 비율
- AI 번복률

색상 규칙:

- 일반 추이는 primary와 neutral
- 트리아지 데이터에만 emergency, dispatch, negative 색상 사용
- 색상만으로 시리즈를 구분하지 말고 라벨·패턴·마커 병기
- 차트 아래 접근 가능한 데이터 표 제공

### 지역별 분포

- 지역별 건수
- 지도 또는 표
- 지역 필터
- 정확 좌표가 필요하지 않은 집계 화면에서는 불필요한 상세 좌표 노출 금지

### 내보내기

- CSV
- PDF

실제 서버 내보내기 API가 없다면 export adapter를 만들고 다음을 구분한다.

- 클라이언트 CSV 생성 가능
- PDF는 인쇄용 페이지 또는 mock 버튼
- 미구현 기능을 완료된 것처럼 표시하지 않음
- 내보내기 파일에 기간과 기준 정의 포함
- 개인정보와 정확 좌표가 보고서에 포함되는지 정책 확인

---

## 7. 공통 디자인 방향

전체 인상:

- 공공 관제 시스템
- 신뢰도 높음
- 정보 밀도가 높지만 정돈됨
- 응급이 즉시 보임
- 장시간 사용해도 피로가 적음
- 장식보다 상태와 데이터가 우선
- 키보드 사용에 적합
- 소비자용 반려동물 앱처럼 보이지 않음

### 참고 미학

- Linear: 상태 큐, 선택 상태, 키보드 워크플로
- IBM Carbon: 데이터 테이블, 필터, 고밀도 정보 구조
- KRDS: 공공 접근성, 명확한 문구, 일관된 상태 표현

특정 서비스의 화면을 복제하지 말고 원칙만 참고한다.

### 금지 스타일

- 카드가 과도하게 떠 있는 대시보드
- 유리 질감
- 네온
- 과도한 그라데이션
- 장식용 캐릭터 남용
- 큰 사진 중심 소비자 앱 구성
- 응급색 대면적 남용
- 낮은 대비의 작은 회색 텍스트
- 그림자만으로 패널 구분
- 상태 의미가 없는 다색 사용
- 아이콘만 있는 불명확한 핵심 행동
- AI가 자동 결정하는 것처럼 보이는 문구

---

## 8. 디자인 토큰

시민 제보자 서비스와 동일한 공용 토큰을 사용한다.

기존 토큰이 있다면 아래 값을 새로 중복 선언하지 말고 기존 패키지에서 import한다.

```css
:root {
  /* Background */
  --color-background: #F8F9F8;
  --color-surface: #FFFFFF;
  --color-surface-subtle: #F2F4F2;
  --color-surface-muted: #E9EDEA;

  /* Text */
  --color-text-primary: #10110E;
  --color-text-secondary: #5F6863;
  --color-text-tertiary: #8C9590;
  --color-text-disabled: #AEB5B1;
  --color-text-inverse: #FFFFFF;

  /* Border */
  --color-border-default: #D8DDDA;
  --color-border-strong: #B8C0BC;
  --color-divider: #DDE2DF;

  /* Primary */
  --color-primary-50: #EEF1FC;
  --color-primary-100: #DDE4FA;
  --color-primary-500: #526ED8;
  --color-primary-600: #425BBE;
  --color-primary-700: #35499D;

  /* Triage: emergency */
  --triage-emergency-text: #B01E1E;
  --triage-emergency-bg: #FDEBEB;
  --triage-emergency-border: #E89B9B;
  --triage-emergency-solid: #D32F2F;

  /* Triage: dispatch */
  --triage-dispatch-text: #9A5A10;
  --triage-dispatch-bg: #FFF3D3;
  --triage-dispatch-border: #F2D58A;

  /* Triage: negative */
  --triage-negative-text: #59615D;
  --triage-negative-bg: #EEF0EF;
  --triage-negative-border: #D3D8D5;

  /* Triage: analyzing */
  --triage-analyzing-text: #35499D;
  --triage-analyzing-bg: #EEF1FC;
  --triage-analyzing-border: #B9C6F0;

  /* Processing status */
  --status-pending-text: #9A5A10;
  --status-pending-bg: #FFF3D3;
  --status-pending-border: #F2D58A;

  --status-success-text: #167A42;
  --status-success-bg: #E8F7EE;
  --status-success-border: #A7DCB9;

  --status-transfer-text: #743A99;
  --status-transfer-bg: #F2E8F8;
  --status-transfer-border: #D4B5E6;

  --status-danger-text: #B83232;
  --status-danger-bg: #FDECEC;
  --status-danger-border: #EAB2B2;

  --status-neutral-text: #59615D;
  --status-neutral-bg: #EEF0EF;
  --status-neutral-border: #D3D8D5;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;

  /* Radius */
  --radius-small: 8px;
  --radius-medium: 12px;
  --radius-large: 16px;
  --radius-xlarge: 20px;
  --radius-pill: 999px;
}
```

### 운영자 콘솔에서 solid 응급색 허용 범위

- EmergencyCounter
- EmergencyToast 테두리 또는 핵심 배지
- 지도 응급 마커
- 큐 응급 액센트 바

그 외 넓은 배경과 일반 카드에 solid 응급색을 사용하지 않는다.

### 콘솔 고유 레이아웃 규칙

- 큐 행 높이: 48px
- 상세 패널 내부 여백: 16px
- 패널 사이 간격: 0px, 구분선 사용
- 카드 라운드: 12~16px
- 데이터 리스트와 테이블: 불필요한 라운드 없음
- 응급 좌측 액센트: 4px
- 선택 좌측 액센트: 2px
- 그림자: 토스트, 팝오버, 다이얼로그에만
- 점선 테두리 금지


---

## 9. 타이포그래피

시민 제보자 서비스와 같은 글꼴 체계를 사용한다.

```css
font-family:
  Pretendard,
  SUIT,
  "Noto Sans KR",
  "Apple SD Gothic Neo",
  system-ui,
  sans-serif;
```

### 공용 타입 스케일

```text
display:      24px / 32px / 700
title-page:   20px / 28px / 700
title-card:   15px / 22px / 600
body:         14px / 22px / 400
body-strong:  14px / 22px / 600
label:        13px / 18px / 600
caption:      12px / 18px / 400
button:       14px / 20px / 600
mono-id:      13px / 18px / 500
```

### 운영자 콘솔 추가 규칙

- 큐 행 본문은 13~14px 허용
- 중요한 정보에 12px 미만 금지
- 사건번호, 날짜, 시간, 좌표, 통계 수치에 `tabular-nums`
- 통계 핵심 숫자는 display 사용 가능
- 상태 배지는 공용 label 규칙 사용
- 응급을 글자 크기만으로 과장하지 않고 위치·아이콘·색상으로 함께 강조
- 장시간 스캔을 위해 과도한 굵기와 대문자 사용 금지

---

## 10. 필수 공통·전용 컴포넌트

### 공용 컴포넌트 재사용

다음은 시민 서비스와 동일 구현을 import한다.

- Button
- TriageBadge
- StatusBadge
- ProcessTimeline
- InlineNotice
- Dialog
- Toast
- IconButton
- EmptyState
- LoadingState

공용 컴포넌트가 없다면 공용 패키지 또는 공용 디렉터리에 먼저 구현한 뒤 두 서비스가 함께 사용하게 한다.

### GlobalBar

```ts
interface GlobalBarProps {
  organizationName?: string;
  emergencyCount: number;
  oldestEmergencyMinutes?: number;
  lastUpdatedAt?: string;
  isRefreshing?: boolean;
  onEmergencyClick: () => void;
  onRefresh: () => void;
}
```

핵심 규격:

- 높이 56px
- 화면 상단 고정 가능
- 응급 카운터 항상 노출
- 갱신 상태
- 계정 메뉴
- 모바일에서는 핵심 요소만 유지

### EmergencyCounter

```ts
interface EmergencyCounterProps {
  count: number;
  oldestWaitingMinutes?: number;
  onActivate: () => void;
}
```

- 0건 neutral
- 1건 이상 emergency solid
- 클릭·Enter·Space로 응급 필터 적용
- `aria-live="assertive"`
- 숫자와 텍스트를 함께 표시

### FilterSidebar

```ts
interface QueueFilters {
  triage: TriageType[];
  statuses: ProcessingStatus[];
  regions: string[];
  assigneeIds: string[];
  assignedToMe: boolean;
  dateFrom?: string;
  dateTo?: string;
  query: string;
}
```

- Desktop 240px
- 다중 체크박스
- 필터 칩
- 초기화
- 적용 건수
- 좁은 화면 드로어
- 지도·큐 상태 공유

### AgencyQueueRow

```ts
interface AgencyQueueItem {
  reportId: string;
  submittedAt: string;
  triage: TriageType;
  status: ProcessingStatus;
  thumbnailUrl?: string;
  aiSummary: string;
  address: string;
  assignee?: OperatorSummary;
  isEmergencyAutoSubmitted?: boolean;
  updatedAt: string;
}
```

- 높이 48px
- 선택 가능
- 키보드 탐색
- 응급 상단 고정
- 상대·절대 시간
- 로딩 중 레이아웃 흔들림 최소화

### DetailPanel

```ts
interface DetailPanelProps {
  reportId: string | null;
  isOpen: boolean;
  onClose: () => void;
}
```

- Desktop 400px
- 좁은 화면 전체 전환
- 로딩·오류·빈 상태
- 하단 ActionBar 고정
- 닫기 후 큐 포커스 복원

### AITriageCard

```ts
interface AITriageAssessment {
  originalTriage: TriageType;
  currentTriage: TriageType;
  summary: string;
  confidence?: number;
  analyzedAt?: string;
  overturnedAt?: string;
  overturnedBy?: OperatorSummary;
  overturnReason?: TriageOverrideReason;
}
```

- 원 판정 보존
- 현재 판정
- 근거
- 신뢰도는 참고값
- 번복 버튼
- 사람 최종 결정 문구

### MatchCandidateCard

```ts
type MatchDecision = "link" | "merge" | "unrelated";

interface MatchCandidate {
  candidateId: string;
  candidateType: "report" | "missing_report";
  photoUrl?: string;
  distanceMeters?: number;
  timeDifferenceMinutes?: number;
  evidence: MatchEvidence[];
  score?: number;
}
```

- 좌우 사진 비교
- 유사 근거
- 참고 점수
- 연결·병합·무관
- 병합 미리보기
- 결과 로그 기록

### ActionBar

```ts
interface ActionDefinition {
  id: string;
  label: string;
  targetStatus?: ProcessingStatus;
  shortcut?: string;
  requiresConfirmation?: boolean;
}
```

상태 머신에서 활성 액션을 파생한다.

버튼 배열을 화면마다 수동 하드코딩하지 않는다.

### AuditLog

```ts
type AuditAction =
  | "report_created"
  | "assigned"
  | "status_changed"
  | "triage_overridden"
  | "report_linked"
  | "report_merged"
  | "match_rejected"
  | "closed"
  | "exported";

interface AuditLogEntry {
  id: string;
  reportId: string;
  action: AuditAction;
  actor: OperatorSummary | SystemActor;
  occurredAt: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
}
```

- 누가
- 언제
- 무엇을
- 왜
- 이전 값
- 이후 값

원 기록은 삭제하지 않고 변경 이력을 누적한다.

### EmergencyToast

- 자동 소멸 없음
- 사진·위치·시간
- 사건 열기
- 수동 닫기
- 중복 방지
- 키보드 접근
- 포커스를 강제로 가져오지 않음

### StatCard

```ts
interface StatCardProps {
  label: string;
  value: string | number;
  definition: string;
  delta?: string;
  loading?: boolean;
}
```

수치 아래에 정의를 항상 표시한다.

### TrendChart

- 접근 가능한 제목
- 범례
- tooltip
- 데이터 표
- 빈 상태
- 로딩 상태
- 색상 외 마커 구분

### ShortcutOverlay

- `?` 키로 열기
- 단축키 목록
- 현재 화면에서 사용 가능한 키 표시
- Esc 닫기
- 포커스 트랩
- 닫은 후 이전 포커스 복원

---

## 11. 데이터 모델

실제 백엔드 타입이 있으면 기존 계약을 우선한다.

타입이 없다면 다음 구조를 임시 기준으로 사용하되 adapter를 통해 교체 가능하게 만든다.

```ts
type TriageType =
  | "emergency"
  | "dispatch"
  | "negative"
  | "analyzing"
  | "unavailable";

type TriageOverrideReason =
  | "false_positive"
  | "condition_changed"
  | "insufficient_information"
  | "other";

interface OperatorSummary {
  id: string;
  displayName: string;
  organizationName?: string;
  avatarUrl?: string;
}

interface SystemActor {
  type: "system";
  displayName: string;
}

interface ReportPhoto {
  id: string;
  thumbnailUrl: string;
  originalUrl?: string;
  alt?: string;
}

interface ExactLocation {
  latitude: number;
  longitude: number;
  address: string;
}

interface ReporterContext {
  observedAt?: string;
  description?: string;
  situationTags: string[];
}

interface TriageDecision {
  originalType: TriageType;
  currentType: TriageType;
  summary: string;
  confidence?: number;
  analyzedAt?: string;
  overriddenAt?: string;
  overriddenBy?: OperatorSummary;
  overrideReason?: TriageOverrideReason;
  overrideNote?: string;
}

interface ProcessEvent {
  id: string;
  status: ProcessingStatus;
  occurredAt: string;
  actor?: OperatorSummary | SystemActor;
}

interface OperatorReport {
  reportId: string;
  submittedAt: string;
  updatedAt: string;
  photos: ReportPhoto[];
  location: ExactLocation;
  reporterContext: ReporterContext;
  triage: TriageDecision;
  status: ProcessingStatus;
  assignee?: OperatorSummary;
  timeline: ProcessEvent[];
  isEmergencyAutoSubmitted: boolean;
  linkedReportIds: string[];
  mergedIntoReportId?: string;
  auditLog: AuditLogEntry[];
}
```

### 상태와 트리아지 분리

트리아지는 AI 또는 운영자의 긴급도·대응 필요도 판단이다.

처리 상태는 행정·구조 업무의 진행 단계다.

두 값을 하나의 enum 또는 하나의 Badge variant에 섞지 않는다.

예:

```text
트리아지: 응급
처리 상태: 확인 중
```

두 상태가 동시에 존재할 수 있어야 한다.

---

## 12. 라우팅 제안

현재 라우터가 있다면 기존 구조를 따른다.

라우팅이 없다면 다음 구조를 사용할 수 있다.

```text
/operator/login
/operator/queue
/operator/queue?view=list
/operator/queue?view=map
/operator/reports/:reportId
/operator/statistics
/operator/design-system
```

3패널 Desktop에서는 `/operator/queue?reportId=JJ-4818`처럼 선택 사건을 query로 관리할 수 있다.

좁은 화면에서는 `/operator/reports/:reportId` 전체 화면 상세로 전환할 수 있다.

### 라우팅 규칙

- 로그인 전 보호 라우트 접근 차단
- 로그인 후 원래 요청 경로 복원
- 선택 사건을 URL로 복원 가능
- 필터·검색·뷰 상태를 query로 보존 가능
- 뒤로가기 시 큐 스크롤과 선택 상태 복원
- 사건번호를 URL에 사용할 때 내부 연속 ID 노출 여부 검토
- 시민용 경로와 운영자용 경로 분리

---

## 13. API·서비스 계층

실제 API가 있는지 먼저 확인한다.

### 권장 adapter 구조

```text
services/
  auth-service
  operator-report-service
  queue-service
  assignment-service
  transition-service
  triage-service
  matching-service
  audit-service
  realtime-service
  map-service
  statistics-service
  export-service
  notification-service
```

### 실제 API가 있다면

- 기존 엔드포인트와 타입 사용
- UI 컴포넌트 안에서 직접 fetch하지 않음
- 요청 취소
- 재시도
- 오류 정규화
- 인증 만료 처리
- 중복 제출 방지
- 상태 전환 서버 검증
- 감사 로그와 상태 변경의 원자성 확인

### 실제 API가 없다면

- mock adapter 구현
- 한국어 실제형 더미 데이터 사용
- mock 여부를 개발 문서에 표시
- UI와 service interface 분리
- 실제 행정기관에 전송되는 것처럼 표현하지 않음
- 임의의 운영자 개인정보를 실제 정보처럼 만들지 않음

### 더미 데이터 예시

```text
사건번호: JJ-4818
접수시각: 2026-07-27 14:20:31
위치: 제주특별자치도 서귀포시 ○○공원 동쪽 출입구
특징: 검은 중형견, 붉은 목줄, 왼쪽 뒷다리 부상 의심
트리아지: 응급
처리상태: 확인 중
담당자: 김담당
```

Lorem ipsum과 의미 없는 영문 데이터를 사용하지 않는다.

---

## 14. 실시간 갱신

다음 우선순위로 기존 인프라를 확인한다.

1. SSE
2. WebSocket
3. 주기적 polling
4. mock event stream

### 실시간 이벤트 예시

```ts
type OperatorRealtimeEvent =
  | { type: "report.created"; reportId: string }
  | { type: "report.updated"; reportId: string }
  | { type: "report.emergency"; reportId: string }
  | { type: "report.assigned"; reportId: string }
  | { type: "report.status_changed"; reportId: string }
  | { type: "report.merged"; reportId: string };
```

### 갱신 규칙

- 신규 응급은 assertive
- 신규 일반 제보는 polite
- 현재 선택 사건이 갱신되면 상세 데이터 반영
- 편집 중인 다이얼로그를 갑자기 닫지 않음
- 자동 갱신이 포커스를 이동시키지 않음
- 리스트 전체를 매번 빈 화면으로 교체하지 않음
- 연결 실패 상태와 마지막 성공 갱신 시각 표시
- 수동 새로고침 제공
- 동일 이벤트 중복 처리 방지

---

## 15. 감사 로그와 원자성

모든 중요 변경은 감사 로그를 남긴다.

### 필수 감사 대상

- 담당자 배정
- 처리 상태 변경
- AI 판정 번복
- 중복 연결
- 중복 병합
- 무관 판정
- 실종 신고 연결
- 보호자 알림 확인
- 종결
- 보고서 내보내기

### 원자성 원칙

다음 두 작업이 분리되어 한쪽만 성공하지 않도록 한다.

```text
상태 변경 + 감사 로그 기록
판정 번복 + 감사 로그 기록
병합 확정 + 감사 로그 기록
종결 처리 + 감사 로그 기록
```

백엔드가 트랜잭션을 지원하지 않는다면 실패 복구 전략과 한계를 문서화한다.

### 로그 표시

- 최신순 기본
- 시간 역순
- 담당자
- 행동
- 이전 값
- 이후 값
- 사유
- 관련 사건 링크
- 시스템 자동 이벤트 구분

삭제 버튼을 제공하지 않는다.

---

## 16. 접근성

WCAG 2.1 AA와 KRDS 호환을 목표로 한다.

### 필수 조건

- 일반 텍스트 대비 4.5:1 이상
- 큰 텍스트 대비 3:1 이상
- 클릭·터치 영역 44×44px 권장
- 밀도 높은 큐 내부 컨트롤도 최소 40px
- 키보드만으로 큐 탐색, 상세 열기, 상태 변경 가능
- 모든 아이콘 버튼에 `aria-label`
- 선택 큐 행에 명확한 상태
- 현재 상세와 연결된 행에 `aria-selected`
- 응급 알림 `aria-live="assertive"`
- 신규 일반 제보 `aria-live="polite"`
- 사운드는 시각 알림 보조 수단
- 트리아지 상태는 색상·아이콘·라벨로 구분
- 그레이스케일에서도 구분 가능
- 다이얼로그 포커스 트랩
- Esc 닫기
- 닫은 뒤 이전 포커스 복원
- 자동 갱신이 포커스를 강탈하지 않음
- 차트 데이터 표 제공
- `prefers-reduced-motion` 지원
- 확대 200%에서 핵심 업무 수행 가능

### 고밀도 큐 접근성

행 전체를 클릭 가능하게 만들더라도 내부 버튼과의 이벤트 충돌을 방지한다.

스크린리더가 다음 정보를 논리적인 순서로 읽을 수 있게 한다.

```text
응급
12분 전, 2026년 7월 27일 14시 20분
사건번호 JJ-4818
검은 중형견, 왼쪽 뒷다리 부상 의심
서귀포시 ○○공원
확인 중
담당자 김담당
```

---

## 17. 보안·개인정보

### 인증

- 보호 라우트
- 세션 만료 처리
- 토큰 하드코딩 금지
- 인증 실패 정보 최소화
- 공공 SSO 연결 가능 adapter

### 권한

문서에 세부 권한 체계가 정의되지 않았다.

따라서 다음을 지킨다.

- 기존 API나 코드에 역할이 있으면 그대로 사용
- 역할이 없으면 임의로 관리자·슈퍼관리자 기능을 만들지 않음
- 삭제·대량 수정·사용자 관리 기능 임의 추가 금지
- 권한 없는 정확 좌표 접근 방지 구조 고려

### 개인정보

- 운영자 화면의 정확 좌표를 시민 API 응답에 포함하지 않음
- 사진 원본 URL 접근 통제
- 콘솔 로그에 민감한 좌표와 인증 토큰 출력 금지
- 보고서 내보내기 시 개인정보 포함 여부 확인
- 사용자 입력 출력 시 XSS 방지
- 사건번호를 단순 증가 내부 ID와 분리
- 삭제 기능 대신 보존 정책 준수

---

## 18. 오류·로딩·빈 상태

### 로그인

- 인증 실패
- 세션 만료
- 네트워크 실패
- SSO 미연결

### 큐

- 첫 로딩
- 갱신 중
- 전체 데이터 없음
- 필터 결과 없음
- 연결 끊김
- 일부 행 로드 실패

### 상세

- 사건 없음
- 권한 없음
- 이미지 로드 실패
- 상세 API 실패
- 사건이 다른 사용자에 의해 갱신됨
- 병합된 사건

### 상태 변경

- 허용되지 않는 전환
- 충돌
- 네트워크 실패
- 감사 로그 저장 실패
- 이미 다른 담당자가 처리
- 낙관적 업데이트 롤백

### 통계

- 데이터 없음
- 집계 실패
- 일부 지표 누락
- 내보내기 실패

### 오류 문구 원칙

사용자를 탓하지 않는다.

나쁜 예:

> 잘못 처리했습니다.

좋은 예:

> 상태를 변경하지 못했습니다. 사건이 다른 담당자에 의해 갱신되었는지 확인한 뒤 다시 시도해 주세요.

모든 오류에는 가능한 다음 행동을 제공한다.

- 다시 시도
- 새로고침
- 현재 데이터 다시 불러오기
- 큐로 돌아가기
- 관리자 또는 담당 시스템 문의 안내

---

## 19. 코드 품질 지침

### 반드시 지킬 것

- 현재 프레임워크 유지
- TypeScript 프로젝트면 props와 상태 타입 명시
- `any` 최소화
- 상태 머신을 단일 소스로 관리
- UI는 상태 머신에서 파생
- 공용 컴포넌트 중복 구현 금지
- API와 UI 분리
- mock과 production adapter 분리
- 실시간 이벤트 정규화
- 날짜·시간 유틸리티 통일
- 오류·로딩·빈 상태 구현
- 접근성 속성 포함
- 변경 파일 문서화

### 금지

- 기존 프레임워크 임의 교체
- 불필요한 대형 UI 라이브러리 설치
- 모든 화면을 하나의 파일에 구현
- 상태 전환 버튼 수동 중복 하드코딩
- 색상·간격 하드코딩
- TriageBadge·StatusBadge 별도 복제
- 상태와 트리아지 혼합
- AI 자동 병합
- AI 자동 상태 변경
- 감사 로그 없는 상태 변경
- 원 판정 덮어쓰기
- 사건 영구 삭제
- 실제 API가 없는 기능을 완료된 것처럼 표시
- 응급 토스트 자동 소멸
- 자동 갱신으로 사용자 포커스 강탈

---

## 20. 권장 폴더 구조

현재 구조가 있다면 기존 구조를 우선한다.

새 프로젝트라면 다음과 같이 구성할 수 있다.

```text
src/
  app-or-pages/
    operator/
      login/
      queue/
      reports/
      statistics/
      design-system/

  components/
    shared/
      button/
      triage-badge/
      status-badge/
      process-timeline/
      dialog/
      toast/

    operator/
      global-bar/
      emergency-counter/
      filter-sidebar/
      agency-queue-row/
      queue-list/
      detail-panel/
      ai-triage-card/
      match-candidate-card/
      action-bar/
      audit-log/
      emergency-toast/
      shortcut-overlay/
      stat-card/
      trend-chart/

  domain/
    reports/
      report.types.ts
      report.machine.ts
      report.selectors.ts
      report.validation.ts

  services/
    auth/
    reports/
    realtime/
    audit/
    matching/
    statistics/
    export/
    maps/

  hooks/
    use-queue-navigation.ts
    use-operator-shortcuts.ts
    use-realtime-reports.ts
    use-report-transition.ts

  lib/
    date-time.ts
    accessibility.ts
    storage.ts
    errors.ts

docs/
  operator-flow.md
  operator-design-system.md
  operator-state-machine.md
  operator-mock-api.md
```

---

## 21. 구현 순서

다음 순서로 작업하라.

### 1단계. 코드베이스 분석

확인 항목:

- 프레임워크
- 라우터
- 스타일링 방식
- 시민 제보자 서비스 존재 여부
- 공용 토큰
- 공용 Badge와 Timeline
- 인증 구조
- 상태 관리
- API
- 실시간 통신
- 지도 SDK
- 차트 라이브러리
- 테스트 도구
- 빌드·린트 명령

### 2단계. 충돌과 재사용 계획

다음을 정리한다.

- 업로드 문서와 현재 코드의 일치점
- 충돌 지점
- 재사용할 공용 컴포넌트
- 새로 만들 운영자 전용 컴포넌트
- 실제 API와 mock 구분
- 구현되지 않는 외부 연동

### 3단계. 공용 자산 확인

- 디자인 토큰
- Button
- TriageBadge
- StatusBadge
- ProcessTimeline
- Dialog
- Toast
- 날짜·시간 포맷

없다면 공용 위치에 먼저 구현한다.

### 4단계. 상태 머신과 데이터 타입

- ProcessingStatus
- ALLOWED_TRANSITIONS
- 액션 파생 selector
- 전환 검증
- 감사 로그 타입
- TriageType과 상태 분리

### 5단계. 로그인

- 기관 계정 로그인
- 보호 라우트
- 세션 만료
- auth adapter

### 6단계. 3패널 기본 레이아웃

- GlobalBar
- FilterSidebar
- Queue 영역
- DetailPanel
- 반응형 전환

### 7단계. 제보 큐

- AgencyQueueRow
- 기본 정렬
- 응급 상단 고정
- 필터
- 검색
- 선택 상태
- 로딩·빈 상태

### 8단계. 상세와 상태 변경

- 사진 뷰어
- AITriageCard
- 제보 정보
- ProcessTimeline
- AuditLog
- ActionBar
- 상태 전환
- 롤백

### 9단계. 응급 알림

- EmergencyCounter
- EmergencyToast
- 15분 경과
- 시각·사운드 설정
- 실시간 이벤트

### 10단계. AI 번복과 매칭

- 판정 번복
- 사유 필수
- 원 기록 보존
- MatchCandidateCard
- 연결·병합·무관
- 병합 미리보기

### 11단계. 지도

- 큐 필터 공유
- 정확 좌표
- 마커·클러스터
- 미니 카드
- 리스트 폴백

### 12단계. 종결

- 결과 분류
- 확인 다이얼로그
- 종결 요약
- 시민 페이지 반영
- 기록 보존

### 13단계. 통계·보고

- 지표 카드
- 정의 caption
- 추이 차트
- 접근 가능한 표
- 지역 분포
- CSV·PDF adapter

### 14단계. 키보드 워크플로

- ↑↓
- Enter
- Esc
- E/P/R/A
- /
- ?
- 입력 포커스 중 비활성

### 15단계. 디자인 시스템 페이지

`/operator/design-system` 또는 기존 `/design-system`에 운영자 섹션을 추가한다.

표시 항목:

- GlobalBar
- EmergencyCounter 0건·1건 이상·15분 경과
- AgencyQueueRow 기본·hover·선택·응급·신규
- FilterSidebar
- DetailPanel
- AITriageCard 기본·번복 이력
- TriageBadge
- StatusBadge
- ActionBar 상태별 활성 액션
- EmergencyToast
- AuditLog
- MatchCandidateCard
- StatCard
- 로딩·오류·빈 상태

### 16단계. 문서화

다음 파일을 생성하거나 갱신한다.

```text
docs/operator-flow.md
docs/operator-design-system.md
docs/operator-state-machine.md
docs/operator-mock-api.md
```

---

## 22. 테스트 시나리오

테스트 도구가 있다면 자동 테스트를 작성하고, 없다면 수동 검수 결과를 기록한다.

### 로그인

- 정상 로그인
- 실패
- 세션 만료
- 보호 라우트
- 로그아웃

### 큐

- 응급 최상단 고정
- 기본 정렬
- 필터 적용
- 필터 초기화
- 검색
- 신규 일반 제보
- 신규 응급 제보
- 자동 갱신 시 포커스 유지
- 필터 결과 없음

### 키보드

- ↑↓ 행 이동
- Enter 상세
- Esc 닫기
- `/` 검색
- `?` 도움말
- E/P/R/A 상태별 실행
- 입력 필드 포커스 중 단축키 비활성

### 상세

- 사진 여러 장
- 이미지 실패
- AI 근거
- 사건번호 복사
- 정확 좌표
- 타임라인
- 감사 로그

### AI 번복

- 사유 미선택 저장 방지
- 오탐
- 상태 변화
- 정보 부족
- 기타
- 원 판정 보존
- 로그 기록

### 매칭

- 같은 개체 연결
- 병합 미리보기
- 병합 확정
- 병합 취소
- 무관
- 자동 병합 경로 부재

### 상태 머신

- 접수됨 → 확인 중
- 접수됨 → 부정 종결
- 확인 중 → 기관 전달
- 확인 중 → 출동
- 확인 중 → 부정 종결
- 기관 전달 → 보호
- 기관 전달 → 반환
- 출동 → 보호
- 출동 → 반환
- 보호 → 종결
- 반환 → 종결
- 허용되지 않는 전환 차단

### 동시성

- 다른 담당자가 먼저 변경
- 낙관적 업데이트 실패
- 롤백
- 감사 로그 실패
- 중복 클릭

### 응급

- 응급 카운터 증가
- 자동 소멸하지 않는 토스트
- 토스트 클릭 상세
- 토스트 닫은 뒤 카운터 유지
- 15분 이상 경과
- 사운드 off
- 스크린리더 assertive

### 시민 연동

- 운영자 상태 변경 후 공용 데이터 갱신
- 성공 토스트 문구
- 시민 화면에는 위치 범위
- 운영자 화면에는 정확 좌표

### 통계

- 기간 변경
- 지표 정의
- 데이터 없음
- 차트와 데이터 표
- CSV
- PDF adapter
- 개인정보 포함 여부

### 반응형

- 1440px
- 1280px
- 1024px
- 768px
- 430px 이하

### 접근성

- 마우스 없이 핵심 흐름 수행
- 200% 확대
- 그레이스케일
- 포커스 복원
- 다이얼로그 포커스 트랩
- 자동 갱신 중 포커스 유지

---

## 23. 최종 완료 기준

아래 항목을 모두 검수한다.

- [ ] 운영자 콘솔이 시민 화면과 분리되어 있는가?
- [ ] 로그인 전 보호 라우트 접근이 차단되는가?
- [ ] 응급 건이 카운터·상단 고정·토스트로 항상 인지되는가?
- [ ] 응급 토스트가 자동 소멸하지 않는가?
- [ ] 큐에서 상태 변경까지 3클릭 이내인가?
- [ ] 키보드만으로 큐→상세→상태 변경이 가능한가?
- [ ] 입력 필드 포커스 중 업무 단축키가 비활성화되는가?
- [ ] 기본 정렬이 응급→출동→대기→부정 순인가?
- [ ] 큐와 지도가 동일 필터를 공유하는가?
- [ ] 운영자 지도에는 정확 좌표가 표시되는가?
- [ ] 시민 공개 데이터에는 정확 좌표가 노출되지 않는가?
- [ ] AI 트리아지에 근거와 참고 신뢰도가 표시되는가?
- [ ] AI 판정 번복 시 사유가 필수인가?
- [ ] 원 AI 판정이 삭제되지 않고 보존되는가?
- [ ] AI가 자동 병합하거나 자동 상태 변경하는 경로가 없는가?
- [ ] 병합 전에 대표 사건 미리보기가 제공되는가?
- [ ] 상태 머신에 없는 액션이 노출되지 않는가?
- [ ] 상태 전환이 데이터 계층에서도 검증되는가?
- [ ] 상태 변경·번복·병합·종결이 감사 로그와 함께 기록되는가?
- [ ] 사건 삭제 기능이 존재하지 않는가?
- [ ] 종결 건을 필터로 다시 조회할 수 있는가?
- [ ] 상태 변경 성공 시 시민 화면 반영 사실이 표시되는가?
- [ ] TriageBadge·StatusBadge·ProcessTimeline이 시민 서비스와 같은 구현인가?
- [ ] 자동 갱신이 포커스를 강탈하지 않는가?
- [ ] 트리아지가 색상 없이도 구분되는가?
- [ ] 통계 수치마다 기준 정의가 있는가?
- [ ] 차트에 접근 가능한 데이터 표가 있는가?
- [ ] Desktop 3패널이 1280px 이상에서 안정적으로 동작하는가?
- [ ] 1024px에서 필터 접기와 2패널이 동작하는가?
- [ ] Tablet에서 상세 오버레이가 동작하는가?
- [ ] Mobile에서 응급 확인·상태 변경·사진·위치 열람이 가능한가?
- [ ] 전체 인상이 소비자 앱이 아닌 공공 관제 시스템인가?
- [ ] mock과 실제 연동 기능이 명확히 분리되는가?
- [ ] 빌드·타입 검사·린트가 통과하는가?
- [ ] 변경 파일과 제한 사항이 문서화되는가?

---

## 24. Claude Code 응답 형식

작업을 바로 시작하되 다음 순서로 응답하라.

### A. 코드베이스 분석

다음을 요약한다.

- 프레임워크와 버전
- 라우터
- 스타일링
- 상태 관리
- 공용 디자인 시스템
- 시민 제보자 서비스와 공유 가능한 코드
- 인증
- API
- 실시간 통신
- 지도
- 차트
- 테스트 명령

### B. 요구사항 매핑

업로드 문서의 O1~O7, O2-E, O2-Map, O4-R, O4-M이 현재 코드의 어느 화면과 파일에 대응하는지 정리한다.

### C. 구현 계획

- 재사용 파일
- 생성 파일
- 수정 파일
- 상태 머신
- API·mock 전략
- 실시간 전략
- 접근성 전략
- 테스트 계획

### D. 확인이 필요한 사항

구현을 막는 치명적인 정보가 있을 때만 질문한다.

API 키, 인증 서버, 백엔드 주소가 없으면 임의로 만들지 말고 adapter와 mock으로 진행한다.

### E. 코드 구현

계획에 따라 실제 파일을 생성하고 수정한다.

### F. 검수 실행

가능한 명령을 실행한다.

- build
- typecheck
- lint
- unit test
- integration test

실패하면 원인과 해결 여부를 명확히 보고한다.

### G. 완료 보고

다음을 정리한다.

- 구현한 화면
- 구현한 컴포넌트
- 공용 컴포넌트 재사용 내역
- 상태 머신
- 감사 로그 처리
- 실시간·지도·통계 구현 상태
- mock 처리된 기능
- 실제 연동이 필요한 기능
- 접근성 처리
- 테스트 결과
- 남은 제한 사항

불확실한 부분은 임의로 새로운 기능을 추가하지 말고, 업로드된 운영자 플로우차트와 운영자 디자인 시스템 및 현재 코드베이스를 기준으로 가장 보수적인 방향을 선택하라.
