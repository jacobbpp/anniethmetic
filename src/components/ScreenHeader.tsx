import { BackIcon } from './icons.tsx'

export interface ScreenHeaderProps {
  title: string
  backLabel: string
  onBack: () => void
}

export function ScreenHeader({ title, backLabel, onBack }: ScreenHeaderProps) {
  return (
    <div className="screen__header">
      <button type="button" className="icon-btn" onClick={onBack} aria-label={backLabel}>
        <BackIcon />
      </button>
      <span className="screen__title">{title}</span>
    </div>
  )
}
