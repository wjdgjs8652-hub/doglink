import "./SituationChips.css";

export interface SituationChip {
  id: string;
  label: string;
}

/** 목격 상황 칩 정의 (S4·AI 판정·응급 요약에서 공유) */
export const SITUATION_CHIPS: SituationChip[] = [
  { id: "injured", label: "다쳐 보여요" },
  { id: "not-moving", label: "움직이지 않아요" },
  { id: "leashed", label: "목줄이 있어요" },
  { id: "avoids-people", label: "사람을 피해요" },
  { id: "near-road", label: "도로 근처에 있어요" },
  { id: "aggressive", label: "공격적인 행동을 보여요" },
  { id: "puppy", label: "새끼로 보여요" },
  { id: "multiple", label: "여러 마리가 함께 있어요" },
];

export function situationLabels(ids: string[]): string[] {
  return ids
    .map((id) => SITUATION_CHIPS.find((c) => c.id === id)?.label)
    .filter((label): label is string => Boolean(label));
}

export interface SituationChipsProps {
  chips?: SituationChip[];
  selected: string[];
  onChange(selected: string[]): void;
}

export function SituationChips({
  chips = SITUATION_CHIPS,
  selected,
  onChange,
}: SituationChipsProps) {
  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    );
  };

  return (
    <div className="situation-chips" role="group" aria-label="목격 상황 선택">
      {chips.map((chip) => {
        const isSelected = selected.includes(chip.id);
        return (
          <button
            key={chip.id}
            type="button"
            className={`situation-chip${isSelected ? " situation-chip--selected" : ""}`}
            aria-pressed={isSelected}
            onClick={() => toggle(chip.id)}
          >
            <span className="situation-chip__check" aria-hidden="true">
              {isSelected && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2.2 6.4L4.8 9l5-6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
