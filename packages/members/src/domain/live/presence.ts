import type { LiveActivityReport, LiveParticipation } from '@sistemazero/core/live'
import type { LiveCohortAggregate } from '../ports/live-repository.port'

/**
 * A presence write is skipped while the stored one is this fresh. The room polls every 3 s and
 * beats every 5 s: a beat refreshes presence, a repeated beat (two tabs, retries) does not.
 * The precision of "present" stays the beat's (the 15 s rules of the room are untouched).
 */
export const LIVE_PRESENCE_REFRESH_MS = 4_000

/** One presence row (`live_presence`): when an actor was last seen in an occurrence. */
export interface LivePresenceRow {
  occurrenceId: string
  actorId: string
  seenAt: string
  /** When the child last confirmed her activity (the heartbeat that carried it). */
  activityAt: string | null
}

const later = (current: string | undefined, candidate: string | null | undefined) => {
  if (!candidate) return current
  if (!current) return candidate
  return Date.parse(candidate) > Date.parse(current) ? candidate : current
}

/**
 * Overlays the presence rows on the occurrence documents: `teachers` (only teachers still
 * assigned), each participant's `seenAt` and, when she has an activity, its `reportedAt`.
 * The newer of the document and the row wins, so a document written by a command is never
 * moved back.
 */
export function overlayPresence(aggregate: LiveCohortAggregate, rows: LivePresenceRow[]) {
  for (const row of rows) {
    const occurrence = aggregate.occurrences.find((item) => item.id === row.occurrenceId)
    if (!occurrence) continue
    const seenAt = new Date(row.seenAt).toISOString()
    if (aggregate.cohort.teacherIds.includes(row.actorId)) {
      occurrence.teachers[row.actorId] = later(occurrence.teachers[row.actorId], seenAt)!
      continue
    }
    const participant = occurrence.participants.find((item) => item.learnerId === row.actorId)
    if (!participant) continue
    participant.seenAt = later(participant.seenAt, seenAt)!
    if (participant.activity && row.activityAt)
      participant.activity.reportedAt = later(
        participant.activity.reportedAt,
        new Date(row.activityAt).toISOString(),
      )!
  }
  return aggregate
}

/** Presence needs a write when it is missing or older than the refresh window. */
export function presenceStale(at: string | undefined, now: Date) {
  return !at || now.getTime() - Date.parse(at) >= LIVE_PRESENCE_REFRESH_MS
}

/** A classmate counts as "in the room" while seen within the room's 15 s rule. */
export const LIVE_PRESENT_WINDOW_MS = 15_000

/**
 * How many OTHER children are in the room now (waiting or admitted, seen recently). Only the
 * number reaches a child's browser: who they are stays on the server.
 */
export function classmatesPresent(
  participants: readonly LiveParticipation[],
  actorId: string,
  now: Date,
): number {
  return participants.filter(
    (item) =>
      item.learnerId !== actorId &&
      item.admission !== 'removed' &&
      now.getTime() - Date.parse(item.seenAt) < LIVE_PRESENT_WINDOW_MS,
  ).length
}

/** The same activity (ignoring when it was reported): a heartbeat that repeats it is no change. */
export function sameActivity(
  stored: LiveActivityReport | undefined,
  report: LiveActivityReport,
): boolean {
  if (!stored) return false
  return (
    (stored.stepId ?? null) === (report.stepId ?? null) &&
    stored.saveState === report.saveState &&
    (stored.sectionId ?? null) === (report.sectionId ?? null) &&
    JSON.stringify(stored.completedSectionIds ?? null) ===
      JSON.stringify(report.completedSectionIds ?? null)
  )
}
