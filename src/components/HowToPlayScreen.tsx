import { ScreenHeader } from './ScreenHeader.tsx'

interface HowToPlayScreenProps {
  onClose: () => void
}

export function HowToPlayScreen({ onClose }: HowToPlayScreenProps) {
  return (
    <div className="screen">
      <ScreenHeader title="How to play" backLabel="Back to game" onBack={onClose} />
      <div className="screen__body">
        <div className="howto-body">
          <div className="howto-step">
            <span className="howto-step__n">1</span>
            <h3 className="howto-step__title">Six numbers, one target</h3>
            <p className="howto-step__body">
              You're dealt six numbers, a couple of big ones (25, 50, 75, 100) if you're lucky, the rest small
              (1–10), and a three-digit target. Get as close as you can.
            </p>
          </div>
          <div className="howto-step">
            <span className="howto-step__n">2</span>
            <h3 className="howto-step__title">Type a real equation</h3>
            <p className="howto-step__body">
              Tap numbers, operators (+, −, ×, ÷) and brackets to build one equation, same rules as school
              maths (BIDMAS/BODMAS). × and ÷ happen before + and −, and brackets override that order. You
              don't have to use every number, and no operation is required at all.
            </p>
          </div>
          <div className="howto-step">
            <span className="howto-step__n">3</span>
            <h3 className="howto-step__title">Every step must stay a whole, positive number</h3>
            <p className="howto-step__body">
              Same as the real show: no negative numbers and no fractions allowed at any point along the way,
              only the final answer can be anything. A button greys out the moment pressing it would break that
              rule. Try wrapping things in brackets instead.
            </p>
          </div>
          <div className="howto-step">
            <span className="howto-step__n">4</span>
            <h3 className="howto-step__title">Lock in whenever you're ready</h3>
            <p className="howto-step__body">
              Land on the target exactly and you lock in automatically. Nothing left to decide. Otherwise, lock
              in your equation at any time as your answer, even a single number with no operations at all.
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
              time only breaks a tie. Getting closer always matters more than getting there fast.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
