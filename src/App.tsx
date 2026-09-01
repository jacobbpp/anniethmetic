import { useEffect, useMemo, useState } from 'react'
import { AchievementsScreen } from './components/AchievementsScreen.tsx'
import { AchievementToast } from './components/AchievementToast.tsx'
import { BigsPickerScreen } from './components/BigsPickerScreen.tsx'
import { GameScreen } from './components/GameScreen.tsx'
import { Header } from './components/Header.tsx'
import { HomeScreen } from './components/HomeScreen.tsx'
import { HowToPlayScreen } from './components/HowToPlayScreen.tsx'
import { LeaderboardPrompt } from './components/LeaderboardPrompt.tsx'
import { LeaderboardScreen } from './components/LeaderboardScreen.tsx'
import { ResultScreen } from './components/ResultScreen.tsx'
import { SettingsScreen } from './components/SettingsScreen.tsx'
import { StatsScreen } from './components/StatsScreen.tsx'
import { WhatsNewScreen } from './components/WhatsNewScreen.tsx'
import { bestSolveTimeMs, formatDateLabel, getLocalDateString } from './game/daily.ts'
import { formatExpression } from './game/share.ts'
import {
  backspace,
  clearExpression,
  expireClock,
  lockIn,
  pressCloseBracket,
  pressEquals,
  pressNumber,
  pressOpenBracket,
  pressOperator,
  scoreForValue,
  stepCount,
} from './game/engine.ts'
import { isPuzzleSolvable } from './game/solver.ts'
import { ACHIEVEMENTS } from './game/achievements.ts'
import type { Operator } from './game/types.ts'
import { useAchievements } from './hooks/useAchievements.ts'
import { useClassicClockSetting } from './hooks/useClassicClockSetting.ts'
import { useCurrentDailyGame } from './hooks/useCurrentDailyGame.ts'
import { useCurrentGame } from './hooks/useCurrentGame.ts'
import { useDailyChallenge } from './hooks/useDailyChallenge.ts'
import { useDailyTimer } from './hooks/useDailyTimer.ts'
import { useGameStats } from './hooks/useGameStats.ts'
import { useHardMode } from './hooks/useHardMode.ts'
import { useLeaderboard } from './hooks/useLeaderboard.ts'
import { useShowHomeScreen } from './hooks/useShowHomeScreen.ts'
import { useSoundSetting } from './hooks/useSoundSetting.ts'
import { useTheme } from './hooks/useTheme.ts'
import { useWhatsNew } from './hooks/useWhatsNew.ts'
import { playSound } from './utils/sound.ts'
import { resetAllData } from './utils/resetData.ts'
import { APP_VERSION } from './version.ts'

type ReturnTarget = 'home' | 'game' | 'settings'

interface PendingLeaderboardEntry {
  target: number
  finalValue: number | null
  score: number
  stepCount: number
  durationMs: number
}

