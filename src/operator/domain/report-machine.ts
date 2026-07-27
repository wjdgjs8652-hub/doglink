import type { StatusVariant } from "../../components/StatusBadge";
import type { TriageVariant } from "../../components/TriageBadge";
import type { OperatorStatus, OperatorTriage } from "../types";

/**
 * 처리 상태 머신 단일 소스.
 * ActionBar·단축키·데이터 계층 검증이 모두 이 파일에서 파생된다.
 * (업로드된 운영자 플로우차트 §4 기준 — 임의 전환 추가 금지)
 */

export const ALLOWED_TRANSITIONS: Record<
  OperatorStatus,
  readonly OperatorStatus[]
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

export function canTransition(from: OperatorStatus, to: OperatorStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** 종결 상태(기본 큐 숨김 대상) */
export function isClosedStatus(status: OperatorStatus): boolean {
  return status === "closed" || status === "negative_closed";
}

/** 운영자 화면용 상태 라벨 (시민 화면과 달리 부정 종결을 구분해 표시) */
export const OPERATOR_STATUS_LABELS: Record<OperatorStatus, string> = {
  submitted: "접수됨",
  reviewing: "확인 중",
  transferred: "기관 전달",
  dispatched: "출동",
  protected: "보호",
  returned: "반환",
  negative_closed: "부정 종결",
  closed: "종결",
};

export const OPERATOR_STATUS_BADGE: Record<OperatorStatus, StatusVariant> = {
  submitted: "pending",
  reviewing: "pending",
  transferred: "transfer",
  dispatched: "transfer",
  protected: "success",
  returned: "success",
  negative_closed: "neutral",
  closed: "neutral",
};

export const ALL_OPERATOR_STATUSES: OperatorStatus[] = [
  "submitted",
  "reviewing",
  "transferred",
  "dispatched",
  "protected",
  "returned",
  "negative_closed",
  "closed",
];

/* ------------------------------------------------------------------ */
/* 액션 파생                                                            */
/* ------------------------------------------------------------------ */

export interface ActionDefinition {
  id: string;
  label: string;
  targetStatus: OperatorStatus;
  shortcut?: string;
  requiresConfirmation?: boolean;
  /** 종결 결과 분류 입력이 필요한 액션 */
  requiresClosureOutcome?: boolean;
  /** 시각적으로 우선하는 기본 다음 행동 */
  primary?: boolean;
  /** 위험(기록이 남는 종결) 계열 */
  danger?: boolean;
}

const ACTION_META: Record<
  OperatorStatus,
  Omit<ActionDefinition, "targetStatus"> & { targetStatus?: never }
> = {
  reviewing: { id: "start-review", label: "확인 시작", primary: true },
  transferred: { id: "transfer", label: "기관 전달", shortcut: "E", primary: true },
  dispatched: { id: "dispatch", label: "출동 지시" },
  protected: { id: "protect", label: "보호 처리", shortcut: "P", primary: true },
  returned: { id: "return", label: "반환 처리", shortcut: "R" },
  closed: {
    id: "close",
    label: "종결",
    requiresConfirmation: true,
    requiresClosureOutcome: true,
    primary: true,
  },
  negative_closed: {
    id: "negative-close",
    label: "부정 종결",
    requiresConfirmation: true,
    danger: true,
  },
  submitted: { id: "submit", label: "접수" }, // 도달 불가 (초기 상태)
};

/** 현재 상태에서 가능한 액션만 상태 머신에서 파생한다. 수동 하드코딩 금지. */
export function getActionsForStatus(status: OperatorStatus): ActionDefinition[] {
  return ALLOWED_TRANSITIONS[status].map((target) => {
    const meta = ACTION_META[target];
    return { ...meta, targetStatus: target };
  });
}

/** 단축키 → 현재 상태에서의 액션 (허용되지 않으면 null) */
export function getActionByShortcut(
  status: OperatorStatus,
  shortcut: string,
): ActionDefinition | null {
  return (
    getActionsForStatus(status).find(
      (a) => a.shortcut?.toUpperCase() === shortcut.toUpperCase(),
    ) ?? null
  );
}

/* ------------------------------------------------------------------ */
/* 트리아지 표현·정렬                                                   */
/* ------------------------------------------------------------------ */

export const TRIAGE_LABELS: Record<OperatorTriage, string> = {
  emergency: "응급 의심",
  dispatch: "확인 필요",
  negative: "대응 낮음",
  analyzing: "AI 분석 중",
  unavailable: "판정 불가",
};

export function triageToBadgeVariant(triage: OperatorTriage): TriageVariant {
  return triage;
}

/** 큐 기본 정렬 우선순위: 응급 → 출동(확인 필요) → 분석중/불가 → 부정 */
export const TRIAGE_SORT_PRIORITY: Record<OperatorTriage, number> = {
  emergency: 0,
  dispatch: 1,
  analyzing: 2,
  unavailable: 2,
  negative: 3,
};

/** 미처리 응급 = 현재 트리아지가 응급이고 아직 전달·출동 전 단계 */
export function isUnhandledEmergency(
  triage: OperatorTriage,
  status: OperatorStatus,
): boolean {
  return triage === "emergency" && (status === "submitted" || status === "reviewing");
}
