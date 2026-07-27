import { useState } from "react";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { InlineNotice } from "../../components/InlineNotice";
import { TriageBadge } from "../../components/TriageBadge";
import { formatAbsolute } from "../../lib/date-time";
import { TRIAGE_LABELS } from "../domain/report-machine";
import type { OperatorTriage, TriageDecision, TriageOverrideReason } from "../types";
import "./AITriageCard.css";

export interface AITriageCardProps {
  triage: TriageDecision;
  isHumanConfirmed: boolean;
  onOverride: (input: {
    newType: OperatorTriage;
    reason: TriageOverrideReason;
    note?: string;
  }) => Promise<void>;
}

const OVERRIDE_TARGETS: OperatorTriage[] = ["emergency", "dispatch", "negative"];

const REASON_OPTIONS: Array<{ value: TriageOverrideReason; label: string }> = [
  { value: "false_positive", label: "오탐" },
  { value: "condition_changed", label: "상태 변화" },
  { value: "insufficient_information", label: "정보 부족" },
  { value: "other", label: "기타" },
];

/**
 * AI 트리아지 카드.
 * AI는 제안만 하고 확정하지 않는다. 원 판정은 번복 후에도 보존·표시된다.
 */
export function AITriageCard({ triage, isHumanConfirmed, onOverride }: AITriageCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newType, setNewType] = useState<OperatorTriage | null>(null);
  const [reason, setReason] = useState<TriageOverrideReason | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isOverridden = !!triage.overriddenAt;
  const canOverride =
    triage.currentType !== "analyzing" && triage.currentType !== "unavailable";

  const openDialog = () => {
    setNewType(null);
    setReason(null);
    setNote("");
    setError(null);
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!newType) {
      setError("새 트리아지 값을 선택해 주세요.");
      return;
    }
    if (!reason) {
      setError("번복 사유를 선택해 주세요.");
      return;
    }
    if (reason === "other" && !note.trim()) {
      setError("기타 사유를 선택한 경우 간단한 설명을 입력해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onOverride({ newType, reason, note: note.trim() || undefined });
      setDialogOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "판정을 번복하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="ai-triage-card" aria-label="AI 트리아지 제안">
      <div className="ai-triage-card__head">
        <h3 className="ai-triage-card__title">AI 트리아지 제안</h3>
        {canOverride && (
          <Button variant="secondary" onClick={openDialog}>
            판정 번복
          </Button>
        )}
      </div>

      <div className="ai-triage-card__badges">
        <TriageBadge variant={triage.currentType} size="large" />
        {isOverridden && (
          <span className="ai-triage-card__original">
            이전 판정:{" "}
            <s>{TRIAGE_LABELS[triage.originalType]}</s>
          </span>
        )}
      </div>

      <p className="ai-triage-card__summary">{triage.summary}</p>

      <p className="ai-triage-card__caption">
        {triage.confidence !== undefined && (
          <span className="tabular-nums">
            참고 신뢰도 {(triage.confidence * 100).toFixed(0)}% ·{" "}
          </span>
        )}
        {triage.analyzedAt && (
          <span className="tabular-nums">분석 {formatAbsolute(triage.analyzedAt)} · </span>
        )}
        {isHumanConfirmed ? "담당자 확인됨" : "담당자 확인 전"} · AI 제안은 참고
        정보이며 최종 결정은 담당자가 합니다.
      </p>

      {isOverridden && triage.overriddenBy && (
        <p className="ai-triage-card__override-history">
          {formatAbsolute(triage.overriddenAt!)} {triage.overriddenBy.displayName}{" "}
          번복 — 사유:{" "}
          {REASON_OPTIONS.find((r) => r.value === triage.overrideReason)?.label}
          {triage.overrideNote ? ` (${triage.overrideNote})` : ""}
        </p>
      )}

      <Dialog
        open={dialogOpen}
        title="AI 판정 번복"
        onClose={() => setDialogOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button variant="primary" onClick={submit} loading={saving}>
              번복 저장
            </Button>
          </>
        }
      >
        <div className="ai-triage-card__form">
          <fieldset className="ai-triage-card__fieldset">
            <legend>새 트리아지</legend>
            <div className="ai-triage-card__options">
              {OVERRIDE_TARGETS.filter((t) => t !== triage.currentType).map((t) => (
                <label key={t} className="ai-triage-card__option">
                  <input
                    type="radio"
                    name="override-triage"
                    checked={newType === t}
                    onChange={() => setNewType(t)}
                  />
                  <TriageBadge variant={t} />
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="ai-triage-card__fieldset">
            <legend>번복 사유 (필수)</legend>
            <div className="ai-triage-card__options">
              {REASON_OPTIONS.map((option) => (
                <label key={option.value} className="ai-triage-card__option">
                  <input
                    type="radio"
                    name="override-reason"
                    checked={reason === option.value}
                    onChange={() => setReason(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          {reason === "other" && (
            <label className="ai-triage-card__note">
              기타 사유 설명
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="번복 사유를 간단히 입력해 주세요."
              />
            </label>
          )}

          {error && <InlineNotice variant="error">{error}</InlineNotice>}

          <InlineNotice variant="info">
            원 AI 판정은 삭제되지 않고 이전 판정으로 보존됩니다. 번복 내용은 감사
            로그에 기록되며 AI 개선 데이터로 활용될 수 있습니다.
          </InlineNotice>
        </div>
      </Dialog>
    </section>
  );
}
