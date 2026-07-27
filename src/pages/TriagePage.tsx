import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReportDraft } from "../state/ReportDraftContext";
import type { TriageAssessment } from "../types/report";
import { analyzeWithTimeout } from "../services/triage-service";
import { reportService } from "../services/report-service";
import { StepFrame } from "./StepFrame";
import { TriageBadge } from "../components/TriageBadge";
import { TriageResultCard } from "../components/TriageResultCard";
import { EmergencyConfirmSheet } from "../components/EmergencyConfirmSheet";
import { BottomCTA } from "../components/BottomCTA";
import { InlineNotice } from "../components/InlineNotice";
import "./TriagePage.css";

type PageState =
  | { phase: "analyzing" }
  | { phase: "result"; triage: TriageAssessment; emergencyOpen: boolean };

/**
 * S5. AI 상태 판정 + S5-E. 응급 자동신고 확인
 * 어떤 판정·오류에서도 제보 데이터가 사라지지 않도록:
 * - 분석 실패·10초 초과 시 unavailable 판정으로 즉시 일반 접수
 * - 응급 중단 시에도 일반 접수로 전환
 */
export function TriagePage() {
  const navigate = useNavigate();
  const { draft, setDescription, clearDraft } = useReportDraft();

  const [state, setState] = useState<PageState>({ phase: "analyzing" });
  const [slow, setSlow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cancelNotice, setCancelNotice] = useState(false);
  const [disputed, setDisputed] = useState(false);

  const startedRef = useRef(false);
  const submittingRef = useRef(false);

  const hasPhoto = draft.photos.some((p) => p.status === "uploaded");
  useEffect(() => {
    if (!hasPhoto) navigate("/report/photo", { replace: true });
  }, [hasPhoto, navigate]);

  /** 접수 실행. 실패해도 draft는 보존되어 재시도할 수 있다. */
  const submit = async (
    triage: TriageAssessment,
    options?: { emergencyReported?: boolean },
  ) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { reportId } = await reportService.submit(draft, triage, options);
      clearDraft(); // 접수 성공 후에만 임시 데이터 정리
      navigate(`/report/complete/${reportId}`, {
        replace: true,
        state: { emergencyReported: options?.emergencyReported ?? false },
      });
    } catch {
      setSubmitError(
        "접수 과정에서 문제가 생겼어요. 입력한 내용은 그대로 남아 있으니 다시 시도해 주세요.",
      );
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // 분석 시작 (1회)
  useEffect(() => {
    if (!hasPhoto || startedRef.current) return;
    startedRef.current = true;

    const slowTimer = setTimeout(() => setSlow(true), 3000);

    void (async () => {
      const triage = await analyzeWithTimeout(draft);
      clearTimeout(slowTimer);
      if (triage.type === "unavailable") {
        // 판정 없이 일반 접수 진행 (사용자를 기다리게 하지 않음)
        void submit(triage);
        setState({ phase: "result", triage, emergencyOpen: false });
      } else {
        setState({
          phase: "result",
          triage,
          emergencyOpen: triage.type === "emergency",
        });
      }
    })();

    return () => clearTimeout(slowTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPhoto]);

  if (!hasPhoto) return null;

  const photoUrl = draft.photos.find((p) => p.status === "uploaded")?.localUrl;

  const handleDispute = (note: string) => {
    setDisputed(true);
    // 담당자 확인용 참고 의견으로 제보 내용에 덧붙인다
    const suffix = `\n[제보자 의견] AI 판정에 대한 의견: ${note}`;
    setDescription(draft.description + suffix);
  };

  return (
    <StepFrame step="triage" backTo="/report/details">
      {state.phase === "analyzing" && (
        <div className="triage-analyzing" aria-busy="true">
          {photoUrl && (
            <img
              src={photoUrl}
              alt="제보한 동물 사진"
              className="triage-analyzing__photo"
            />
          )}
          <TriageBadge variant="analyzing" size="large" />
          <h2 className="triage-analyzing__title">AI가 상태를 확인하고 있어요</h2>
          <div className="triage-analyzing__bar" aria-hidden="true">
            <span className="triage-analyzing__bar-fill" />
          </div>
          <p className="triage-analyzing__hint" aria-live="polite">
            {slow
              ? "조금만 기다려주세요. 사진과 제보 내용을 확인하고 있어요."
              : "잠시만 기다려 주세요."}
          </p>
        </div>
      )}

      {state.phase === "result" && (
        <div className="triage-result">
          {cancelNotice && (
            <InlineNotice variant="success" live="polite">
              응급 신고는 중단했어요. 제보 내용은 일반 접수로 전달됩니다.
            </InlineNotice>
          )}

          {state.triage.type === "negative" && (
            <InlineNotice variant="info">
              즉각적인 대응이 필요하지 않은 것으로 보입니다. 제보 기록은
              남겨두며 담당자가 최종 확인합니다.
            </InlineNotice>
          )}

          <TriageResultCard
            photoUrl={photoUrl}
            triage={state.triage}
            onDispute={handleDispute}
            disputed={disputed}
          />

          {submitError && <InlineNotice variant="error">{submitError}</InlineNotice>}

          {state.triage.type !== "unavailable" && !state.emergencyOpen && (
            <BottomCTA
              label="접수 완료하기"
              loading={submitting}
              onClick={() => void submit(state.triage)}
            />
          )}

          {state.triage.type === "unavailable" && submitting && (
            <p className="triage-result__submitting" aria-live="polite">
              제보를 접수하고 있어요…
            </p>
          )}

          {state.emergencyOpen && (
            <EmergencyConfirmSheet
              draft={draft}
              triage={state.triage}
              submitting={submitting}
              onConfirm={() =>
                void submit(state.triage, { emergencyReported: true })
              }
              onCancel={() => {
                setState({ ...state, emergencyOpen: false });
                setCancelNotice(true);
              }}
            />
          )}
        </div>
      )}
    </StepFrame>
  );
}
