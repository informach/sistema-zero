import { assistanceRequestExpired } from '@sistemazero/core/live'
import { and, eq, isNotNull, ne, or, sql } from 'drizzle-orm'
import type { LiveService } from '../../application/live/live.service'
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
  ) {
    this.registry = new DrizzleLiveMediaRegistry(db)
    const url = new URL(config.url)
    if (!['http:', 'https:'].includes(url.protocol) || config.token.length < 32)
      throw new Error('Invalid private recorder configuration')
  }

  start(): () => Promise<void> {
    if (!this.timer)
      this.timer = setInterval(() => {
        if (this.reconciling) return
        this.reconciling = true
        this.pendingReconciliation = this.live
          .reconcileDeadlines()
          .then(() =>
            this.db
              .select()
              .from(liveRecordingJobs)
              .where(ne(liveRecordingJobs.confirmedState, 'review')),
          )
          .then(async (jobs) => {
            for (const job of jobs)
              await this.syncOccurrence(job.occurrenceId).catch(() =>
                console.error('[live-recording] Reconciliation failed; retry scheduled', {
                  occurrenceId: job.occurrenceId,
                }),
              )
          })
          .catch(() =>
            console.error('[live-recording] Deadline reconciliation failed; retry scheduled'),
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

  async syncOccurrence(occurrenceId: string): Promise<void> {
    const aggregate = await this.repository.findByOccurrence(occurrenceId)
    const occurrence = aggregate?.occurrences.find((item) => item.id === occurrenceId)
    if (!occurrence || !['live', 'ended', 'cancelled'].includes(occurrence.state)) return
    const job = await this.ensureJob(
      occurrenceId,
      occurrence.state === 'live' ? 'recording' : 'stopped',
    )
    if (['review'].includes(job.confirmedState)) return
    if (occurrence.state !== 'live') await this.setDesired(occurrenceId, 'stopped')
    await this.send(occurrenceId)
  }

  async confirmPaused(occurrenceId: string): Promise<void> {
    const existing = await this.ensureJob(occurrenceId, 'paused')
    if (existing.confirmedState === 'review') {
      // A finalized replay stays immutable. Historical DB state alone is not a pause proof:
      // require the private receiver to acknowledge the exact finalized generation again.
      const response = await fetch(
        `${this.config.url.replace(/\/$/, '')}/occurrences/${occurrenceId}`,
        {
          headers: { Authorization: `Bearer ${this.config.token}` },
          signal: AbortSignal.timeout(5000),
        },
      )
      const result = response.ok
        ? ((await response.json()) as {
            jobId?: string
            generation?: number
            state?: string
            captureStopped?: boolean
            replayKey?: string
          })
        : null
      if (
        !result ||
        result.jobId !== existing.jobId ||
        result.generation !== existing.generation ||
        result.state !== 'review' ||
        result.captureStopped !== true ||
        !existing.replayKey ||
        result.replayKey !== existing.replayKey
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
      .set({ confirmedState: 'paused' })
      .where(eq(liveRecordingJobs.occurrenceId, occurrenceId))
    await this.live.setRecordingState(occurrenceId, { state: 'paused' })
  }

  async command(
    actor: LiveActor,
    sessionId: string,
    action: 'pause' | 'resume' | 'stop',
  ): Promise<void> {
    const aggregate = await this.repository.findBySession(sessionId)
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
    if (job.confirmedState === 'review') {
      if (action === 'stop') return
      throw new LiveMediaError(
        'RECORDING_FINALIZED',
        'Esta gravação já foi finalizada. Preserve o replay desta aula.',
        409,
      )
    }
    await this.setDesired(session.occurrenceId, action === 'resume' ? 'recording' : 'stopped')
    await this.send(session.occurrenceId)
  }

  async acceptEvent(event: RecordingEvent): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [job] = await tx
        .select()
        .from(liveRecordingJobs)
        .where(eq(liveRecordingJobs.occurrenceId, event.occurrenceId))
        .for('update')
      if (!job || job.jobId !== event.jobId || job.generation !== event.generation)
        throw new LiveMediaError('RECORDING_STALE_GENERATION', 'Geração de gravação inválida.', 409)
      if (event.eventSequence <= job.version) return
      const prefix = `live/recordings/${event.occurrenceId}/${event.jobId}/${event.generation}/`
      if (
        !event.manifestKey.startsWith(prefix) ||
        (event.replayKey && !event.replayKey.startsWith(prefix))
      )
        throw new LiveMediaError('RECORDING_INVALID_ARTIFACT', 'Artefato fora da gravação.', 400)
      if (event.state === 'paused' && !event.captureStopped)
        throw new LiveMediaError('RECORDING_PAUSE_UNCONFIRMED', 'Captura ainda ativa.', 409)
      if (event.state === 'recording' && job.desiredState !== 'recording') return
      await this.live.setRecordingState(event.occurrenceId, {
        state: event.state,
        storageKey: event.replayKey,
      })
      await tx
        .update(liveRecordingJobs)
        .set({
          confirmedState: event.state,
          version: event.eventSequence,
          manifestKey: event.manifestKey,
          replayKey: event.replayKey,
          error: event.error,
        })
        .where(eq(liveRecordingJobs.occurrenceId, event.occurrenceId))
    })
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
          leaseEndsAt: new Date(Date.now() + 20_000),
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

  private async send(
    occurrenceId: string,
  ): Promise<{ captureStopped?: boolean; jobId?: string; state?: string }> {
    const aggregate = await this.repository.findByOccurrence(occurrenceId)
    const occurrence = aggregate?.occurrences.find((item) => item.id === occurrenceId)
    if (!aggregate || !occurrence)
      throw new LiveMediaError('RECORDING_JOB_MISSING', 'Encontro não encontrado.', 404)
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
        connection.actor.id !== aggregate.cohort.teacherIds[0] ||
        !connection.sessionId ||
        Date.parse(connection.leaseEndsAt) <= Date.now()
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
    const leaseEndsAt = new Date(Date.now() + 20_000)
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
      const [updated] = await tx
        .update(liveRecordingJobs)
        .set({
          leaseEndsAt,
          commandVersion: current.commandVersion + 1,
          ...(helping.some((item) => !assistanceRequestExpired(item.assistance, new Date()))
            ? { desiredState: 'paused' as const }
            : {}),
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
              : new Date(Date.now() + 60_000).toISOString(),
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
    const result = (await response.json()) as {
      captureStopped?: boolean
      jobId?: string
      generation?: number
      commandVersion?: number
      state?: string
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
