/** Browser owners inject RAF; domain/session tests inject a deterministic clock. */
export interface PlaybackClock {
  now(): number
  request(callback: () => void): number
  cancel(id: number): void
}
