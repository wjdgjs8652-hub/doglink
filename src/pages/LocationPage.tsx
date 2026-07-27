import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useReportDraft } from "../state/ReportDraftContext";
import { StepFrame } from "./StepFrame";
import { LocationPicker } from "../components/LocationPicker";
import { BottomCTA } from "../components/BottomCTA";

/** S3. 위치 확인 */
export function LocationPage() {
  const navigate = useNavigate();
  const { draft, setLocation } = useReportDraft();

  // 이전 단계(사진) 데이터가 없으면 순서에 맞게 되돌림
  const hasPhoto = draft.photos.some((p) => p.status === "uploaded");
  useEffect(() => {
    if (!hasPhoto) navigate("/report/photo", { replace: true });
  }, [hasPhoto, navigate]);

  if (!hasPhoto) return null;

  return (
    <StepFrame step="location" backTo="/report/photo">
      <h2 className="screen__question">발견한 위치가 맞나요?</h2>
      <p className="screen__hint">
        지도를 움직여 핀을 조정하거나, 주소를 검색해 지정할 수 있어요.
      </p>
      <LocationPicker value={draft.location} onChange={setLocation} />
      <BottomCTA
        label="이 위치가 맞아요"
        disabled={!draft.location}
        helperText={
          draft.location
            ? undefined
            : "위치를 지정해 주세요. GPS 없이 주소 검색이나 직접 입력도 가능해요."
        }
        onClick={() => navigate("/report/details")}
      />
    </StepFrame>
  );
}
