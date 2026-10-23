import { assistanceRequestExpired, type LiveRecordingState } from '@sistemazero/core/live'
import { and, eq, isNotNull, isNull, lte, ne, or, sql } from 'drizzle-orm'
import type { LiveService } from '../../application/live/live.service'
import { LiveConflictError } from '../../domain/live/live.errors'
import {
  type LiveRecordingSegmentTime,
  recordingSegmentsOf,
} from '../../domain/live/recording-chapters'
import type { LiveActor, LiveRepository } from '../../domain/ports/live-repository.port'
import type { Database } from '../persistence/drizzle/db'
import { liveRecordingJobs, liveWorkspaces } from '../persistence/drizzle/schema'
import { DrizzleLiveMediaRegistry } from './drizzle-media-registry'
import { canReceiveLivePublication, LiveMediaError } from './media-registry'

export interface OwnRecordingConfiguration {
  url: string
  token: string
}
export interface RecordingEvent {
  jobId: string
  occurrenceId: string
  generation: number
  eventSequence: number
  state: 'starting' | 'recording' | 'paused' | 'processing' | 'review' | 'failed'
  manifestKey: string
  replayKey: string | null
  error: string | null
  captureStopped: boolean
}
type RecordingJobRow = typeof liveRecordingJobs.$inferSelect
type SendResult = {
  captureStopped?: boolean
  jobId?: string
  state?: string
  segments?: unknown[]
}

/** Every command leases capture for 20 s; the recorder pauses itself when the lease ends. */
const COMMAND_LEASE_MS = 20_000
/** The recorder checks its lease every 3 s and stops capture first; this covers both. */
const LEASE_STOP_MARGIN_MS = 15_000
/** Without any acknowledgement for this long, the room shows "unavailable", never "recording". */
const UNCONFIRMED_AFTER_MS = 30_000
/** After the occurrence ended, failed syncs back off exponentially and finally give up. */
const RETRY_BASE_MS = 5_000
const RETRY_MAX_MS = 10 * 60_000
const MAX_ATTEMPTS = 8
const SYNC_CONCURRENCY = 4
const CAPTURING: LiveRecordingState[] = ['starting', 'recording', 'processing', 'failed']

/** Members owns desired state. Only authenticated receiver evidence advances confirmed state. */
export class OwnRecordingProvider {
  private readonly registry: DrizzleLiveMediaRegistry
  private timer: ReturnType<typeof setInterval> | null = null
  private reconciling = false
  private pendingReconciliation: Promise<void> | null = null
  constructor(
    private readonly db: Database,
    private readonly repository: LiveRepository,
    private readonly live: LiveService,
    private readonly config: OwnRecordingConfiguration,
    private readonly now: () => number = Date.now,
  ) {
    this.registry = new DrizzleLiveMediaRegistry(db)
    const url = new URL(config.url)
    if (!['http:', 'https:'].includes(url.protocol) || config.token.length < 32)
      throw new Error('Invalid private recorder configuration')
  }

  /** Recording only: the deadline sweep runs in its own loop and never waits for the recorder. */
  start(): () => Promise<void> {
    if (!this.timer)
      this.timer = setInterval(() => {
        if (this.reconciling) return
        this.reconciling = true
        this.pendingReconciliation = this.runCycle()
          .catch(() =>
            console.error('[live-recording] Reconciliation cycle failed; retry scheduled'),
          )
          .finally(() => {
            this.reconciling = false
            this.pendingReconciliation = null
          })
      }, 5000)
    return async () => {
      if (this.timer) clearInterval(this.timer)
      this.timer = null
      await this.pendingReconciliation
    }
  }

  /** Unfinished jobs whose backoff has elapsed (terminal ones are never retried). */
  async dueOccurrences(only?: string): Promise<string[]> {
    const jobs = await this.db
      .select({ occurrenceId: liveRecordingJobs.occurrenceId })
      .from(liveRecordingJobs)
      .where(
        and(
          only ? eq(liveRecordingJobs.occurrenceId, only) : undefined,
          ne(liveRecordingJobs.confirmedState, 'review'),
          isNull(liveRecordingJobs.finishedAt),
          or(
            isNull(liveRecordingJobs.nextAttemptAt),
            lte(liveRecordingJobs.nextAttemptAt, new Date(this.now())),
          ),
        ),
      )
      .limit(200)
    return jobs.map((job) => job.occurrenceId)
  }

