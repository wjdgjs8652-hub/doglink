import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { StepIndicator, type StepItem } from "../components/StepIndicator";

/** S2~S5 단계형 화면 공통 프레임 */

const STEP_ORDER = [
  { id: "photo", label: "사진" },
  { id: "location", label: "위치" },
  { id: "details", label: "내용" },
  { id: "triage", label: "판정" },
] as const;

export type StepId = (typeof STEP_ORDER)[number]["id"];

export function buildSteps(current: StepId): StepItem[] {
  const currentIdx = STEP_ORDER.findIndex((s) => s.id === current);
  return STEP_ORDER.map((s, i) => ({
    id: s.id,
    label: s.label,
    state: i < currentIdx ? "completed" : i === currentIdx ? "current" : "upcoming",
  }));
}

export interface StepFrameProps {
  step: StepId;
  /** 뒤로가기 대상 경로. 없으면 히스토리 뒤로 */
  backTo?: string;
  children: ReactNode;
}

export function StepFrame({ step, backTo, children }: StepFrameProps) {
  const navigate = useNavigate();
  return (
    <div className="screen">
      <AppHeader
        title="DOG-LINK 제보"
        showBack
        onBack={() => (backTo ? navigate(backTo) : navigate(-1))}
      />
      <StepIndicator steps={buildSteps(step)} />
      <main className="screen__body">{children}</main>
    </div>
  );
}
