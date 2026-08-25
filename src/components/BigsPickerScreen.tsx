export interface BigsPickerScreenProps {
  onPick: (largeCount: number | null) => void
  onCancel: () => void
}

const OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Random', value: null },
  { label: '0', value: 0 },
  { label: '1', value: 1 },
  { label: '2', value: 2 },
]

export function BigsPickerScreen({ onPick, onCancel }: BigsPickerScreenProps) {
  return (
    <div className="overlay">
      <div className="overlay__card">
        <h2 className="overlay__title">How many bigs?</h2>
        <p className="overlay__subtitle">Big numbers are 25, 50, 75, and 100. The rest fill in as smalls.</p>
        <div className="bigs-picker__options">
          {OPTIONS.map(option => (
            <button
              key={option.label}
              type="button"
              className="btn btn--secondary bigs-picker__option"
              onClick={() => onPick(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button type="button" className="bigs-picker__cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