  /** A few jobs at a time, so one slow recorder call never blocks all the others. */
  async runCycle(): Promise<void> {
    const queue = await this.dueOccurrences()
    await Promise.all(
      Array.from({ length: Math.min(SYNC_CONCURRENCY, queue.length) }, async () => {
        for (let next = queue.shift(); next; next = queue.shift())
          await this.syncOccurrence(next).catch(() =>
            console.error('[live-recording] Reconciliation failed; retry scheduled', {
              occurrenceId: next,
            }),
          )
      }),
    )
  }

  private async findJob(occurrenceId: string): Promise<RecordingJobRow | null> {
    const [job] = await this.db
      .select()
      .from(liveRecordingJobs)
      .where(eq(liveRecordingJobs.occurrenceId, occurrenceId))
    return job ?? null
  }

  /** Room state shown to people; failures here never break the recording coordination. */
  private async showState(
    occurrenceId: string,
    state: Exclude<LiveRecordingState, 'ready'>,
    storageKey?: string | null,
  ) {
    await this.live
      .setRecordingState(occurrenceId, {
        state,
        ...(storageKey !== undefined ? { storageKey } : {}),
      })
      .catch(() => undefined)
  }

  private async finish(
    occurrenceId: string,
    confirmedState: 'empty' | 'failed',
    error: string | null = null,
  ) {
    await this.db
      .update(liveRecordingJobs)
      .set({
        confirmedState,
        finishedAt: new Date(this.now()),
        nextAttemptAt: null,
        ...(error ? { error } : {}),
      })
      .where(eq(liveRecordingJobs.occurrenceId, occurrenceId))
    await this.showState(occurrenceId, confirmedState)
  }

  async syncOccurrence(occurrenceId: string): Promise<void> {
    const aggregate = await this.repository.findRoom({ occurrenceId })
    const occurrence = aggregate?.occurrences.find((item) => item.id === occurrenceId)
    if (!occurrence || !['live', 'ended', 'cancelled'].includes(occurrence.state)) return
    const existing = await this.findJob(occurrenceId)
    // An occurrence that never went live (reception closed, cancelled) has nothing to record.
    if (!existing && occurrence.state !== 'live' && !occurrence.conductorId) return
    if (existing?.finishedAt || existing?.confirmedState === 'review') return
    const job =
      existing ??
      (await this.ensureJob(occurrenceId, occurrence.state === 'live' ? 'recording' : 'stopped'))
    if (job.finishedAt || job.confirmedState === 'review') return
    const live = occurrence.state === 'live'
    if (!live) await this.setDesired(occurrenceId, 'stopped')
    let result: SendResult
    try {
      result = await this.send(occurrenceId)
    } catch (error) {
      await this.failed(occurrenceId, job, live, occurrence.recording.state)
      throw error
    }
    await this.db
      .update(liveRecordingJobs)
      .set({ attempts: 0, nextAttemptAt: null, confirmedAt: new Date(this.now()) })
      .where(eq(liveRecordingJobs.occurrenceId, occurrenceId))
    // The acknowledgement carries the manifest: its segments are the chapters' timeline.
    await this.keepSegments(occurrenceId, job, result.segments).catch(() => undefined)
    if (
      occurrence.recording.state === 'unavailable' &&
      result.state &&
      ['starting', 'recording', 'paused', 'processing'].includes(result.state)
    )
      await this.showState(occurrenceId, result.state as Exclude<LiveRecordingState, 'ready'>)
    if (
      !live &&
      result.state === 'failed' &&
      result.captureStopped === true &&
      Array.isArray(result.segments) &&
      result.segments.length === 0
    )
      await this.finish(occurrenceId, 'empty')
  }

