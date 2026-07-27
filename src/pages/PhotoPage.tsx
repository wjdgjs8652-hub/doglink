import { useNavigate } from "react-router-dom";
import { useReportDraft } from "../state/ReportDraftContext";
import { StepFrame } from "./StepFrame";
import { PhotoCapture } from "../components/PhotoCapture";
import { BottomCTA } from "../components/BottomCTA";

/** S2. 사진 촬영 및 업로드 */
export function PhotoPage() {
  const navigate = useNavigate();
  const { draft, setPhotos } = useReportDraft();

  const uploadedCount = draft.photos.filter((p) => p.status === "uploaded").length;
  const uploading = draft.photos.some((p) => p.status === "uploading");
  const canProceed = uploadedCount >= 1 && !uploading;

  return (
    <StepFrame step="photo" backTo="/">
      <h2 className="screen__question">동물 사진을 찍어주세요</h2>
      <p className="screen__hint">
        멀리서 전체 모습이 보이게 찍으면 AI가 더 정확히 판단해요.
      </p>
      <PhotoCapture photos={draft.photos} onChange={setPhotos} />
      <BottomCTA
        label="이 사진으로 제보"
        disabled={!canProceed}
        helperText={
          uploadedCount === 0
            ? "사진 한 장이 필요해요. 촬영하거나 앨범에서 선택해 주세요."
            : uploading
              ? "사진을 올리는 중이에요. 잠시만 기다려 주세요."
              : undefined
        }
        onClick={() => navigate("/report/location")}
      />
    </StepFrame>
  );
}
