import type { ProcessStep } from "../types/report";
import "./ProcessTimeline.css";

export interface ProcessTimelineProps {
  steps: ProcessStep[];
  /** 상태 확인 화면에서는 타임스탬프 표시 */
  showTimestamps?: boolean;
  /** 응급 신고 건은 초 단위까지 표시 */
  preciseTime?: boolean;
}

function formatTimestamp(iso: string, precise: boolean): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = `${d.getMonth() + 1}월 ${d.getDate()}일`;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return precise ? `${date} ${hh}:${mm}:${ss}` : `${date} ${hh}:${mm}`;
}

export function ProcessTimeline({
  steps,
  showTimestamps = false,
  preciseTime = false,
}: ProcessTimelineProps) {
  return (
    <ol className="process-timeline">
      {steps.map((step) => (
        <li
          key={step.id}
          className={`process-timeline__item process-timeline__item--${step.status}`}
          aria-current={step.status === "current" ? "step" : undefined}
        >
          <span className="process-timeline__marker" aria-hidden="true">
            {step.status === "completed" && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M1.5 5.5L4 8l4.5-6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <div className="process-timeline__content">
            <span className="process-timeline__label">
              {step.label}
              {step.status === "current" && (
                <span className="process-timeline__now">현재 단계</span>
              )}
            </span>
            {showTimestamps && step.timestamp && (
              <span className="process-timeline__time tabular-nums">
                {formatTimestamp(step.timestamp, preciseTime)}
              </span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
