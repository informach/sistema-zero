import {
  applyExperienceSegment,
  EXPERIENCE_SEGMENT_LIMIT,
  type ExperienceCheckpoint,
  type ExperienceCommand,
  type ExperienceEvent,
  type ExperienceSegment,
  type ExperienceSession,
  type ExplorationActivity,
  experienceAnswers,
  initialExperience,
  isExperienceCommand,
  isLearningAnswers,
  type LearningAnswers,
  readExperienceCheckpoint,
  readExperienceSegment,
  segmentAnswers,
  stepExperience,
} from '@sistemazero/core/learning'

export interface ExperienceDraft {
  confirmed: LearningAnswers
  pending: ExperienceCommand[]
  inFlight: ExperienceSegment | null
  sessionId: string
}
/** The render loop reads one snapshot. Network and disk work run outside animation frames. */
export class ExperienceController {
  private snapshot: ExperienceSession
  private confirmed: ExperienceCheckpoint | null
  private pending: ExperienceCommand[] = []
  private inFlight: ExperienceSegment | null = null
  private listeners = new Set<() => void>()
  constructor(
    readonly activity: ExplorationActivity,
    private sessionId: string,
    answers: LearningAnswers = {},
  ) {
    this.confirmed = readExperienceCheckpoint(activity, answers)
    this.snapshot = this.confirmed?.session ?? initialExperience(activity)
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  getSnapshot = () => this.snapshot
  dispatch(command: ExperienceCommand): ExperienceEvent[] {
    const { session, events } = stepExperience(this.activity, this.snapshot, command)
    this.snapshot = session
    // Keep the exact transitions seen by the learner. Combining time steps changes
    // when observations are captured (for example, 3 cacti can become 30 on reload).
    this.pending.push(command)
    for (const listener of this.listeners) listener()
    return events
  }
  segment(): LearningAnswers | null {
    if (!this.pending.length) return null
    this.inFlight ??= {
      sessionId: this.sessionId,
      segmentId: crypto.randomUUID(),
      baseSequence: this.confirmed?.sequence ?? 0,
      commands: this.pending.slice(0, EXPERIENCE_SEGMENT_LIMIT),
    }
    return segmentAnswers(this.inFlight)
  }
  acknowledge(answers: LearningAnswers) {
    const checkpoint = readExperienceCheckpoint(this.activity, answers)
    if (
      !checkpoint ||
      !this.inFlight ||
      checkpoint.segmentId !== this.inFlight.segmentId ||
      checkpoint.sessionId !== this.sessionId ||
      checkpoint.sequence !== this.inFlight.baseSequence + this.inFlight.commands.length
    )
      throw new Error('Confirmação de experiência inválida.')
    this.confirmed = checkpoint
    this.pending.splice(0, this.inFlight.commands.length)
    this.inFlight = null
  }
  previewConfirm(): LearningAnswers {
    this.segment()
    if (this.inFlight)
      this.acknowledge(
        experienceAnswers(
          this.activity,
          applyExperienceSegment(this.activity, this.confirmed, this.inFlight),
        ),
      )
    return this.answers()
  }
  answers(): LearningAnswers {
    return this.confirmed ? experienceAnswers(this.activity, this.confirmed) : {}
  }
  draft(): ExperienceDraft {
    return {
      confirmed: this.answers(),
      pending: [...this.pending],
      inFlight: this.inFlight,
      sessionId: this.sessionId,
    }
  }
  restore(value: unknown): boolean {
    if (
      !value ||
      typeof value !== 'object' ||
      !('confirmed' in value) ||
      !('pending' in value) ||
      !('sessionId' in value) ||
      value.sessionId !== this.sessionId ||
      !Array.isArray(value.pending) ||
      !value.pending.every((c) => isExperienceCommand(c, this.activity))
    )
      return false
    const confirmed = value.confirmed
    if (!isLearningAnswers(confirmed)) return false
    const checkpoint = readExperienceCheckpoint(this.activity, confirmed)
    const rawFlight = 'inFlight' in value ? value.inFlight : null
    let flight: ExperienceSegment | null = null
    if (rawFlight !== null) {
      if (
        !rawFlight ||
        typeof rawFlight !== 'object' ||
        !('sessionId' in rawFlight) ||
        !('segmentId' in rawFlight) ||
        !('baseSequence' in rawFlight) ||
        !('commands' in rawFlight) ||
        !Array.isArray(rawFlight.commands)
      )
        return false
      const candidate = {
        experienceVersion: 3,
        sessionId: rawFlight.sessionId,
        segmentId: rawFlight.segmentId,
        baseSequence: rawFlight.baseSequence,
        commands: rawFlight.commands.map((c) => JSON.stringify(c)),
      }
      if (!isLearningAnswers(candidate)) return false
      flight = readExperienceSegment(this.activity, candidate)
      if (
        !flight ||
        flight.sessionId !== this.sessionId ||
        flight.baseSequence !== (checkpoint?.sequence ?? 0) ||
        JSON.stringify(flight.commands) !==
          JSON.stringify(value.pending.slice(0, flight.commands.length))
      )
        return false
    }
    let base = checkpoint
    let pending = [...value.pending]
    if (this.confirmed && this.confirmed.sequence > (checkpoint?.sequence ?? 0)) {
      if (
        !flight ||
        flight.segmentId !== this.confirmed.segmentId ||
        flight.sessionId !== this.confirmed.sessionId ||
        flight.baseSequence + flight.commands.length !== this.confirmed.sequence
      )
        return false
      pending = pending.slice(flight.commands.length)
      flight = null
      base = this.confirmed
    }
    let snapshot = base?.session ?? initialExperience(this.activity)
    for (const command of pending)
      snapshot = stepExperience(this.activity, snapshot, command).session
    this.confirmed = base
    this.pending = pending
    this.inFlight = flight
    this.snapshot = snapshot
    for (const listener of this.listeners) listener()
    return true
  }
}

const DB = 'sz-experience-v3'
async function draftStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore('drafts')
    }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction('drafts', mode)
      const result = run(tx.objectStore('drafts'))
      tx.oncomplete = () => {
        db.close()
        resolve(result.result)
      }
      tx.onerror = tx.onabort = () => {
        db.close()
        reject(tx.error)
      }
    }
  })
}
export const readExperienceDraft = (key: string) =>
  draftStore<unknown>('readonly', (store) => store.get(key))
export const writeExperienceDraft = (key: string, draft: ExperienceDraft) =>
  draftStore('readwrite', (store) => store.put(draft, key))

export const archiveExperienceDraft = (key: string, draft: unknown) =>
  draftStore('readwrite', (store) => store.put(draft, `${key}:conflict:${Date.now()}`))
