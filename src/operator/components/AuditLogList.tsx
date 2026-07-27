import { useState } from "react";
import { formatAbsoluteSeconds } from "../../lib/date-time";
import type { AuditAction, AuditLogEntry } from "../types";
import { isSystemActor } from "../types";
import "./AuditLogList.css";

export interface AuditLogListProps {
  entries: AuditLogEntry[];
}

const ACTION_LABELS: Record<AuditAction, string> = {
  report_created: "제보 접수",
  assigned: "담당자 배정",
  status_changed: "상태 변경",
  triage_overridden: "AI 판정 번복",
  report_linked: "같은 개체 연결",
  report_merged: "중복 병합",
  match_rejected: "무관 판정",
  guardian_notice_confirmed: "보호자 알림 확인",
  closed: "종결",
  exported: "보고서 내보내기",
};

/**
 * 감사 로그. 원 기록은 삭제되지 않고 누적 표시된다. (삭제 버튼 없음)
 */
export function AuditLogList({ entries }: AuditLogListProps) {
  const [order, setOrder] = useState<"desc" | "asc">("desc");

  const sorted = [...entries].sort((a, b) =>
    order === "desc"
      ? b.occurredAt.localeCompare(a.occurredAt)
      : a.occurredAt.localeCompare(b.occurredAt),
  );

  return (
    <section className="audit-log" aria-label="감사 로그">
      <div className="audit-log__head">
        <h3 className="audit-log__title">감사 로그</h3>
        <button
          type="button"
          className="audit-log__order"
          onClick={() => setOrder((o) => (o === "desc" ? "asc" : "desc"))}
        >
          {order === "desc" ? "최신순" : "시간순"}
        </button>
      </div>
      {sorted.length === 0 ? (
        <p className="audit-log__empty">기록된 감사 로그가 없습니다.</p>
      ) : (
        <ol className="audit-log__list">
          {sorted.map((entry) => (
            <li key={entry.id} className="audit-log__item">
              <div className="audit-log__row">
                <span className="audit-log__action">
                  {ACTION_LABELS[entry.action]}
                </span>
                <time className="audit-log__time tabular-nums">
                  {formatAbsoluteSeconds(entry.occurredAt)}
                </time>
              </div>
              <div className="audit-log__row">
                <span
                  className={
                    isSystemActor(entry.actor)
                      ? "audit-log__actor audit-log__actor--system"
                      : "audit-log__actor"
                  }
                >
                  {isSystemActor(entry.actor)
                    ? `${entry.actor.displayName} (자동)`
                    : entry.actor.displayName}
                </span>
              </div>
              {(entry.before || entry.after) && (
                <p className="audit-log__change">
                  {entry.before && <s>{entry.before}</s>}
                  {entry.before && entry.after && (
                    <span aria-hidden="true"> → </span>
                  )}
                  {entry.after && <span>{entry.after}</span>}
                </p>
              )}
              {entry.reason && (
                <p className="audit-log__reason">사유: {entry.reason}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
