import { useEffect, useRef, useState } from "react";
import type { ReporterDraft, TriageAssessment } from "../types/report";
import { situationLabels } from "./SituationChips";
import { Button } from "./Button";
import "./EmergencyConfirmSheet.css";

export interface EmergencyConfirmSheetProps {
  draft: ReporterDraft;
  triage: TriageAssessment;
  /** 응급 신고 실행 (자동 또는 수동) */
  onConfirm(): void;
  /** 응급 신고만 중단하고 일반 접수로 전환 */
  onCancel(): void;
  submitting?: boolean;
}

const COUNTDOWN_SECONDS = 10;
const EXTEND_SECONDS = 10;

/**
 * S5-E 응급 자동신고 확인 시트.
 * - 카운트다운 종료 시 자동 신고 실행
 * - 탭이 백그라운드에 있는 동안에는 카운트다운을 일시정지해
 *   사용자가 보지 못한 채 실행되는 것을 방지
 * - 중단 버튼은 실행 버튼과 동등한 크기·대비 유지
 */
export function EmergencyConfirmSheet({
  draft,
  triage,
  onConfirm,
  onCancel,
  submitting = false,
}: EmergencyConfirmSheetProps) {
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);
  const [total, setTotal] = useState(COUNTDOWN_SECONDS);
  const [paused, setPaused] = useState(false);
  const firedRef = useRef(false);
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  // 백그라운드 이동 시 일시정지
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (paused || submitting || firedRef.current) return;
    if (remaining <= 0) {
      firedRef.current = true;
      onConfirmRef.current();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, paused, submitting]);

  const extend = () => {
    setRemaining((r) => r + EXTEND_SECONDS);
    setTotal((t) => t + EXTEND_SECONDS);
  };

  const confirmNow = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onConfirm();
  };

  const cancel = () => {
    firedRef.current = true; // 자동 실행 차단
    onCancel();
  };

  const progress = Math.max(0, Math.min(1, remaining / total));
  const situations = situationLabels(draft.situations);
  const foundAt = new Date().toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="emergency-sheet"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="emergency-title"
      aria-describedby="emergency-desc"
    >
      <div className="emergency-sheet__panel">
        {/* 응급 solid 색상은 이 화면에서만 대면적 사용 */}
        <div className="emergency-sheet__banner">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path d="M11 2.4L20.4 19H1.6L11 2.4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M11 8.6v4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="11" cy="15.8" r="1.1" fill="currentColor" />
          </svg>
          <h2 id="emergency-title">응급 상황으로 판단됩니다</h2>
        </div>

        <div className="emergency-sheet__body">
          <p id="emergency-desc" className="emergency-sheet__lead">
            아래 내용으로 담당 기관에 응급 신고를 전달할 준비를 하고 있어요.
            응급이 아니라면 언제든 중단할 수 있습니다.
          </p>

          <div className="emergency-sheet__summary card">
            {draft.photos[0]?.localUrl && (
              <img
                src={draft.photos[0].localUrl}
                alt="제보한 동물 사진"
                className="emergency-sheet__photo"
              />
            )}
            <dl className="emergency-sheet__facts">
              <div className="emergency-sheet__fact">
                <dt>발견 위치</dt>
                <dd>{draft.location?.address ?? "위치 정보 없음"}</dd>
              </div>
              <div className="emergency-sheet__fact">
                <dt>발견 시간</dt>
                <dd>{foundAt}</dd>
              </div>
              {situations.length > 0 && (
                <div className="emergency-sheet__fact">
                  <dt>목격 상황</dt>
                  <dd>{situations.join(", ")}</dd>
                </div>
              )}
              <div className="emergency-sheet__fact">
                <dt>AI 판정 근거</dt>
                <dd>{triage.summary}</dd>
              </div>
            </dl>
          </div>

          <div className="emergency-sheet__countdown">
            <p aria-live="assertive" className="emergency-sheet__countdown-text">
              {paused ? (
                "화면으로 돌아오면 카운트다운이 이어집니다."
              ) : (
                <>
                  <strong className="tabular-nums">{remaining}초</strong> 후에
                  자동으로 신고가 실행됩니다.
                </>
              )}
            </p>
            <div
              className="emergency-sheet__progress"
              role="progressbar"
              aria-valuenow={remaining}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-label="자동 신고까지 남은 시간"
            >
              <span
                className="emergency-sheet__progress-bar"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <button
              type="button"
              className="emergency-sheet__extend"
              onClick={extend}
            >
              시간이 더 필요해요 (+{EXTEND_SECONDS}초)
            </button>
          </div>
        </div>

        <div className="emergency-sheet__actions">
          <Button
            variant="emergency-solid"
            size="large"
            fullWidth
            onClick={confirmNow}
            loading={submitting}
          >
            지금 바로 신고
          </Button>
          <Button
            variant="secondary"
            size="large"
            fullWidth
            onClick={cancel}
            disabled={submitting}
          >
            응급이 아니에요
          </Button>
          <p className="emergency-sheet__note">
            ‘응급이 아니에요’를 누르면 응급 신고만 중단되고, 제보 내용은 일반
            접수로 전달됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
