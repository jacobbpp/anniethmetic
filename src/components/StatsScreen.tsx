import { useState } from 'react'
import { SCORE_BANDS, averageScore, freePlayGamesCount, hasPlayedAnyGames, scoreBandCount, winRatePercent } from '../game/stats.ts'
import type { StatsData } from '../game/stats.ts'
import { averageSolveTimeMs, bestSolveTimeMs, buildCalendarDays, solvabilityBreakdown } from '../game/daily.ts'
import type { CalendarDay, DailyResult, StreakData } from '../game/daily.ts'
import { formatElapsedTime } from '../game/share.ts'

type StatsSection = 'menu' | 'score' | 'streak' | 'time' | 'winrate'

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

export interface StatsScreenProps {
  stats: StatsData
  dailyStreak: StreakData
  dailyHistory: DailyResult[]
  today: string
  onClose: () => void
}

function sectionTitle(section: StatsSection): string {
  switch (section) {
    case 'score':
      return 'Score'
    case 'streak':
      return 'Daily streak'
    case 'time':
      return 'Solve time'
    case 'winrate':
      return 'Win rate & streak'
    case 'menu':
      return 'Stats'
  }
}

function scorePreview(stats: StatsData): string {
  if (!hasPlayedAnyGames(stats)) return 'No games yet'
  const avg = averageScore(stats)
  return `Average ${avg === null ? '0.0' : avg.toFixed(1)} out of 10`
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

function gamesSplitCaption(stats: StatsData): string {
  const freePlay = freePlayGamesCount(stats)
  return `${pluralize(stats.totalGames, 'game')} played — ${freePlay} free play, ${stats.dailyGames} daily`
}

function streakPreview(dailyStreak: StreakData): string {
  return dailyStreak.count > 0 ? `${dailyStreak.count} day streak` : 'Not started yet'
}

function timePreview(dailyHistory: DailyResult[]): string {
  const avg = averageSolveTimeMs(dailyHistory)
  return avg === null ? 'No daily solves yet' : `Averaging ${formatElapsedTime(avg)}`
}

function winRatePreview(stats: StatsData): string {
  const rate = winRatePercent(stats)
  return rate === null ? 'No games yet' : `${rate}% win rate`
}

interface MenuRowProps {
  title: string
  preview: string
  onClick: () => void
}

function MenuRow({ title, preview, onClick }: MenuRowProps) {
  return (
    <button type="button" className="menu-row" onClick={onClick}>
      <span className="menu-row-text">
        <span className="menu-row-title">{title}</span>
        <span className="menu-row-preview">{preview}</span>
      </span>
      <ChevronRightIcon />
    </button>
  )
}

function ScoreSection({ stats, dailyHistory }: { stats: StatsData; dailyHistory: DailyResult[] }) {
  const avg = averageScore(stats)
  const bandCounts = SCORE_BANDS.map(band => scoreBandCount(stats, band))
  const maxCount = Math.max(...bandCounts)
  const { solvableCount, unsolvableCount, exactOnSolvableCount } = solvabilityBreakdown(dailyHistory)
  const solvedDays = solvableCount + unsolvableCount

  return (
    <>
      {hasPlayedAnyGames(stats) && (
        <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', margin: 0 }}>
          {gamesSplitCaption(stats)}
        </p>
      )}
      <div className="stats-hero-row">
        <div className="stats-hero">
          <p className="stats-hero__value">{avg === null ? '—' : avg.toFixed(1)}</p>
          <p className="stats-hero__label">average score</p>
        </div>
      </div>
      <div className="score-distribution__bars">
        {SCORE_BANDS.map((band, i) => {
          const count = bandCounts[i]
          const height = maxCount === 0 ? 0 : (count / maxCount) * 100
          return (
            <div className="score-distribution__col" key={band}>
              <div className="score-distribution__bar" style={{ height: `${height}%` }} />
              <span className="score-distribution__count">{count}</span>
              <span className="score-distribution__label">{band}</span>
            </div>
          )
        })}
      </div>
      {solvedDays > 0 && (
        <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center' }}>
          {solvableCount} of your {solvedDays} daily puzzle{solvedDays === 1 ? '' : 's'} had an exact solution — you
          found it {exactOnSolvableCount} of those times.
          {unsolvableCount > 0 &&
            ` The other ${unsolvableCount} had no exact hit possible, same as the real show.`}
        </p>
      )}
    </>
  )
}

function calendarCellClass(day: CalendarDay): string {
  if (day.result === null) return 'stats-calendar__cell stats-calendar__cell--none'
  const { score } = day.result
  if (score === 10) return 'stats-calendar__cell stats-calendar__cell--win'
  if (score === 7 || score === 5) return 'stats-calendar__cell stats-calendar__cell--close'
  return 'stats-calendar__cell stats-calendar__cell--miss'
}

function StreakSection({ streak, dailyHistory, today }: { streak: StreakData; dailyHistory: DailyResult[]; today: string }) {
  const calendarDays = buildCalendarDays(dailyHistory, today)
  return (
    <>
      <div className="stats-hero-row">
        <div className="stats-hero">
          <p className="stats-hero__value">{streak.count}</p>
          <p className="stats-hero__label">current streak</p>
        </div>
        <div className="stats-hero">
          <p className="stats-hero__value">{streak.bestStreak}</p>
          <p className="stats-hero__label">best streak</p>
        </div>
      </div>
      <p className="stats-calendar__title">Last 30 days</p>
      <div className="stats-calendar">
        {calendarDays.map(day => (
          <span key={day.date} className={calendarCellClass(day)} title={day.date} />
        ))}
      </div>
      <div className="stats-calendar__legend">
        <span>
          <i className="stats-calendar__swatch stats-calendar__swatch--win" /> exact
        </span>
        <span>
          <i className="stats-calendar__swatch stats-calendar__swatch--close" /> close
        </span>
        <span>
          <i className="stats-calendar__swatch stats-calendar__swatch--miss" /> miss
        </span>
        <span>
          <i className="stats-calendar__swatch stats-calendar__swatch--none" /> not played
        </span>
      </div>
    </>
  )
}

function TimeSection({ history }: { history: DailyResult[] }) {
  const avg = averageSolveTimeMs(history)
  const best = bestSolveTimeMs(history)
  return (
    <>
      <div className="stats-hero-row">
        <div className="stats-hero">
          <p className="stats-hero__value">{avg === null ? '—' : formatElapsedTime(avg)}</p>
          <p className="stats-hero__label">average solve time</p>
        </div>
        <div className="stats-hero">
          <p className="stats-hero__value">{best === null ? '—' : formatElapsedTime(best)}</p>
          <p className="stats-hero__label">best solve time</p>
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center' }}>Daily challenge only</p>
    </>
  )
}

function WinRateSection({ stats }: { stats: StatsData }) {
  const rate = winRatePercent(stats)
  return (
    <>
      <div className="stats-hero-row">
        <div className="stats-hero">
          <p className="stats-hero__value">{rate === null ? '—' : `${rate}%`}</p>
          <p className="stats-hero__label">win rate</p>
        </div>
        <div className="stats-hero">
          <p className="stats-hero__value">{stats.currentWinStreak}</p>
          <p className="stats-hero__label">current streak</p>
        </div>
        <div className="stats-hero">
          <p className="stats-hero__value">{stats.bestWinStreak}</p>
          <p className="stats-hero__label">best streak</p>
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center' }}>
        Any score above nought counts as a win.
      </p>
    </>
  )
}

export function StatsScreen({ stats, dailyStreak, dailyHistory, today, onClose }: StatsScreenProps) {
  const [section, setSection] = useState<StatsSection>('menu')

  const handleBack = () => {
    if (section === 'menu') onClose()
    else setSection('menu')
  }

  return (
    <div className="screen">
      <div className="screen__header">
        <button
          type="button"
          className="icon-btn"
          onClick={handleBack}
          aria-label={section === 'menu' ? 'Back to game' : 'Back to stats'}
        >
          <BackIcon />
        </button>
        <span className="screen__title">{sectionTitle(section)}</span>
      </div>
      <div className="screen__body">
        {section === 'menu' && (
          <>
            <MenuRow
              title="Score average & distribution"
              preview={scorePreview(stats)}
              onClick={() => setSection('score')}
            />
            <MenuRow title="Daily streak" preview={streakPreview(dailyStreak)} onClick={() => setSection('streak')} />
            <MenuRow title="Solve time" preview={timePreview(dailyHistory)} onClick={() => setSection('time')} />
            <MenuRow
              title="Win rate & streak"
              preview={winRatePreview(stats)}
              onClick={() => setSection('winrate')}
            />
          </>
        )}
        {section === 'score' && <ScoreSection stats={stats} dailyHistory={dailyHistory} />}
        {section === 'streak' && <StreakSection streak={dailyStreak} dailyHistory={dailyHistory} today={today} />}
        {section === 'time' && <TimeSection history={dailyHistory} />}
        {section === 'winrate' && <WinRateSection stats={stats} />}
      </div>
    </div>
  )
}
