/* ═══════════════════════════════════════════════════════════════════
   DOG-LINK 운영자 콘솔 — 처리 상태 머신 (단일 소스)
   근거: doglink_운영자_플로우차트.md §2 + 운영자 프롬프트 §4
   UI(ActionBar·단축키)는 전부 여기서 파생한다. 버튼 수동 하드코딩 금지.
   트리아지(TriageType)와 처리 상태(ProcessingStatus)는 별개 차원 — 혼합 금지.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ProcessingStatus */
  const ALLOWED_TRANSITIONS = {
    submitted:       ["reviewing", "negative_closed"],
    reviewing:       ["transferred", "dispatched", "negative_closed"],
    transferred:     ["protected", "returned"],
    dispatched:      ["protected", "returned"],
    protected:       ["closed"],
    returned:        ["closed"],
    negative_closed: [],
    closed:          [],
  };
  const TERMINAL = ["negative_closed", "closed"];

  /* ActionDefinition — 전환 액션의 라벨·단축키·확인 필요 여부.
     단축키는 프롬프트 명세의 E(기관 전달)/P(보호)/R(반환)만 부여한다. */
  const ACTION_META = {
    reviewing:       { label: "확인 시작" },
    transferred:     { label: "기관 전달", shortcut: "E" },
    dispatched:      { label: "출동 지시" },
    protected:       { label: "보호 처리", shortcut: "P" },
    returned:        { label: "반환 처리", shortcut: "R" },
    closed:          { label: "종결",      requiresConfirmation: true },
    negative_closed: { label: "부정 종결", requiresConfirmation: true, destructive: true },
  };

  /* 현재 상태에서 가능한 액션 목록을 파생 — 상태 머신에 없는 전환은 UI에 나타나지 않는다 */
  function actionsFor(status) {
    return (ALLOWED_TRANSITIONS[status] || []).map(target => ({
      id: `to_${target}`,
      targetStatus: target,
      label: ACTION_META[target].label,
      shortcut: ACTION_META[target].shortcut,
      requiresConfirmation: !!ACTION_META[target].requiresConfirmation,
      destructive: !!ACTION_META[target].destructive,
    }));
  }

  /* 데이터 계층 검증 — UI 비활성화와 별개로 서비스에서 반드시 호출 */
  function canTransition(from, to) {
    return (ALLOWED_TRANSITIONS[from] || []).includes(to);
  }

  const isTerminal = s => TERMINAL.includes(s);

  /* 종결 결과 분류 (O6) */
  const CLOSURE_RESULTS = {
    shelter:  "보호소 인계",
    owner:    "보호자 반환",
    natural:  "자연 복귀",
    negative: "부정 또는 오인",
    other:    "기타",
  };

  /* AI 판정 번복 사유 (O4-R) — 사유 없는 번복 저장 금지 */
  const OVERRIDE_REASONS = {
    false_positive:           "오탐",
    condition_changed:        "상태 변화",
    insufficient_information: "정보 부족",
    other:                    "기타",
  };

  /* ── 시민 상태 확인 페이지(S7) 연동 데이터 계약 ──
     시민 프로토타입(mvp-prototype.html)의 처리 4단계
     ["제보됨","확인 중","기관 전달","보호/반환"]로 투영한다.
     8단계 원본은 운영자 측에 보존되고, 시민에게는 요약 단계만 전달된다. */
  const CITIZEN_STAGE = {
    submitted: 0, reviewing: 1, transferred: 2, dispatched: 2,
    protected: 3, returned: 3, closed: 3,
    negative_closed: 3, // 시민 화면에는 "종결(대응 불필요)" 문구로 표기
  };
  const CITIZEN_STAGE_LABEL = ["제보됨", "확인 중", "기관 전달", "보호/반환"];
  function citizenStageOf(status) {
    return {
      stage: CITIZEN_STAGE[status] ?? 0,
      label: status === "negative_closed" ? "종결 (대응 불필요)" : CITIZEN_STAGE_LABEL[CITIZEN_STAGE[status] ?? 0],
    };
  }

  window.OP = window.OP || {};
  Object.assign(window.OP, {
    ALLOWED_TRANSITIONS, ACTION_META, actionsFor, canTransition, isTerminal, TERMINAL,
    CLOSURE_RESULTS, OVERRIDE_REASONS, citizenStageOf, CITIZEN_STAGE_LABEL,
  });
})();
