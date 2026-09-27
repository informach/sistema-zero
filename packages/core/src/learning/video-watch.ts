import type { LearningAnswers } from './index'

export const VIDEO_WATCH_THRESHOLD = 0.9
export interface VideoWatchCoverage {
  duration: number
  ranges: Array<[number, number]>
}

/** Union of played intervals, never the furthest playhead position or repeated viewing time. */
export function mergeVideoCoverage(...values: VideoWatchCoverage[]): VideoWatchCoverage {
  const duration = values.at(-1)?.duration ?? 0
  const sorted = values
    .flatMap((v) => (v.duration === duration ? v.ranges : []))
    .filter(
      ([a, b]) => Number.isFinite(a) && Number.isFinite(b) && a >= 0 && b > a && b <= duration,
    )
    .sort((a, b) => a[0] - b[0])
  const ranges: Array<[number, number]> = []
  for (const [start, end] of sorted) {
    const last = ranges.at(-1)
    if (last && start <= last[1]) last[1] = Math.max(last[1], end)
    else ranges.push([start, end])
  }
  // Bound storage after many seeks. Discard the shortest intervals; never fill unseen gaps.
  return {
    duration,
    ranges: ranges
      .sort((a, b) => b[1] - b[0] - (a[1] - a[0]))
      .slice(0, 100)
      .sort((a, b) => a[0] - b[0]),
  }
}

export function readVideoCoverage(answers: LearningAnswers): VideoWatchCoverage | null {
  const duration = answers.videoDuration
  const values = answers.videoRanges
  if (
    typeof duration !== 'number' ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > 86400 ||
    !Array.isArray(values) ||
    values.length > 100
  )
    return null
  const ranges: Array<[number, number]> = []
  for (const value of values) {
    if (!/^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(value)) return null
    const [start, end] = value.split(':').map(Number)
    if (
      start === undefined ||
      end === undefined ||
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      end <= start ||
      end > duration
    )
      return null
    ranges.push([start, end])
  }
  return mergeVideoCoverage({ duration, ranges })
}

export function videoCoverageAnswers(coverage: VideoWatchCoverage): LearningAnswers {
  const normalized = mergeVideoCoverage(coverage)
  return {
    videoDuration: normalized.duration,
    videoRanges: normalized.ranges.map(([a, b]) => `${a}:${b}`),
  }
}

export function mergeVideoWatchAnswers(
  previous: LearningAnswers,
  next: LearningAnswers,
): LearningAnswers {
  const before = readVideoCoverage(previous),
    after = readVideoCoverage(next)
  if (!after) return before ? videoCoverageAnswers(before) : next
  return videoCoverageAnswers(mergeVideoCoverage(...(before ? [before] : []), after))
}

export function videoWatchedFraction(answers: LearningAnswers): number {
  const coverage = readVideoCoverage(answers)
  return coverage ? coverage.ranges.reduce((sum, [a, b]) => sum + b - a, 0) / coverage.duration : 0
}
