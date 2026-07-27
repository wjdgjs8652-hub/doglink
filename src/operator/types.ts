import type { ProcessingStatus } from "../types/report";

/**
 * 운영자 콘솔 도메인 타입.
 * 실제 백엔드 계약이 확정되면 adapter 계층에서 이 타입으로 정규화한다.
 */

/** 운영자가 다루는 처리 상태. 시민 표시 전용 상태(triaged)는 제외한다. */
export type OperatorStatus = Exclude<ProcessingStatus, "triaged">;

/** 트리아지(긴급도 판단). 처리 상태와 절대 혼합하지 않는다. */
export type OperatorTriage =
  | "emergency"
  | "dispatch"
  | "negative"
  | "analyzing"
  | "unavailable";

export type TriageOverrideReason =
  | "false_positive"
  | "condition_changed"
  | "insufficient_information"
  | "other";

export interface OperatorSummary {
  id: string;
  displayName: string;
  organizationName?: string;
}

export interface SystemActor {
  type: "system";
  displayName: string;
}

export type AuditActor = OperatorSummary | SystemActor;

export function isSystemActor(actor: AuditActor): actor is SystemActor {
  return "type" in actor && actor.type === "system";
}

export interface OperatorReportPhoto {
  id: string;
  thumbnailUrl: string;
  originalUrl?: string;
  alt?: string;
}

export interface ExactLocation {
  latitude: number;
  longitude: number;
  address: string;
}

export interface ReporterContext {
  observedAt?: string;
  description?: string;
  situationTags: string[];
}

export interface TriageDecision {
  originalType: OperatorTriage;
  currentType: OperatorTriage;
  /** 판정 근거(비단정 표현) */
  summary: string;
  /** 참고용 신뢰도 0~1 */
  confidence?: number;
  analyzedAt?: string;
  overriddenAt?: string;
  overriddenBy?: OperatorSummary;
  overrideReason?: TriageOverrideReason;
  overrideNote?: string;
}

export interface ProcessEvent {
  id: string;
  status: OperatorStatus;
  occurredAt: string;
  actor?: AuditActor;
}

export type AuditAction =
  | "report_created"
  | "assigned"
  | "status_changed"
  | "triage_overridden"
  | "report_linked"
  | "report_merged"
  | "match_rejected"
  | "guardian_notice_confirmed"
  | "closed"
  | "exported";

export interface AuditLogEntry {
  id: string;
  reportId: string;
  action: AuditAction;
  actor: AuditActor;
  occurredAt: string;
  before?: string;
  after?: string;
  reason?: string;
}

export type ClosureOutcome =
  | "shelter_transfer"
  | "guardian_return"
  | "natural_return"
  | "negative_or_mistake"
  | "other";

export interface ClosureRecord {
  outcome: ClosureOutcome;
  note?: string;
  closedAt: string;
  closedBy: OperatorSummary;
}

export type MatchDecision = "link" | "merge" | "unrelated";

export interface MatchEvidence {
  label: string;
  detail: string;
}

export interface MatchCandidate {
  candidateId: string;
  candidateType: "report" | "missing_report";
  title: string;
  photoUrl?: string;
  photoAlt?: string;
  reportedAt: string;
  address: string;
  distanceMeters?: number;
  timeDifferenceMinutes?: number;
  /** 참고 유사 점수 0~1 */
  score?: number;
  evidence: MatchEvidence[];
  /** 운영자 판단 결과 (undefined = 미판단) */
  decision?: MatchDecision;
  decidedAt?: string;
  decidedBy?: OperatorSummary;
  /** 실종 신고 매칭 시 보호자 알림 확인 여부 */
  guardianNoticeConfirmedAt?: string;
}

export interface OperatorReport {
  reportId: string;
  submittedAt: string;
  updatedAt: string;
  photos: OperatorReportPhoto[];
  /** 운영자 전용 정확 좌표. 시민 공개 데이터에 포함 금지. */
  location: ExactLocation;
  reporterContext: ReporterContext;
  triage: TriageDecision;
  status: OperatorStatus;
  assignee?: OperatorSummary;
  timeline: ProcessEvent[];
  isEmergencyAutoSubmitted: boolean;
  matchCandidates: MatchCandidate[];
  linkedReportIds: string[];
  mergedIntoReportId?: string;
  mergedReportIds: string[];
  closure?: ClosureRecord;
  auditLog: AuditLogEntry[];
}

export interface QueueFilters {
  triage: OperatorTriage[];
  statuses: OperatorStatus[];
  regions: string[];
  assigneeIds: string[];
  assignedToMe: boolean;
  /** 종결·부정 종결 포함 여부 (기본 숨김, 필터로 재조회 가능) */
  includeClosed: boolean;
  dateFrom?: string;
  dateTo?: string;
  query: string;
}

export const EMPTY_FILTERS: QueueFilters = {
  triage: [],
  statuses: [],
  regions: [],
  assigneeIds: [],
  assignedToMe: false,
  includeClosed: false,
  query: "",
};

export type QueueView = "list" | "map";

/** 실시간(mock) 이벤트 */
export type OperatorRealtimeEvent =
  | { type: "report.created"; reportId: string }
  | { type: "report.updated"; reportId: string }
  | { type: "report.emergency"; reportId: string }
  | { type: "report.assigned"; reportId: string }
  | { type: "report.status_changed"; reportId: string }
  | { type: "report.merged"; reportId: string };
