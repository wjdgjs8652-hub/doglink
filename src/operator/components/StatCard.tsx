import "./StatCard.css";

export interface StatCardProps {
  label: string;
  value: string | number;
  /** 기준 정의 — 수치 아래에 항상 표시 */
  definition: string;
  loading?: boolean;
}

export function StatCard({ label, value, definition, loading = false }: StatCardProps) {
  return (
    <div className="stat-card">
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value tabular-nums" aria-busy={loading || undefined}>
        {loading ? "—" : value}
      </span>
      <span className="stat-card__definition">{definition}</span>
    </div>
  );
}
