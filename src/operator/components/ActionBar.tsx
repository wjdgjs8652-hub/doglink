import {
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { InlineNotice } from "../../components/InlineNotice";
import { TriageBadge } from "../../components/TriageBadge";
import {
  getActionsForStatus,
  OPERATOR_STATUS_LABELS,
} from "../domain/report-machine";
import type { ActionDefinition } from "../domain/report-machine";
import type { ClosureOutcome, OperatorReport } from "../types";
import "./ActionBar.css";

export interface ActionBarSubmitInput {
  action: ActionDefinition;
  closureOutcome?: ClosureOutcome;
  closureNote?: string;
  reason?: string;
}

export interface ActionBarProps {
  report: OperatorReport;
  busy: boolean;
  onSubmit: (input: ActionBarSubmitInput) => Promise<void>;
}

export interface ActionBarHandle {
  /** 단축키 실행 — 버튼과 같은 확인·검증 경로를 사용한다. */
  trigger: (action: ActionDefinition) => void;
}

const CLOSURE_OPTIONS: Array<{ value: ClosureOutcome; label: string }> = [
  { value: "shelter_transfer", label: "보호소 인계" },
  { value: "guardian_return", label: "보호자 반환" },
  { value: "natural_return", label: "자연 복귀" },
  { value: "negative_or_mistake", label: "부정 또는 오인" },
  { value: "other", label: "기타" },
];

/**
 * 상태 변경 ActionBar (상세 하단 고정).
 * 현재 상태에서 가능한 다음 행동만 상태 머신에서 파생해 표시한다.
 */
export const ActionBar = forwardRef<ActionBarHandle, ActionBarProps>(
  function ActionBar({ report, busy, onSubmit }, ref) {
    const [confirmAction, setConfirmAction] = useState<ActionDefinition | null>(null);
    const [closureOutcome, setClosureOutcome] = useState<ClosureOutcome | null>(null);
    const [closureNote, setClosureNote] = useState("");
    const [negativeReason, setNegativeReason] = useState("");
    const [error, setError] = useState<string | null>(null);

    const actions = getActionsForStatus(report.status);

    const run = async (input: ActionBarSubmitInput) => {
      setError(null);
      try {
        await onSubmit(input);
        setConfirmAction(null);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      }
    };

    const handleAction = (action: ActionDefinition) => {
      if (busy) return;
      if (action.requiresConfirmation) {
        setClosureOutcome(null);
        setClosureNote("");
        setNegativeReason("");
        setError(null);
        setConfirmAction(action);
      } else {
        void run({ action });
      }
    };

    useImperativeHandle(ref, () => ({ trigger: handleAction }));

    const submitConfirm = () => {
      if (!confirmAction) return;
      if (confirmAction.requiresClosureOutcome && !closureOutcome) {
        setError("종결 결과 분류를 선택해 주세요.");
        return;
      }
      void run({
        action: confirmAction,
        closureOutcome: closureOutcome ?? undefined,
        closureNote: closureNote.trim() || undefined,
        reason: negativeReason.trim() || undefined,
      });
    };

    if (actions.length === 0) {
      return (
        <div className="action-bar action-bar--done">
          <span>
            {OPERATOR_STATUS_LABELS[report.status]} 상태입니다. 더 이상 변경할 수
            있는 상태가 없습니다.
          </span>
        </div>
      );
    }

    return (
      <div className="action-bar" role="group" aria-label="상태 변경">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={
              action.danger ? "destructive" : action.primary ? "primary" : "secondary"
            }
            disabled={busy}
            loading={busy && !confirmAction}
            onClick={() => handleAction(action)}
          >
            {action.label}
            {action.shortcut && (
              <kbd className="action-bar__kbd" aria-hidden="true">
                {action.shortcut}
              </kbd>
            )}
          </Button>
        ))}

        {/* 부정 종결 확인 */}
        <Dialog
          open={confirmAction?.targetStatus === "negative_closed"}
          title="부정 종결 확인"
          onClose={() => setConfirmAction(null)}
          disableBackdropClose
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmAction(null)}>
                취소
              </Button>
              <Button variant="destructive" onClick={submitConfirm} loading={busy}>
                부정 종결
              </Button>
            </>
          }
        >
          <div className="action-bar__confirm">
            <dl className="action-bar__facts">
              <div>
                <dt>사건번호</dt>
                <dd className="tabular-nums">{report.reportId}</dd>
              </div>
              <div>
                <dt>현재 트리아지</dt>
                <dd>
                  <TriageBadge variant={report.triage.currentType} />
                </dd>
              </div>
              <div>
                <dt>시민 상태 페이지 표시</dt>
                <dd>종결 (부정 여부는 노출되지 않음)</dd>
              </div>
            </dl>
            <label className="action-bar__field">
              부정 종결 사유 (선택)
              <textarea
                rows={2}
                value={negativeReason}
                onChange={(e) => setNegativeReason(e.target.value)}
                placeholder="예: 보호자 동반 반려견으로 확인"
              />
            </label>
            <InlineNotice variant="warning">
              부정 종결은 기록이 남는 종결 상태입니다. 현재 시스템에는 되돌림
              기능이 없어 종결 후 상태를 변경할 수 없습니다. 사건 기록과 감사
              로그는 보존되며 필터로 다시 조회할 수 있습니다.
            </InlineNotice>
            {error && <InlineNotice variant="error">{error}</InlineNotice>}
          </div>
        </Dialog>

        {/* 종결 확인 + 결과 분류 */}
        <Dialog
          open={confirmAction?.targetStatus === "closed"}
          title="사건 종결"
          onClose={() => setConfirmAction(null)}
          disableBackdropClose
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmAction(null)}>
                취소
              </Button>
              <Button variant="primary" onClick={submitConfirm} loading={busy}>
                종결 처리
              </Button>
            </>
          }
        >
          <div className="action-bar__confirm">
            <p>
              사건 <strong className="tabular-nums">{report.reportId}</strong>
              을(를) 종결합니다. 종결 결과 분류를 선택해 주세요.
            </p>
            <fieldset className="action-bar__fieldset">
              <legend className="visually-hidden">종결 결과 분류</legend>
              {CLOSURE_OPTIONS.map((option) => (
                <label key={option.value} className="action-bar__radio">
                  <input
                    type="radio"
                    name="closure-outcome"
                    checked={closureOutcome === option.value}
                    onChange={() => setClosureOutcome(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>
            <label className="action-bar__field">
              종결 메모 (선택)
              <textarea
                rows={2}
                value={closureNote}
                onChange={(e) => setClosureNote(e.target.value)}
                placeholder="예: 서귀포 보호소 인계 완료"
              />
            </label>
            <InlineNotice variant="info">
              종결 사건은 삭제되지 않고 보존되며, 기본 큐에서 숨겨지지만 필터로
              다시 조회할 수 있습니다. 종결 즉시 시민 상태 페이지에 반영됩니다.
            </InlineNotice>
            {error && <InlineNotice variant="error">{error}</InlineNotice>}
          </div>
        </Dialog>

        {error && !confirmAction && (
          <span className="action-bar__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);
