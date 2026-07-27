import type { ProcessingStatus } from "../types/report";
import "./StatusBadge.css";

/**
 * 기관 처리 상태 배지.
 * AI 트리아지 상태(TriageBadge)와 분리해 유지한다.
 */
export type StatusVariant =
  | "pending"
  | "success"
  | "transfer"
  | "danger"
  | "neutral";

export interface StatusBadgeProps {
  variant: StatusVariant;
  label: string;
}

export function StatusBadge({ variant, label }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${variant}`}>
      <span className="status-badge__dot" aria-hidden="true" />
      {label}
    </span>
  );
}

/** ProcessingStatus → 배지 표현 매핑 (모든 화면에서 동일하게 사용) */
export function processingStatusBadge(status: ProcessingStatus): StatusBadgeProps {
  switch (status) {
    case "submitted":
      return { variant: "pending", label: "접수 대기" };
    case "triaged":
      return { variant: "pending", label: "판정 완료" };
    case "reviewing":
      return { variant: "pending", label: "확인 중" };
    case "transferred":
      return { variant: "transfer", label: "기관 전달" };
    case "dispatched":
      return { variant: "transfer", label: "출동 중" };
    case "protected":
      return { variant: "success", label: "보호 중" };
    case "returned":
      return { variant: "success", label: "반환 완료" };
    case "negative_closed":
      /* 시민 공개 화면에는 부정 여부를 노출하지 않고 종결로 표시한다. */
      return { variant: "neutral", label: "종결" };
    case "closed":
      return { variant: "neutral", label: "종결" };
  }
}