  /** A failed sync: unavailable while live; after the end, backoff, `empty` or `failed`. */
  private async failed(
    occurrenceId: string,
    job: RecordingJobRow,
    live: boolean,
    shown: LiveRecordingState,
  ) {
    const attempts = job.attempts + 1
    if (!live) {
      const status = await this.status(occurrenceId)
      // "absent" only proves emptiness for a job the recorder never reported on; a recorder
      // that lost its local state must not turn real footage into "nothing recorded".
      const neverReported = job.version === 0 && !job.manifestKey
      if (
        status &&
        status.captureStopped === true &&
        ((status.absent === true && neverReported) ||
          (Array.isArray(status.segments) && !status.segments.length))
      )
        return this.finish(occurrenceId, 'empty')
      if (attempts >= MAX_ATTEMPTS)
        return this.finish(
          occurrenceId,
          'failed',
          'O gravador não confirmou o encerramento depois de várias tentativas.',
        )
    }
    const delay = live ? RETRY_BASE_MS : Math.min(RETRY_BASE_MS * 2 ** attempts, RETRY_MAX_MS)
    await this.db
      .update(liveRecordingJobs)
      .set({ attempts, nextAttemptAt: new Date(this.now() + delay) })
      .where(eq(liveRecordingJobs.occurrenceId, occurrenceId))
    const silent = job.confirmedAt
      ? this.now() - job.confirmedAt.getTime() >= UNCONFIRMED_AFTER_MS
      : attempts * RETRY_BASE_MS >= UNCONFIRMED_AFTER_MS
    if (['starting', 'recording', 'processing'].includes(shown) && silent)
      await this.showState(occurrenceId, 'unavailable')
  }

  /** Read-only probe with a short timeout; null when the recorder does not answer. */
  private async status(
    occurrenceId: string,
  ): Promise<(SendResult & { absent?: boolean; generation?: number; replayKey?: string }) | null> {
    try {
      const response = await fetch(
        `${this.config.url.replace(/\/$/, '')}/occurrences/${occurrenceId}`,
        {
          headers: { Authorization: `Bearer ${this.config.token}` },
          signal: AbortSignal.timeout(5000),
        },
      )
      return response.ok ? ((await response.json()) as SendResult & { absent?: boolean }) : null
    } catch {
      return null
    }
  }

  /**
   * The segment timeline of a recording, for the chapters of the published video. The private
   * recorder is asked first (its stored manifest is complete after the end); if it does not
   * answer for this exact job, the last timeline confirmed during the class is used.
   */
  async timeline(occurrenceId: string): Promise<LiveRecordingSegmentTime[] | null> {
    const job = await this.findJob(occurrenceId)
    if (!job) return null
    const status = await this.status(occurrenceId)
    if (status && status.jobId === job.jobId && status.generation === job.generation) {
      const fresh = await this.keepSegments(occurrenceId, job, status.segments)
      if (fresh) return fresh
    }
    return recordingSegmentsOf(job.segments)
  }

  /** Stores a longer confirmed timeline (never a shorter one: segments only accumulate). */
  private async keepSegments(occurrenceId: string, job: RecordingJobRow, raw: unknown) {
    const segments = recordingSegmentsOf(raw)
    if (!segments?.length) return null
    if (segments.length > (recordingSegmentsOf(job.segments)?.length ?? 0))
      await this.db
        .update(liveRecordingJobs)
        .set({ segments })
        .where(
          and(
            eq(liveRecordingJobs.occurrenceId, occurrenceId),
            eq(liveRecordingJobs.jobId, job.jobId),
            eq(liveRecordingJobs.generation, job.generation),
          ),
        )
    return segments
  }

