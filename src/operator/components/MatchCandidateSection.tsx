import { useState } from "react";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { InlineNotice } from "../../components/InlineNotice";
import { formatAbsolute, formatDurationMinutes } from "../../lib/date-time";
import type { MatchCandidate, MatchDecision, OperatorReport } from "../types";
import "./MatchCandidateSection.css";

export interface MatchCandidateSectionProps {
  report: OperatorReport;
  busy: boolean;
  onDecide: (candidateId: string, decision: MatchDecision) => Promise<void>;
  onConfirmGuardianNotice: (candidateId: string) => Promise<void>;
}

const DECISION_LABELS: Record<MatchDecision, string> = {
  link: "같은 개체로 연결됨",
  merge: "중복 병합됨",
  unrelated: "무관 처리됨",
};

/**
 * 중복 제보·실종 신고 매칭 (O4-M).
 * AI는 후보만 제안하며, 연결·병합·무관 확정은 항상 운영자가 한다.
 * 자동 병합·자동 연결 경로는 존재하지 않는다.
 */
export function MatchCandidateSection({
  report,
  busy,
  onDecide,
  onConfirmGuardianNotice,
}: MatchCandidateSectionProps) {
  const [mergeTarget, setMergeTarget] = useState<MatchCandidate | null>(null);
  const [noticeTarget, setNoticeTarget] = useState<MatchCandidate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const candidates = report.matchCandidates.slice(0, 3);
  if (candidates.length === 0) {
    return (
      <section className="match-section" aria-label="중복·실종 매칭 후보">
        <h3 className="match-section__title">중복·실종 매칭 후보</h3>
        <p className="match-section__empty">
          AI가 제안한 유사 제보·실종 신고 후보가 없습니다.
        </p>
      </section>
    );
  }

  const decide = async (candidateId: string, decision: MatchDecision) => {
    setError(null);
    try {
      await onDecide(candidateId, decision);
      setMergeTarget(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "매칭 판단을 저장하지 못했습니다. 다시 시도해 주세요.",
      );
    }
  };

  const confirmNotice = async (candidateId: string) => {
    setError(null);
    try {
      await onConfirmGuardianNotice(candidateId);
      setNoticeTarget(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "보호자 알림 확인을 저장하지 못했습니다.",
      );
    }
  };

  return (
    <section className="match-section" aria-label="중복·실종 매칭 후보">
      <h3 className="match-section__title">중복·실종 매칭 후보</h3>
      <p className="match-section__hint">
        AI 제안 후보입니다. 자동으로 병합·연결되지 않으며 최종 판단은 담당자가
        합니다.
      </p>
      {error && <InlineNotice variant="error">{error}</InlineNotice>}

      <div className="match-section__cards">
        {candidates.map((candidate) => (
          <article key={candidate.candidateId} className="match-card">
            <header className="match-card__head">
              <span
                className={`match-card__type match-card__type--${candidate.candidateType}`}
              >
                {candidate.candidateType === "missing_report" ? "실종 신고" : "중복 제보 후보"}
              </span>
              {candidate.score !== undefined && (
                <span className="match-card__score tabular-nums">
                  참고 유사 점수 {(candidate.score * 100).toFixed(0)}%
                </span>
              )}
            </header>

            <div className="match-card__compare">
              <figure className="match-card__side">
                {report.photos[0] ? (
                  <img src={report.photos[0].thumbnailUrl} alt="" />
                ) : (
                  <span className="match-card__no-photo">사진 없음</span>
                )}
                <figcaption>
                  현재 사건 <span className="tabular-nums">{report.reportId}</span>
                </figcaption>
              </figure>
              <figure className="match-card__side">
                {candidate.photoUrl ? (
                  <img src={candidate.photoUrl} alt={candidate.photoAlt ?? ""} />
                ) : (
                  <span className="match-card__no-photo">사진 없음</span>
                )}
                <figcaption>{candidate.title}</figcaption>
              </figure>
            </div>

            <dl className="match-card__meta">
              <div>
                <dt>{candidate.candidateType === "missing_report" ? "신고 시각" : "접수 시각"}</dt>
                <dd className="tabular-nums">{formatAbsolute(candidate.reportedAt)}</dd>
              </div>
              <div>
                <dt>위치</dt>
                <dd>{candidate.address}</dd>
              </div>
              {candidate.distanceMeters !== undefined && (
                <div>
                  <dt>거리</dt>
                  <dd className="tabular-nums">
                    {candidate.distanceMeters >= 1000
                      ? `${(candidate.distanceMeters / 1000).toFixed(1)}km`
                      : `${candidate.distanceMeters}m`}
                  </dd>
                </div>
              )}
              {candidate.timeDifferenceMinutes !== undefined && (
                <div>
                  <dt>시간 차이</dt>
                  <dd className="tabular-nums">
                    {formatDurationMinutes(candidate.timeDifferenceMinutes)}
                  </dd>
                </div>
              )}
            </dl>

            <ul className="match-card__evidence">
              {candidate.evidence.map((evidence) => (
                <li key={evidence.label}>
                  <strong>{evidence.label}</strong> {evidence.detail}
                </li>
              ))}
            </ul>

            {candidate.decision ? (
              <div className="match-card__decision">
                <span>{DECISION_LABELS[candidate.decision]}</span>
                {candidate.decidedBy && candidate.decidedAt && (
                  <span className="match-card__decision-meta tabular-nums">
                    {candidate.decidedBy.displayName} ·{" "}
                    {formatAbsolute(candidate.decidedAt)}
                  </span>
                )}
                {candidate.decision === "link" &&
                  candidate.candidateType === "missing_report" &&
                  (candidate.guardianNoticeConfirmedAt ? (
                    <span className="match-card__decision-meta tabular-nums">
                      보호자 알림 확인 {formatAbsolute(candidate.guardianNoticeConfirmedAt)}
                    </span>
                  ) : (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => setNoticeTarget(candidate)}
                    >
                      보호자 알림 확인
                    </Button>
                  ))}
              </div>
            ) : (
              <div className="match-card__actions">
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={() => void decide(candidate.candidateId, "link")}
                >
                  같은 개체 — 연결
                </Button>
                {candidate.candidateType === "report" && (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setMergeTarget(candidate)}
                  >
                    중복 — 병합
                  </Button>
                )}
                <Button
                  variant="tertiary"
                  disabled={busy}
                  onClick={() => void decide(candidate.candidateId, "unrelated")}
                >
                  무관
                </Button>
              </div>
            )}
          </article>
        ))}
      </div>

      {/* 병합 미리보기 — 확정 전 반드시 표시 */}
      <Dialog
        open={mergeTarget !== null}
        title="중복 병합 미리보기"
        onClose={() => setMergeTarget(null)}
        disableBackdropClose
        footer={
          <>
            <Button variant="secondary" onClick={() => setMergeTarget(null)}>
              취소
            </Button>
            <Button
              variant="primary"
              loading={busy}
              onClick={() => mergeTarget && void decide(mergeTarget.candidateId, "merge")}
            >
              병합 확정
            </Button>
          </>
        }
      >
        {mergeTarget && (
          <div className="match-section__merge-preview">
            <dl className="match-card__meta">
              <div>
                <dt>대표 사건</dt>
                <dd className="tabular-nums">{report.reportId} (현재 사건)</dd>
              </div>
              <div>
                <dt>병합될 사건</dt>
                <dd className="tabular-nums">{mergeTarget.candidateId}</dd>
              </div>
              <div>
                <dt>유지되는 정보</dt>
                <dd>대표 사건의 사진·위치·타임라인·감사 로그</dd>
              </div>
              <div>
                <dt>시민 상태 링크</dt>
                <dd>
                  병합된 사건의 접수번호 조회 시 대표 사건 기준 상태가 안내됩니다.
                </dd>
              </div>
            </dl>
            <InlineNotice variant="warning">
              병합된 사건의 원 기록과 감사 로그는 삭제되지 않고 보존됩니다. 현재
              시스템에는 병합 취소 기능이 없으므로 확정 전에 두 사건을 충분히
              비교해 주세요.
            </InlineNotice>
          </div>
        )}
      </Dialog>

      {/* 실종 신고 보호자 알림 — 발송 전 별도 확인 단계 */}
      <Dialog
        open={noticeTarget !== null}
        title="보호자 알림 확인"
        onClose={() => setNoticeTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setNoticeTarget(null)}>
              취소
            </Button>
            <Button
              variant="primary"
              loading={busy}
              onClick={() =>
                noticeTarget && void confirmNotice(noticeTarget.candidateId)
              }
            >
              알림 발송 확인
            </Button>
          </>
        }
      >
        {noticeTarget && (
          <div className="match-section__merge-preview">
            <p>
              {noticeTarget.title}의 보호자에게 발견 사실 알림을 발송하는 단계를
              확인합니다.
            </p>
            <InlineNotice variant="warning">
              실제 문자·푸시 발송 시스템은 아직 연동되지 않았습니다. 이 확인은
              mock으로 기록되며, 실제 발송은 별도 연동이 필요합니다.
            </InlineNotice>
          </div>
        )}
      </Dialog>
    </section>
  );
}
