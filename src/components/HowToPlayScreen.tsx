function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

interface HowToPlayScreenProps {
  onClose: () => void
}

export function HowToPlayScreen({ onClose }: HowToPlayScreenProps) {
  return (
    <div className="screen">
      <div className="screen__header">
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Back to game">
          <BackIcon />
        </button>
        <span className="screen__title">How to play</span>
      </div>
      <div className="screen__body">
        <div className="howto-body">
          <div className="howto-step">
            <span className="howto-step__n">1</span>
            <h3 className="howto-step__title">Six numbers, one target</h3>
            <p className="howto-step__body">
              You're dealt six numbers — a couple of big ones (25, 50, 75, 100) if you're lucky, the rest small
              (1–10) — and a three-digit target. Get as close as you can.
            </p>
          </div>
          <div className="howto-step">
            <span className="howto-step__n">2</span>
            <h3 className="howto-step__title">Tap to merge</h3>
            <p className="howto-step__body">
              Tap a number, tap an operator (+, −, ×, ÷), then tap a second number. The two combine into a new
              tile that goes back in the pool, ready to merge again. No brackets needed — the order you merge in
              does the work.
            </p>
          </div>
          <div className="howto-step">
            <span className="howto-step__n">3</span>
            <h3 className="howto-step__title">− and ÷ never fail on tap order</h3>
            <p className="howto-step__body">
              Subtraction and division always take the bigger number first, whichever tile you tapped. A
              subtraction landing on zero, or a division that doesn't divide evenly, just won't go through — try
              a different pair.
            </p>
          </div>
          <div className="howto-step">
            <span className="howto-step__n">4</span>
            <h3 className="howto-step__title">Lock in whenever you're ready</h3>
            <p className="howto-step__body">
              Land on the target exactly and you lock in automatically — nothing left to decide. Otherwise, lock
              in any tile at any time as your answer, even one of the original six with no merges at all.
            </p>
          </div>
          <div className="howto-step">
            <span className="howto-step__n">5</span>
            <h3 className="howto-step__title">Scoring</h3>
            <p className="howto-step__body">
              Exact target: 10 points. Within 5: 7 points. Within 10: 5 points. Any further off: nought. Same as
              the real show.
            </p>
          </div>
          <div className="howto-step">
            <span className="howto-step__n">6</span>
            <h3 className="howto-step__title">One a day</h3>
            <p className="howto-step__body">
              Everyone gets the same six numbers and the same target each day. Score comes first for ranking,
              time only breaks a tie — getting closer always matters more than getting there fast.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