  /**
   * Help (assistance) needs proof that nothing is being recorded. Proof is either an explicit
   * acknowledgement from the recorder or the capture lease contract: once the newest
   * `recording` lease ended (plus a margin) the recorder has paused itself. A recorder that is
   * down therefore blocks help for at most ~35 s, never for the rest of the class.
   */
  async confirmPaused(occurrenceId: string): Promise<void> {
    let job = await this.findJob(occurrenceId)
    // Never commanded: nothing was ever captured. Create it paused so no later sync starts a
    // capture while help is active (the sync also re-checks pending help under its lock).
    if (!job) {
      job = await this.ensureJob(occurrenceId, 'paused')
      if (job.commandVersion === 0) return
    }
    if (job.desiredState === 'recording') {
      await this.setDesired(occurrenceId, 'paused')
      job = (await this.findJob(occurrenceId)) ?? job
    }
    if (job.finishedAt && job.confirmedState !== 'review') return
    if (job.commandVersion === 0 && job.confirmedState !== 'review') return
    const lease = job.recordingLeaseEndsAt ?? job.leaseEndsAt
    if (lease.getTime() + LEASE_STOP_MARGIN_MS <= this.now()) {
      const aggregate = await this.repository.findRoom({ occurrenceId })
      const shown = aggregate?.occurrences.find((item) => item.id === occurrenceId)?.recording
      if (shown && CAPTURING.includes(shown.state))
        await this.showState(occurrenceId, 'unavailable')
      return
    }
    if (job.confirmedState === 'review') {
      // A finalized replay stays immutable. Historical DB state alone is not a pause proof:
      // require the private receiver to acknowledge the exact finalized generation again.
      const result = await this.status(occurrenceId)
      if (
        !result ||
        result.jobId !== job.jobId ||
        result.generation !== job.generation ||
        result.state !== 'review' ||
        result.captureStopped !== true ||
        !job.replayKey ||
        result.replayKey !== job.replayKey
      )
        throw new LiveMediaError(
          'RECORDING_PAUSE_UNCONFIRMED',
          'Não foi possível confirmar o encerramento da gravação finalizada.',
          503,
        )
      return
    }
    await this.setDesired(occurrenceId, 'paused')
    const result = await this.send(occurrenceId)
    // An error state by itself is never proof. Require an explicit acknowledgement from the receiver.
    if (result.captureStopped !== true || result.jobId === undefined)
      throw new LiveMediaError(
        'RECORDING_PAUSE_UNCONFIRMED',
        'Aguarde a confirmação de pausa da gravação.',
        503,
      )
    if (result.state === 'review') return
    await this.db
      .update(liveRecordingJobs)
      .set({ confirmedState: 'paused', confirmedAt: new Date(this.now()) })
      .where(eq(liveRecordingJobs.occurrenceId, occurrenceId))
    await this.live.setRecordingState(occurrenceId, { state: 'paused' })
  }

  async command(
    actor: LiveActor,
    sessionId: string,
    action: 'pause' | 'resume' | 'stop',
  ): Promise<void> {
    const aggregate = await this.repository.findRoom({ sessionId })
    const session = aggregate?.sessions.find((item) => item.id === sessionId)
    if (!aggregate || !session || !actor.staff || !aggregate.cohort.teacherIds.includes(actor.id))
      throw new LiveMediaError(
        'RECORDING_FORBIDDEN',
        'Somente a professora desta turma pode controlar a gravação.',
        403,
      )
    if (action === 'pause') return this.confirmPaused(session.occurrenceId)
    if (action === 'resume') {
      const pendingHelp = await this.db
        .select({ assistance: liveWorkspaces.assistance })
        .from(liveWorkspaces)
        .where(
          and(
            or(
              eq(liveWorkspaces.sessionId, sessionId),
              sql`${liveWorkspaces.assistance}->>'sessionId' = ${sessionId}`,
            ),
            isNotNull(liveWorkspaces.assistance),
          ),
        )
      if (pendingHelp.some((item) => !assistanceRequestExpired(item.assistance, new Date())))
        throw new LiveMediaError(
          'RECORDING_ASSISTANCE_ACTIVE',
          'Devolva o projeto ou cancele a ajuda antes de retomar a gravação.',
        )
    }
    const job = await this.ensureJob(
      session.occurrenceId,
      action === 'resume' ? 'recording' : 'stopped',
    )
    if (job.confirmedState === 'review' || job.finishedAt) {
      if (action === 'stop') return
      throw new LiveMediaError(
        'RECORDING_FINALIZED',
        'Esta gravação já foi finalizada. Preserve o replay deste encontro.',
        409,
      )
    }
    await this.setDesired(session.occurrenceId, action === 'resume' ? 'recording' : 'stopped')
    await this.send(session.occurrenceId)
  }