export function App() {
  const today = useMemo(() => getLocalDateString(), [])

  const freePlay = useCurrentGame()
  const daily = useCurrentDailyGame(today)
  const dailyChallenge = useDailyChallenge(today)
  const gameStats = useGameStats()
  const { hardMode, toggleHardMode } = useHardMode()
  const { theme, toggleTheme } = useTheme()
  const { muted, toggleMuted } = useSoundSetting()
  const { showHomeScreen } = useShowHomeScreen()
  const { classicClock, toggleClassicClock } = useClassicClockSetting()
  const whatsNew = useWhatsNew()

  const dailyHasStarted = daily.state.tokens.length > 0
  const dailyIsLocked = daily.state.status === 'locked'
  const dailyTimer = useDailyTimer(dailyHasStarted, dailyIsLocked)

  const fastestDailySolveMs = bestSolveTimeMs(dailyChallenge.history)
  const achievements = useAchievements(gameStats.stats, dailyChallenge.streak, fastestDailySolveMs)
  const leaderboard = useLeaderboard()

  const [isHomeOpen, setIsHomeOpen] = useState(showHomeScreen)
  const [isDailyOpen, setIsDailyOpen] = useState(false)
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false)
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false)
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false)
  const [isBigsPickerOpen, setIsBigsPickerOpen] = useState(false)
  const [returnTo, setReturnTo] = useState<ReturnTarget>('game')
  const [pendingLeaderboardEntry, setPendingLeaderboardEntry] = useState<PendingLeaderboardEntry | null>(null)

  const activeState = isDailyOpen ? daily.state : freePlay.state
  const activeSetState = isDailyOpen ? daily.setState : freePlay.setState

  // Record a completed free-play game exactly once per game, guarded by the
  // hook's own hasRecorded flag so a page refresh right after finishing
  // can't double-count it.
  useEffect(() => {
    if (freePlay.state.status === 'locked' && !freePlay.hasRecorded) {
      const score = scoreForValue(freePlay.state.target, freePlay.state.finalValue)
      gameStats.recordCompletedGame(score, false)
      freePlay.setHasRecorded(true)
      playSound(score === 10 ? 'win' : score > 0 ? 'close' : 'miss')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freePlay.state.status, freePlay.hasRecorded])

  // Record today's daily result exactly once, guarded by todayResult already
  // being set — there's only one daily attempt per day.
  useEffect(() => {
    if (daily.state.status === 'locked' && dailyChallenge.todayResult === null) {
      const target = daily.state.target
      const finalValue = daily.state.finalValue
      const steps = stepCount(daily.state)
      const durationMs = dailyTimer.elapsedMs
      const score = scoreForValue(target, finalValue)

      gameStats.recordCompletedGame(score, true)
      dailyChallenge.recordDailyResult({
        target,
        finalValue,
        score,
        stepCount: steps,
        solveTimeMs: durationMs,
        wasSolvable: isPuzzleSolvable(daily.state.tiles.map(tile => tile.value), target),
      })
      playSound(score === 10 ? 'win' : score > 0 ? 'close' : 'miss')

      leaderboard.checkDailyQualifies(today, score).then(qualifies => {
        if (qualifies) setPendingLeaderboardEntry({ target, finalValue, score, stepCount: steps, durationMs })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daily.state.status, dailyChallenge.todayResult])

  function closeAllScreens() {
    setIsHomeOpen(false)
    setIsStatsOpen(false)
    setIsSettingsOpen(false)
    setIsHowToPlayOpen(false)
    setIsLeaderboardOpen(false)
  }

  function openHome() {
    closeAllScreens()
    setIsHomeOpen(true)
  }

  function openStats() {
    setReturnTo(isHomeOpen ? 'home' : 'game')
    closeAllScreens()
    setIsStatsOpen(true)
  }

  function openLeaderboard() {
    setReturnTo(isHomeOpen ? 'home' : 'game')
    closeAllScreens()
    setIsLeaderboardOpen(true)
  }

  function openSettings() {
    setReturnTo(isHomeOpen ? 'home' : 'game')
    closeAllScreens()
    setIsSettingsOpen(true)
  }

  function openHowToPlayFrom(from: ReturnTarget) {
    setReturnTo(from)
    closeAllScreens()
    setIsHowToPlayOpen(true)
  }

  function closeToReturnPoint() {
    closeAllScreens()
    if (returnTo === 'home') setIsHomeOpen(true)
    else if (returnTo === 'settings') setIsSettingsOpen(true)
  }

  // Starting a fresh round asks how many bigs to deal first (same choice a
  // real Countdown contestant makes each round) — resuming an in-progress
  // board just jumps back in, no picker needed.
  function startFreePlay() {
    if (freePlay.state.status === 'locked') {
      setIsBigsPickerOpen(true)
      return
    }
    closeAllScreens()
    setIsDailyOpen(false)
  }

  function pickBigsAndStartFreePlay(largeCount: number | null) {
    setIsBigsPickerOpen(false)
    freePlay.restart(largeCount)
    closeAllScreens()
    setIsDailyOpen(false)
  }

  function startDaily() {
    if (dailyChallenge.todayResult !== null) return
    closeAllScreens()
    setIsDailyOpen(true)
  }

  const isResultShowing =
    activeState.status === 'locked' && !isHomeOpen && !isStatsOpen && !isSettingsOpen && !isHowToPlayOpen && !isLeaderboardOpen
  const showAchievementToast = achievements.newlyUnlocked.length > 0 && !isAchievementsOpen && !isResultShowing

  return (
    <div className="app">
      {isHomeOpen ? (
        <HomeScreen
          todayResult={dailyChallenge.todayResult}
          dailyStreak={dailyChallenge.streak}
          stats={gameStats.stats}
          unlockedCount={Object.keys(achievements.unlockedAt).length}
          totalAchievementCount={ACHIEVEMENTS.length}
          onPlayFreePlay={startFreePlay}
          onPlayDaily={startDaily}
          onOpenStats={openStats}
          onOpenAchievements={() => setIsAchievementsOpen(true)}
          onOpenLeaderboard={openLeaderboard}
          onOpenHowToPlay={() => openHowToPlayFrom('home')}
          onOpenSettings={openSettings}
        />
      ) : isStatsOpen ? (
        <StatsScreen
          stats={gameStats.stats}
          dailyStreak={dailyChallenge.streak}
          dailyHistory={dailyChallenge.history}
          today={today}
          onClose={closeToReturnPoint}
        />
      ) : isLeaderboardOpen ? (
        <LeaderboardScreen
          fetchDailyLeaderboard={leaderboard.fetchDailyLeaderboard}
          fetchStreakLeaderboard={leaderboard.fetchStreakLeaderboard}
          today={today}
          rememberedName={leaderboard.name}
          onClose={closeToReturnPoint}
        />
      ) : isSettingsOpen ? (
        <SettingsScreen
          muted={muted}
          onToggleMuted={toggleMuted}
          theme={theme}
          onToggleTheme={toggleTheme}
          hardMode={hardMode}
          onToggleHardMode={toggleHardMode}
          classicClock={classicClock}
          onToggleClassicClock={toggleClassicClock}
          onOpenHowToPlay={() => openHowToPlayFrom('settings')}
          onOpenWhatsNew={whatsNew.openFullHistory}
          onResetData={resetAllData}
          onClose={closeToReturnPoint}
          version={APP_VERSION}
        />
      ) : isHowToPlayOpen ? (
        <HowToPlayScreen onClose={closeToReturnPoint} />
      ) : (
        <>
          <Header
            onOpenHome={openHome}
            onOpenAchievements={() => setIsAchievementsOpen(true)}
            onOpenStats={openStats}
            onOpenLeaderboard={openLeaderboard}
            onOpenSettings={openSettings}
            hasNewAchievement={achievements.newlyUnlocked.length > 0}
          />
          <GameScreen
            state={activeState}
            resetSignal={isDailyOpen ? today : freePlay.gameId}
            hardMode={hardMode}
            classicClockEnabled={classicClock}
            elapsedMs={isDailyOpen ? dailyTimer.elapsedMs : undefined}
            onPressNumber={id => activeSetState(pressNumber(activeState, id))}
            onPressOperator={(op: Operator) => activeSetState(pressOperator(activeState, op))}
            onPressOpenBracket={() => activeSetState(pressOpenBracket(activeState))}
            onPressCloseBracket={() => activeSetState(pressCloseBracket(activeState))}
            onPressEquals={() => activeSetState(pressEquals(activeState))}
            onBackspace={() => activeSetState(backspace(activeState))}
            onClearAll={() => activeSetState(clearExpression(activeState))}
            onLockIn={() => activeSetState(lockIn(activeState))}
            onExpireClock={() => activeSetState(expireClock(activeState))}
          />
          {isResultShowing && (
            <ResultScreen
              mode={isDailyOpen ? 'daily' : 'free'}
              target={activeState.target}
              finalValue={activeState.finalValue}
              score={scoreForValue(activeState.target, activeState.finalValue)}
              stepCount={stepCount(activeState)}
              elapsedMs={isDailyOpen ? dailyTimer.elapsedMs : 0}
              dateLabel={isDailyOpen ? formatDateLabel(today) : undefined}
              dailyStreakCount={isDailyOpen ? dailyChallenge.streak.count : undefined}
              wasSolvable={isDailyOpen ? dailyChallenge.todayResult?.wasSolvable : undefined}
              equation={isDailyOpen ? formatExpression(daily.state.tokens) : undefined}
              onPlayAgain={isDailyOpen ? undefined : startFreePlay}
              onClose={openHome}
            />
          )}
        </>
      )}

      {isAchievementsOpen && (
        <AchievementsScreen unlockedAt={achievements.unlockedAt} onClose={() => setIsAchievementsOpen(false)} />
      )}

      {showAchievementToast && (
        <AchievementToast achievement={achievements.newlyUnlocked[0]} onDismiss={achievements.dismissNewlyUnlocked} />
      )}

      {pendingLeaderboardEntry && (
        <LeaderboardPrompt
          rememberedName={leaderboard.name}
          onSave={playerName => {
            const { target, finalValue, score, stepCount, durationMs } = pendingLeaderboardEntry
            leaderboard.submitDailyScore(today, playerName, target, finalValue, score, stepCount, durationMs)
            leaderboard.submitStreak(playerName, dailyChallenge.streak.count, today)
            setPendingLeaderboardEntry(null)
          }}
          onSkip={() => setPendingLeaderboardEntry(null)}
        />
      )}

      {whatsNew.isOpen && <WhatsNewScreen entries={whatsNew.entries} onClose={whatsNew.close} />}

      {isBigsPickerOpen && (
        <BigsPickerScreen onPick={pickBigsAndStartFreePlay} onCancel={() => setIsBigsPickerOpen(false)} />
      )}
    </div>
  )
}
