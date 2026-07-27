import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { PublicReport } from "../types/report";
import { ReportNotFoundError, reportService } from "../services/report-service";
import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/Button";
import { TriageBadge } from "../components/TriageBadge";
import { StatusBadge, processingStatusBadge } from "../components/StatusBadge";
import { ProcessTimeline } from "../components/ProcessTimeline";
import { InlineNotice } from "../components/InlineNotice";
import "./StatusPage.css";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** S7. 제보 상태 확인 (저장한 링크·접수번호 재방문) */
export function StatusPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<PublicReport | null>(null);
  const [errorKind, setErrorKind] = useState<"not-found" | "network" | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorKind(null);
    try {
      setReport(await reportService.getPublicReport(id));
    } catch (err) {
      setReport(null);
      setErrorKind(err instanceof ReportNotFoundError ? "not-found" : "network");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const triageVariant =
    report && report.triage.type !== "unavailable" ? report.triage.type : null;

  return (
    <div className="screen">
      <AppHeader title="제보 상태 확인" showBack onBack={() => navigate("/")} />
      <main className="screen__body status">
        {loading && (
          <p className="status__loading" aria-live="polite">
            상태를 불러오고 있어요…
          </p>
        )}

        {errorKind && !loading && (
          <div className="status__error">
            <InlineNotice variant="error">
              {errorKind === "not-found"
                ? "해당 접수번호의 제보를 찾지 못했어요. 번호가 맞는지, 링크가 만료되지 않았는지 확인해 주세요."
                : "상태를 불러오지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요."}
            </InlineNotice>
            <div className="status__error-actions">
              <Button variant="primary" onClick={() => void load()}>
                다시 시도
              </Button>
              <Button variant="secondary" onClick={() => navigate("/report/status")}>
                접수번호 재입력
              </Button>
              <Button variant="tertiary" onClick={() => navigate("/")}>
                홈으로 이동
              </Button>
            </div>
          </div>
        )}

        {report && !loading && (
          <>
            <section className="status__head card" aria-label="접수 정보">
              <div className="status__id-row">
                <span className="status__report-id tabular-nums">
                  {report.reportId}
                </span>
                <div className="status__badges">
                  {triageVariant && <TriageBadge variant={triageVariant} />}
                  <StatusBadge {...processingStatusBadge(report.processingStatus)} />
                </div>
              </div>
              <dl className="status__meta">
                <div className="status__meta-row">
                  <dt>접수 일시</dt>
                  <dd>{formatDateTime(report.submittedAt)}</dd>
                </div>
                <div className="status__meta-row">
                  <dt>마지막 갱신</dt>
                  <dd>{formatDateTime(report.updatedAt)}</dd>
                </div>
              </dl>
            </section>

            <section className="status__section card" aria-label="처리 타임라인">
              <h2 className="status__section-title">처리 진행</h2>
              <ProcessTimeline
                steps={report.timeline}
                showTimestamps
                preciseTime={report.emergencyReported}
              />
            </section>

            <section className="status__section card" aria-label="발견 위치 범위">
              <h2 className="status__section-title">발견 위치</h2>
              <div className="status__area" role="img" aria-label={`발견 위치 범위: ${report.publicLocationLabel}`}>
                <span className="status__area-circle" aria-hidden="true" />
                <span className="status__area-label">
                  {report.publicLocationLabel}
                  {report.publicLocationRadiusMeters && (
                    <span className="status__area-radius tabular-nums">
                      {" "}
                      (약 {report.publicLocationRadiusMeters}m 범위)
                    </span>
                  )}
                </span>
              </div>
              <p className="status__area-note">
                동물 보호와 제보자 개인정보 보호를 위해 발견 위치는 주변 범위로
                표시됩니다.
              </p>
            </section>

            <InlineNotice variant="info">
              상태가 바뀌면 이 페이지에서 확인할 수 있어요.
            </InlineNotice>
          </>
        )}
      </main>
    </div>
  );
}

/** 접수번호 직접 입력 화면 (S1 보조 링크·오류 폴백에서 진입) */
export function StatusLookupPage() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");

  const go = () => {
    const id = value.trim().toUpperCase();
    if (id) navigate(`/report/status/${encodeURIComponent(id)}`);
  };

  return (
    <div className="screen">
      <AppHeader title="제보 상태 확인" showBack onBack={() => navigate("/")} />
      <main className="screen__body">
        <h2 className="screen__question">접수번호를 입력해 주세요</h2>
        <p className="screen__hint">
          접수 완료 화면에서 확인한 번호예요. 예: JJ-4818
        </p>
        <div className="status-lookup__row">
          <label className="visually-hidden" htmlFor="report-id-input">
            접수번호
          </label>
          <input
            id="report-id-input"
            type="text"
            className="status-lookup__input tabular-nums"
            placeholder="JJ-0000"
            value={value}
            autoCapitalize="characters"
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") go();
            }}
          />
          <Button variant="primary" onClick={go} disabled={!value.trim()}>
            조회
          </Button>
        </div>
      </main>
    </div>
  );
}