  /**
   * The job row lock covers only the job (validation and the confirmed state, all fast). The
   * room is updated AFTER the commit, from the job as it is then: two events racing still leave
   * the room on the newest confirmed state, and no cohort work ever waits inside the job lock.
   */
  async acceptEvent(event: RecordingEvent): Promise<void> {
    const accepted = await this.db.transaction(async (tx) => {
      const [job] = await tx
        .select()
        .from(liveRecordingJobs)
        .where(eq(liveRecordingJobs.occurrenceId, event.occurrenceId))
        .for('update')
      if (!job || job.jobId !== event.jobId || job.generation !== event.generation)
        throw new LiveMediaError('RECORDING_STALE_GENERATION', 'Geração de gravação inválida.', 409)
      // A replayed event (lost acknowledgement): the room is re-synced below, nothing else.
      if (event.eventSequence <= job.version) return true
      const prefix = `live/recordings/${event.occurrenceId}/${event.jobId}/${event.generation}/`
      if (
        !event.manifestKey.startsWith(prefix) ||
        (event.replayKey && !event.replayKey.startsWith(prefix))
      )
        throw new LiveMediaError('RECORDING_INVALID_ARTIFACT', 'Artefato fora da gravação.', 400)
      if (event.state === 'paused' && !event.captureStopped)
        throw new LiveMediaError('RECORDING_PAUSE_UNCONFIRMED', 'Captura ainda ativa.', 409)
      if (event.state === 'recording' && job.desiredState !== 'recording') return false
      await tx
        .update(liveRecordingJobs)
        .set({
          confirmedState: event.state,
          version: event.eventSequence,
          manifestKey: event.manifestKey,
          replayKey: event.replayKey,
          error: event.error,
          confirmedAt: new Date(this.now()),
          attempts: 0,
          nextAttemptAt: null,
          ...(event.state === 'review' ? { finishedAt: new Date(this.now()) } : {}),
        })
        .where(eq(liveRecordingJobs.occurrenceId, event.occurrenceId))
      return true
    })
    if (accepted) await this.syncRoomFromJob(event.occurrenceId)
  }

  /** The room shows the newest state the recorder confirmed (idempotent, outside any lock). */
  private async syncRoomFromJob(occurrenceId: string) {
    const job = await this.findJob(occurrenceId)
    if (!job || job.confirmedState === 'not_started') return
    try {
      await this.live.setRecordingState(occurrenceId, {
        state: job.confirmedState,
        storageKey: job.replayKey,
      })
    } catch (error) {
      // Published footage is immutable: a late event never rewrites what the teacher published.
      if (error instanceof LiveConflictError) return
      throw error
    }
  }

