export interface ChangelogEntry {
  version: string
  date: string
  highlights: string[]
}

// Newest first. `CHANGELOG[0].version` must always match APP_VERSION in
// version.ts — bump both together when shipping a new entry.
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.4.0',
    date: '2026-08-22',
    highlights: [
      'See your last 30 days of daily play at a glance on a new calendar grid in Stats',
      'Stats now split games played into free play vs. daily',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-08-22',
    highlights: [
      'Type a full equation with +, −, ×, ÷ and brackets instead of merging tiles',
      'Real BIDMAS/BODMAS order of operations, same rules as school maths',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-08-20',
    highlights: [
      'Daily and streak leaderboards',
      "A solvability indicator shows whether the day's puzzle had an exact solution",
    ],
  },
  {
    version: '0.1.0',
    date: '2026-08-20',
    highlights: ['Initial release'],
  },
]
