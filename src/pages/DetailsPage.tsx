import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useReportDraft } from "../state/ReportDraftContext";
import { StepFrame } from "./StepFrame";
import { SituationChips } from "../components/SituationChips";
import { BottomCTA } from "../components/BottomCTA";
import { Button } from "../components/Button";
import "./DetailsPage.css";

/** S4. 목격 내용 선택 입력 (완전한 선택 사항) */
export function DetailsPage() {
  const navigate = useNavigate();
  const { draft, setSituations, setDescription } = useReportDraft();

  const hasPhoto = draft.photos.some((p) => p.status === "uploaded");
  useEffect(() => {
    if (!hasPhoto) navigate("/report/photo", { replace: true });
  }, [hasPhoto, navigate]);

  if (!hasPhoto) return null;

  const goTriage = () => navigate("/report/triage");

  return (
    <StepFrame step="details" backTo="/report/location">
      <h2 className="screen__question">상황을 알려주시겠어요?</h2>
      <p className="screen__hint">
        선택 사항이에요. 입력하지 않아도 제보할 수 있어요.
      </p>

      <section className="details__section" aria-label="목격 상황 선택">
        <SituationChips selected={draft.situations} onChange={setSituations} />
      </section>

      <section className="details__section">
        <label className="details__label" htmlFor="description">
          자세한 내용 (선택)
        </label>
        <textarea
          id="description"
          className="details__textarea"
          placeholder="발견 당시 상황이나 동물의 특징을 적어주세요."
          rows={4}
          value={draft.description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </section>

      <BottomCTA
        label="제보 완료하기"
        onClick={goTriage}
        secondary={
          <Button variant="secondary" size="large" fullWidth onClick={goTriage}>
            건너뛰기
          </Button>
        }
      />
    </StepFrame>
  );
}
