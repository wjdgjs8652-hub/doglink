import { useState } from "react";
import type { TriageAssessment } from "../types/report";
import { TriageBadge, type TriageVariant } from "./TriageBadge";
import { InlineNotice } from "./InlineNotice";
import "./TriageResultCard.css";

export interface TriageResultCardProps {
  photoUrl?: string;
  triage: TriageAssessment;
  /** "판정이 다른 것 같아요" 의견 전달 */
  onDispute(note: string): void;
  disputed?: boolean;
}

const DISPUTE_OPTIONS = [
  { id: "more-urgent", label: "실제 상황이 더 급해 보여요" },
  { id: "less-urgent", label: "생각보다 급하지 않아요" },
  { id: "wrong-detail", label: "판정 내용이 실제와 달라요" },
] as const;

export function TriageResultCard({
  photoUrl,
  triage,
  onDispute,
  disputed = false,
}: TriageResultCardProps) {
  const [open, setOpen] = useState(false);

  if (triage.type === "unavailable") {
    return (
      <div className="triage-card card">
        {photoUrl && (
          <img src={photoUrl} alt="제보한 동물 사진" className="triage-card__photo" />
        )}
        <InlineNotice variant="warning">
          AI 분석이 지연되어 우선 제보를 접수했어요. 담당자가 사진과 내용을
          확인합니다.
        </InlineNotice>
      </div>
    );
  }

  const variant: TriageVariant = triage.type;

  return (
    <div className="triage-card card">
      {photoUrl && (
        <img src={photoUrl} alt="제보한 동물 사진" className="triage-card__photo" />
      )}
      <div className="triage-card__badge">
        <TriageBadge variant={variant} size="large" />
      </div>
      <p className="triage-card__summary">{triage.summary}</p>
      <p className="triage-card__disclaimer">
        AI 판단이며 담당자가 최종 확인합니다.
      </p>

      {disputed ? (
        <InlineNotice variant="success" live="polite">
          의견을 접수했어요. 담당자가 확인할 때 함께 참고합니다.
        </InlineNotice>
      ) : (
        <div className="triage-card__dispute">
          <button
            type="button"
            className="triage-card__dispute-toggle"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            판정이 다른 것 같아요
          </button>
          {open && (
            <div className="triage-card__dispute-options" role="group" aria-label="판정 의견 선택">
              {DISPUTE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="triage-card__dispute-option"
                  onClick={() => onDispute(opt.label)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
