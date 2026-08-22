export interface StatCardProps {
  label: string
  value: string
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="tb-card home-stat-card">
      <span className="tb-eyebrow">{label}</span>
      <span className="tb-num home-stat-card__value">{value}</span>
    </div>
  )
}
