# DOG-LINK 운영자 콘솔 — 처리 상태 머신

단일 소스: `operator/js/state-machine.js` (`OP.ALLOWED_TRANSITIONS`).
UI(ActionBar 버튼·단축키)는 전부 여기서 파생되며 수동 하드코딩하지 않는다.
근거: `doglink_운영자_플로우차트.md` §2.

```
접수됨(submitted) ── 확인 시작 ──▶ 확인 중(reviewing)
접수됨            ── 부정 종결 ──▶ 부정 종결(negative_closed)
확인 중           ── 기관 전달 ──▶ 기관 전달(transferred)
확인 중           ── 출동 지시 ──▶ 출동(dispatched)
확인 중           ── 부정 종결 ──▶ 부정 종결
기관 전달/출동     ── 보호 처리 ──▶ 보호(protected)
기관 전달/출동     ── 반환 처리 ──▶ 반환(returned)
보호/반환         ── 종결(확인 1회) ──▶ 종결(closed)
부정 종결 · 종결   : 종단 상태 — 추가 전환 없음, 삭제 없음
```

## 규칙 구현

| 규칙 | 구현 |
|---|---|
| 상태 머신에 없는 전환 버튼 미노출 | `actionsFor(status)`가 허용 전환만 반환 → ActionBar 렌더 |
| 데이터 계층 재검증 | `services.requestTransition`이 `canTransition` 확인 후에만 반영 |
| 종결·부정 종결 확인 다이얼로그 | `ACTION_META.requiresConfirmation` → `openCloseDialog`/`openNegativeCloseDialog` |
| 미배정 사건 변경 시 자동 배정+고지 | `requestTransition` 내 자동 배정 + 감사 로그 + 토스트 고지 |
| 상태 변경 + 감사 로그 원자성 | 동기 mock 저장소의 단일 함수 내 처리. 실제 백엔드는 서버 트랜잭션 필요(operator-mock-api.md) |
| 종결 건 기본 숨김·필터 조회 | `queueList`의 `DEFAULT_HIDDEN`, 상태 필터 지정 시 노출 |
| 사건 삭제 없음 | 삭제 API·UI 자체가 존재하지 않음 |
| 단축키 동일 경로 | E/P/R이 `requestAction`을 그대로 호출 |

## 트리아지와의 분리

- `TriageType`(emergency/dispatch/negative/analyzing/unavailable)은 긴급도 판단, `ProcessingStatus`는 행정 진행 단계.
- 하나의 enum·Badge로 섞지 않는다: TriageBadge(`.triage[data-state]`) vs StatusBadge(`.badge[data-variant]`).
- "트리아지: 응급 + 처리 상태: 확인 중"이 동시에 존재한다 (mock 데이터 JJ-4818 참조).

## 시민 4단계 투영 (데이터 계약)

시민 프로토타입(`mvp-prototype.html`)의 처리 4단계와의 매핑 — `citizenStageOf()`:

| 운영자 8단계 | 시민 표시 |
|---|---|
| submitted | 제보됨 (0) |
| reviewing | 확인 중 (1) |
| transferred, dispatched | 기관 전달 (2) |
| protected, returned, closed | 보호/반환 (3) |
| negative_closed | "종결 (대응 불필요)" |

8단계 원본은 운영자 측에 보존되고, 시민에게는 요약 단계만 전달된다.
