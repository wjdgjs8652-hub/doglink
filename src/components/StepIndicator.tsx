import "./StepIndicator.css";

export type StepState = "completed" | "current" | "upcoming";

export interface StepItem {
  id: string;
  label: string;
  state: StepState;
}

export interface StepIndicatorProps {
  steps: StepItem[];
}

export function StepIndicator({ steps }: StepIndicatorProps) {
  const current = steps.find((s) => s.state === "current");
  return (
    <nav className="step-indicator" aria-label="제보 진행 단계">
      <p className="visually-hidden" aria-live="polite">
        {current
          ? `전체 ${steps.length}단계 중 ${steps.findIndex((s) => s.id === current.id) + 1}단계: ${current.label}`
          : ""}
      </p>
      <ol className="step-indicator__list">
        {steps.map((step) => (
          <li
            key={step.id}
            className={`step-indicator__item step-indicator__item--${step.state}`}
            aria-current={step.state === "current" ? "step" : undefined}
          >
            <span className="step-indicator__dot" aria-hidden="true">
              {step.state === "completed" ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M1.5 5.5L4 8l4.5-6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </span>
            <span className="step-indicator__label">{step.label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
