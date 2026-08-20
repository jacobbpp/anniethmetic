-- One row per device per daily challenge. The (challenge_date, device_id)
-- unique index means a resubmission from the same device on the same day
-- updates its own row via upsert rather than creating a second entry —
-- defense in depth alongside the client's own one-attempt-per-day gate.
CREATE TABLE IF NOT EXISTS daily_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_date TEXT NOT NULL,
  device_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target INTEGER NOT NULL,
  final_value INTEGER,
  score INTEGER NOT NULL,
  step_count INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_scores_date_device ON daily_scores (challenge_date, device_id);
CREATE INDEX IF NOT EXISTS idx_daily_scores_date ON daily_scores (challenge_date);

-- One row per device, upserted on every streak submission. A streak counts
-- as still live if last_played_date is today or yesterday (mirroring
-- src/game/daily.ts's isStreakActive exactly) — anything older just falls
-- out of the leaderboard query on its own.
CREATE TABLE IF NOT EXISTS streaks (
  device_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  streak_count INTEGER NOT NULL,
  last_played_date TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_streaks_last_played ON streaks (last_played_date);
