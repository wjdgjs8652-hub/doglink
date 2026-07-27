import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import type { PublicReport } from "../types/report";
import { reportService } from "../services/report-service";
import { copyText, getStatusUrl, shareStatusLink } from "../services/share-service";
import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/Button";
import { ProcessTimeline } from "../components/ProcessTimeline";
import { InlineNotice } from "../components/InlineNotice";
import "./CompletePage.css";

/** S6. 접수 완료 */
export function CompletePage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const emergencyReported = Boolean(
    (location.state as { emergencyReported?: boolean } | null)?.emergencyReported,
  );

  const [report, setReport] = useState<PublicReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [linkFeedback, setLinkFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    reportService
      .getPublicReport(id)
      .then((r) => {
        if (!cancelled) setReport(r);
      })
      .catch(() => {
        if (!cancelled)
          setError("접수 내용을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const copyReportId = async () => {
    if (!id) return;
    if (await copyText(id)) {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const copyStatusLink = async () => {
    if (!id) return;
    setLinkFeedback(
      (await copyText(getStatusUrl(id)))
        ? "상태 확인 링크를 복사했어요."
        : "복사에 실패했어요. 주소창의 링크를 직접 저장해 주세요.",
    );
  };

  const share = async () => {
    if (!id) return;
    const outcome = await shareStatusLink(id);
    if (outcome === "copied") setLinkFeedback("공유 대신 링크를 복사했어요.");
    else if (outcome === "failed")
      setLinkFeedback("공유하지 못했어요. 링크 복사를 이용해 주세요.");
  };

  return (
    <div className="screen">
      <AppHeader title="DOG-LINK" />
      <main className="screen__body complete">
        <div className="complete__hero">
          <span className="complete__check" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path
                d="M5 14.5l6 6L23 8"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h2 className="complete__title">
            {emergencyReported ? "담당 기관에 전달되었습니다." : "제보가 접수되었습니다."}
          </h2>
          <p className="complete__thanks">
            소중한 제보가 동물을 찾고 보호하는 데 도움이 됩니다.
          </p>
        </div>

        {emergencyReported && (
          <InlineNotice variant="info">
            응급 신고가 함께 전달되었어요. 내용을 잘못 입력했다면 상태 확인
            페이지의 접수번호를 확인한 뒤, 같은 위치에서 정정 제보를 남겨
            주세요.
          </InlineNotice>
        )}

        <section className="complete__section card" aria-label="접수번호">
          <span className="complete__label">접수번호</span>
          <button
            type="button"
            className="complete__report-id"
            onClick={() => void copyReportId()}
            aria-label={`접수번호 ${id ?? ""}, 탭하면 복사됩니다`}
          >
            <span className="complete__report-id-value tabular-nums">{id}</span>
            <span className="complete__copy-hint" aria-live="polite">
              {copiedId ? "복사했어요" : "탭하여 복사"}
            </span>
          </button>
        </section>

        <section className="complete__section card" aria-label="처리 타임라인">
          <span className="complete__label">처리 진행</span>
          {report && <ProcessTimeline steps={report.timeline} />}
          {!report && !error && (
            <p className="complete__loading">진행 상태를 불러오고 있어요…</p>
          )}
          {error && <InlineNotice variant="error">{error}</InlineNotice>}
        </section>

        <section className="complete__section" aria-label="상태 확인">
          <div className="complete__share-buttons">
            <Button variant="secondary" onClick={() => void copyStatusLink()}>
              상태 확인 링크 복사
            </Button>
            <Button variant="secondary" onClick={() => void share()}>
              링크 공유
            </Button>
          </div>
          {linkFeedback && (
            <p className="complete__share-feedback" aria-live="polite">
              {linkFeedback}
            </p>
          )}
          <Link to={`/report/status/${id}`} className="complete__status-link">
            지금 상태 확인하기
          </Link>
        </section>
      </main>
    </div>
  );
}