  private async ensureJob(
    occurrenceId: string,
    desiredState: RecordingJobRow['desiredState'],
  ): Promise<RecordingJobRow> {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`live-recording:${occurrenceId}`}, 0))`,
      )
      const [existing] = await tx
        .select()
        .from(liveRecordingJobs)
        .where(eq(liveRecordingJobs.occurrenceId, occurrenceId))
      if (existing) return existing
      const [job] = await tx
        .insert(liveRecordingJobs)
        .values({
          occurrenceId,
          jobId: crypto.randomUUID(),
          generation: 1,
          desiredState,
          leaseEndsAt: new Date(this.now() + COMMAND_LEASE_MS),
        })
        .returning()
      return job!
    })
  }

  private async setDesired(
    occurrenceId: string,
    desiredState: RecordingJobRow['desiredState'],
  ): Promise<void> {
    await this.db
      .update(liveRecordingJobs)
      .set({ desiredState })
      .where(eq(liveRecordingJobs.occurrenceId, occurrenceId))
  }

  private async send(occurrenceId: string): Promise<SendResult> {
    const aggregate = await this.repository.findRoom({ occurrenceId })
    const occurrence = aggregate?.occurrences.find((item) => item.id === occurrenceId)
    if (!aggregate || !occurrence)
      throw new LiveMediaError('RECORDING_JOB_MISSING', 'Encontro não encontrado.', 404)
    // The recording follows whoever started (conducts) this occurrence, not the list order.
    const conductor = occurrence.conductorId ?? aggregate.cohort.teacherIds[0]
    const sources: {
      role: 'teacher'
      kind: 'microphone' | 'camera' | 'demo'
      sessionId: string
      trackName: string
    }[] = []
    for (const connection of await this.registry.list(occurrenceId)) {
      if (
        connection.status !== 'active' ||
        connection.role !== 'teacher' ||
        connection.actor.id !== conductor ||
        !connection.sessionId ||
        Date.parse(connection.leaseEndsAt) <= this.now()
      )
        continue
      try {
        await this.live.authorizeMedia(connection.actor, occurrenceId, connection.deviceId)
      } catch {
        continue
      }
      for (const resource of connection.resources)
        if (
          resource.direction === 'local' &&
          resource.state === 'active' &&
          resource.publication.kind !== 'screen' &&
          canReceiveLivePublication('recorder', resource.publication) &&
          !sources.some((item) => item.kind === resource.publication.kind)
        )
          sources.push({
            role: 'teacher',
            kind: resource.publication.kind,
            sessionId: connection.sessionId,
            trackName: resource.trackName,
          })
    }
    const leaseEndsAt = new Date(this.now() + COMMAND_LEASE_MS)
    // Allocate order AND read the current desired state in one transaction. A delayed renewal
    // may never carry an older `recording` intent with a newer command number after a pause.
    const job = await this.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(liveRecordingJobs)
        .where(eq(liveRecordingJobs.occurrenceId, occurrenceId))
        .for('update')
      if (!current)
        throw new LiveMediaError('RECORDING_JOB_MISSING', 'Gravação não encontrada.', 404)
      // Recheck inside the command-order lock. A resume request may have passed its initial
      // check just before the child accepted help; it must not obtain a later recording command
      // after that acceptance's pause has been acknowledged.
      const helping =
        current.desiredState === 'recording'
          ? await tx
              .select({ assistance: liveWorkspaces.assistance })
              .from(liveWorkspaces)
              .where(
                and(
                  or(
                    eq(liveWorkspaces.sessionId, occurrence.sessionId),
                    sql`${liveWorkspaces.assistance}->>'sessionId' = ${occurrence.sessionId}`,
                  ),
                  isNotNull(liveWorkspaces.assistance),
                ),
              )
          : []
      const desiredState = helping.some(
        (item) => !assistanceRequestExpired(item.assistance, new Date()),
      )
        ? ('paused' as const)
        : current.desiredState
      const [updated] = await tx
        .update(liveRecordingJobs)
        .set({
          leaseEndsAt,
          commandVersion: current.commandVersion + 1,
          desiredState,
          // Upper bound of any capture the recorder may hold (sent ≠ acknowledged).
          ...(desiredState === 'recording' ? { recordingLeaseEndsAt: leaseEndsAt } : {}),
        })
        .where(eq(liveRecordingJobs.occurrenceId, occurrenceId))
        .returning()
      return updated!
    })
    const response = await fetch(
      `${this.config.url.replace(/\/$/, '')}/occurrences/${occurrenceId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: job.jobId,
          occurrenceId,
          generation: job.generation,
          commandId: crypto.randomUUID(),
          commandVersion: job.commandVersion,
          desiredState: job.desiredState,
          leaseEndsAt: leaseEndsAt.toISOString(),
          hardEndsAt:
            job.desiredState === 'recording'
              ? occurrence.hardEndsAt
              : new Date(this.now() + 60_000).toISOString(),
          sources,
        }),
        signal: AbortSignal.timeout(25_000),
      },
    )
    if (!response.ok)
      throw new LiveMediaError(
        'RECORDING_UNCONFIRMED',
        'O gravador ainda não confirmou a operação.',
        503,
      )
    const result = (await response.json()) as SendResult & {
      generation?: number
      commandVersion?: number
    }
    if (
      result.jobId !== job.jobId ||
      result.generation !== job.generation ||
      result.commandVersion !== job.commandVersion
    )
      throw new LiveMediaError(
        'RECORDING_STALE_GENERATION',
        'A resposta do gravador pertence a outra tentativa.',
        409,
      )
    return result
  }
}
