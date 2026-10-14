import type {
  LiveMediaDescription,
  LiveMediaJoin,
  LiveMediaKind,
  LiveMediaNegotiation,
  LiveMediaPublication,
} from '@sistemazero/core/live'
import {
  assertSfuTrackResult,
  type CloudflareSfuClient,
  type SfuResponse,
} from './cloudflare-sfu.client'
import {
  canPublishLiveKind,
  canReceiveLivePublication,
  isDefinitiveDenial,
  type LiveMediaAccess,
  type LiveMediaActor,
  type LiveMediaAuthorizationPort,
  type LiveMediaAuthorizationResult,
  type LiveMediaConnection,
  LiveMediaError,
  type LiveMediaRegistryPort,
  type LiveMediaResource,
} from './media-registry'

export interface LiveMediaSupervisorPort {
  /** Must be durably registered before a connection may distribute media. */
  register(connection: LiveMediaConnection): Promise<void>
  renew(connection: LiveMediaConnection): Promise<void>
  retire(connection: LiveMediaConnection): Promise<void>
}

type Context = { actor: LiveMediaActor; occurrenceId: string; deviceId: string }

/** Long enough for a full reconcile; a crashed replica's lease is taken over after it. */
const RECONCILE_LEASE_MS = 60_000

export class CloudflareSfuMediaProvider {
  readonly controlLeaseMs = 15_000
  /** One reconcile per occurrence at a time in this process; later requests coalesce. */
  private readonly reconciling = new Map<string, { again: boolean; done: Promise<void> }>()
  private readonly retryTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly holder = crypto.randomUUID()

  constructor(
    private readonly sfu: CloudflareSfuClient,
    private readonly registry: LiveMediaRegistryPort,
    private readonly authorization: LiveMediaAuthorizationPort,
    private readonly supervisor: LiveMediaSupervisorPort,
    private readonly iceServers: (hardEndsAt: string) => Promise<LiveMediaJoin['iceServers']>,
    private readonly now: () => number = Date.now,
    private readonly operationTimeoutMs = 12_000,
    /** How long a reconcile waits for another replica's lease before leaving it to the next one. */
    private readonly leaseWaitMs = 5_000,
  ) {}

  async join(context: Context, attemptId: string): Promise<LiveMediaJoin> {
    const access = await this.access(context)
    // An attempt is never replayed against the provider, even when its response was lost.
    if (await this.registry.get(attemptId)) {
      throw new LiveMediaError('MEDIA_ATTEMPT_USED', 'Reconecte usando uma nova tentativa.')
    }
    let connection = await this.registry.insert({
      id: attemptId,
      occurrenceId: context.occurrenceId,
      actor: context.actor,
      deviceId: context.deviceId,
      role: access.role,
      generation: 0,
      sessionId: null,
      status: 'creating',
      createdAt: new Date(this.now()).toISOString(),
      leaseEndsAt: new Date(this.now() + this.controlLeaseMs).toISOString(),
      hardEndsAt: access.hardEndsAt,
      pending: null,
      resources: [],
      cleanupPending: false,
      uncertain: false,
    })
    try {
      await this.supervisor.register(connection)
      for (const old of await this.registry.list(context.occurrenceId)) {
        if (
          old.actor.id === context.actor.id &&
          old.id !== connection.id &&
          old.status === 'retired'
        ) {
          await this.cleanup(old.id)
        }
      }
      const response = await this.bounded(this.sfu.createSession(attemptId), async (late) => {
        if (late.sessionId) {
          await this.registry.mutate(attemptId, (saved) => {
            saved.sessionId = late.sessionId!
            saved.cleanupPending = true
          })
          await this.cleanup(attemptId)
        }
      })
      if (!response.sessionId)
        throw new LiveMediaError('MEDIA_SESSION_FAILED', 'Conexão incompleta.', 502)
      connection = await this.registry.mutate(attemptId, (saved) => {
        saved.sessionId = response.sessionId!
        saved.cleanupPending = true
        if (saved.status === 'creating') saved.status = 'active'
        return structuredClone(saved)
      })
      await this.supervisor.renew(connection)
      await this.assertCurrent(context, connection.id)
      return {
        connectionId: connection.id,
        generation: connection.generation,
        iceServers: await this.iceServers(access.hardEndsAt),
        controlLeaseMs: this.controlLeaseMs,
      }
    } catch (error) {
      await this.retire(connection.id, true)
      throw error
    }
  }

  /**
   * What this receiver may subscribe to. The receiver and every publisher are authorized on
   * ONE room snapshot (one load per poll, not one per publisher). Only a definitive denial
   * retires a publisher; a failed snapshot read fails this poll and retires nobody.
   */
  async publications(context: Context): Promise<LiveMediaPublication[]> {
    const candidates: LiveMediaConnection[] = []
    for (const connection of await this.registry.list(context.occurrenceId)) {
      if (connection.status !== 'active' || connection.actor.id === context.actor.id) continue
      if (
        Date.parse(connection.leaseEndsAt) <= this.now() ||
        Date.parse(connection.hardEndsAt) <= this.now()
      ) {
        await this.retire(connection.id)
        continue
      }
      candidates.push(connection)
    }
    const [receiver, ...publishers] = await this.authorization.authorizeMany(context.occurrenceId, [
      { actor: context.actor, deviceId: context.deviceId },
      ...candidates.map((connection) => ({
        actor: connection.actor,
        deviceId: connection.deviceId,
      })),
    ])
    if (!receiver?.ok)
      throw receiver?.error ?? new LiveMediaError('MEDIA_FORBIDDEN', 'Sem acesso à sala.', 403)
    const results: LiveMediaPublication[] = []
    for (const [index, connection] of candidates.entries()) {
      const outcome = publishers[index]
      if (!outcome?.ok) {
        if (outcome && isDefinitiveDenial(outcome.error)) await this.retire(connection.id)
        continue
      }
      const publisher = outcome.access
      for (const resource of connection.resources) {
        if (
          resource.direction === 'local' &&
          resource.state === 'active' &&
          canReceiveLivePublication(receiver.access.role, resource.publication) &&
          canPublishLiveKind(publisher, resource.publication.kind) &&
          (resource.publication.kind !== 'microphone' || resource.muteEpoch === publisher.muteEpoch)
        )
          results.push(
            publisher.displayName
              ? { ...resource.publication, displayName: publisher.displayName }
              : resource.publication,
          )
      }
    }
    return results
  }

  async publish(
    context: Context,
    input: {
      connectionId: string
      operationId: string
      kind: LiveMediaKind
      mid: string
      sessionDescription: LiveMediaDescription
    },
  ): Promise<LiveMediaNegotiation> {
    const access = await this.access(context)
    if (!canPublishLiveKind(access, input.kind))
      throw new LiveMediaError('MEDIA_FORBIDDEN', 'Esta publicação está bloqueada.', 403)
    // Never accept extra audio sections disguised as a screen/camera publication.
    this.validatePublicationSdp(input.sessionDescription, input.mid, input.kind)
    const connection = await this.begin(context, input.connectionId, input.operationId)
    if (
      connection.resources.some(
        (r) => r.direction === 'local' && r.state !== 'closed' && r.publication.kind === input.kind,
      )
    ) {
      await this.retire(connection.id)
      throw new LiveMediaError(
        'MEDIA_DUPLICATE_TRACK',
        'Reconecte antes de substituir esta trilha.',
      )
    }
    const publication: LiveMediaPublication = {
      id: crypto.randomUUID(),
      actorId: context.actor.id,
      role: access.role,
      kind: input.kind,
      simulcast:
        input.kind !== 'microphone' &&
        input.sessionDescription.sdp
          .split(/\r?\nm=/)
          .some(
            (section) =>
              section.split(/\r?\n/).includes(`a=mid:${input.mid}`) &&
              section.includes('a=simulcast:send'),
          ),
    }
    return this.allocate(
      connection,
      input.operationId,
      () =>
        this.sfu.newTracks(connection.sessionId!, {
          sessionDescription: input.sessionDescription,
          tracks: [{ location: 'local', mid: input.mid, trackName: publication.id }],
        }),
      (response) => {
        const result = assertSfuTrackResult(response, input.mid)
        return {
          mid: result.mid!,
          direction: 'local',
          publication,
          publisherSessionId: connection.sessionId!,
          trackName: publication.id,
          state: 'negotiating',
          muteEpoch: access.muteEpoch,
        }
      },
    )
  }

  async subscribe(
    context: Context,
    input: {
      connectionId: string
      operationId: string
      publicationId: string
      quality: 'thumbnail' | 'full'
    },
  ): Promise<LiveMediaNegotiation> {
    const visible = await this.publications(context)
    if (!visible.some((item) => item.id === input.publicationId))
      throw new LiveMediaError('MEDIA_FORBIDDEN', 'Esta tela não está disponível.', 403)
    const connections = await this.registry.list(context.occurrenceId)
    const source = connections
      .flatMap((item) => item.resources)
      .find(
        (item) =>
          item.publication.id === input.publicationId &&
          item.direction === 'local' &&
          item.state === 'active',
      )
    if (!source) throw new LiveMediaError('MEDIA_TRACK_GONE', 'A trilha foi encerrada.')
    const connection = await this.begin(context, input.connectionId, input.operationId)
    return this.allocate(
      connection,
      input.operationId,
      () =>
        this.sfu.newTracks(connection.sessionId!, {
          tracks: [
            {
              location: 'remote',
              sessionId: source.publisherSessionId,
              trackName: source.trackName,
              ...(source.publication.simulcast
                ? {
                    simulcast: {
                      preferredRid: input.quality === 'thumbnail' ? 'q' : 'f',
                      priorityOrdering: 'asciibetical',
                      ridNotAvailable: 'asciibetical',
                    },
                  }
                : {}),
            },
          ],
        }),
      (response) => {
        const result = assertSfuTrackResult(response)
        return { ...source, direction: 'remote', mid: result.mid!, state: 'negotiating' }
      },
    )
  }

  async complete(
    context: Context,
    input: { connectionId: string; operationId: string; sessionDescription?: LiveMediaDescription },
  ): Promise<void> {
    const connection = await this.assertCurrent(context, input.connectionId)
    const pending = await this.registry.mutate(connection.id, (saved) => {
      this.assertActive(saved)
      if (
        !saved.pending ||
        saved.pending.id !== input.operationId ||
        !['awaiting-answer', 'awaiting-applied'].includes(saved.pending.state)
      )
        throw new LiveMediaError('MEDIA_STALE_OPERATION', 'Negociação vencida.')
      const current = structuredClone(saved.pending)
      saved.pending.state = 'completing'
      return current
    })
    try {
      if (pending.state === 'awaiting-answer') {
        if (input.sessionDescription?.type !== 'answer')
          throw new LiveMediaError('MEDIA_ANSWER_REQUIRED', 'Resposta de conexão ausente.', 400)
        await this.bounded(
          this.sfu.answer(connection.sessionId!, input.sessionDescription),
          async () => this.cleanup(connection.id),
        )
      } else if (pending.state !== 'awaiting-applied' || input.sessionDescription) {
        throw new LiveMediaError('MEDIA_STALE_OPERATION', 'Negociação fora de ordem.')
      }
      const access = await this.access(context)
      if (
        pending.publication &&
        !canPublishLiveKind(access, pending.publication.kind) &&
        pending.publication.actorId === context.actor.id
      )
        throw new LiveMediaError('MEDIA_FORBIDDEN', 'A publicação foi bloqueada.', 403)
      if (
        pending.publication &&
        pending.publication.actorId !== context.actor.id &&
        !(await this.publications(context)).some((item) => item.id === pending.publication!.id)
      )
        throw new LiveMediaError('MEDIA_FORBIDDEN', 'A publicação foi encerrada.', 403)
      if (
        pending.publication?.kind === 'microphone' &&
        connection.resources.find((item) => item.mid === pending.mid)?.muteEpoch !==
          access.muteEpoch &&
        pending.publication.actorId === context.actor.id
      )
        throw new LiveMediaError('MEDIA_FORBIDDEN', 'O microfone foi silenciado.', 403)
      const saved = await this.registry.mutate(connection.id, (current) => {
        this.assertActive(current)
        if (current.pending?.id !== input.operationId)
          throw new LiveMediaError('MEDIA_STALE_OPERATION', 'Negociação vencida.')
        for (const resource of current.resources)
          if (resource.mid === current.pending.mid) resource.state = 'active'
        current.pending = null
        current.leaseEndsAt = new Date(this.now() + this.controlLeaseMs).toISOString()
        return structuredClone(current)
      })
      await this.supervisor.renew(saved)
    } catch (error) {
      await this.retire(connection.id, true)
      throw error
    }
  }

  async heartbeat(context: Context, connectionId: string): Promise<void> {
    const connection = await this.assertCurrent(context, connectionId)
    const saved = await this.registry.mutate(connection.id, (current) => {
      this.assertActive(current)
      current.leaseEndsAt = new Date(this.now() + this.controlLeaseMs).toISOString()
      return structuredClone(current)
    })
    await this.supervisor.renew(saved)
    await this.reconcile(context.occurrenceId)
  }

  async close(context: Context, connectionId: string): Promise<void> {
    const saved = await this.registry.get(connectionId)
    // Leaving is permitted even after access expired, but never for another identity.
    if (
      !saved ||
      saved.actor.id !== context.actor.id ||
      saved.deviceId !== context.deviceId ||
      saved.occurrenceId !== context.occurrenceId
    )
      throw new LiveMediaError('MEDIA_FORBIDDEN', 'Conexão não encontrada.', 403)
    await this.retire(connectionId)
  }

  async unpublish(context: Context, connectionId: string, kind: LiveMediaKind): Promise<void> {
    await this.remove(
      context,
      connectionId,
      (resource) => resource.direction === 'local' && resource.publication.kind === kind,
    )
  }

  async unsubscribe(context: Context, connectionId: string, publicationId: string): Promise<void> {
    await this.remove(
      context,
      connectionId,
      (resource) => resource.direction === 'remote' && resource.publication.id === publicationId,
    )
  }

  private async remove(
    context: Context,
    connectionId: string,
    predicate: (resource: LiveMediaResource) => boolean,
  ): Promise<void> {
    const operationId = crypto.randomUUID()
    const connection = await this.begin(context, connectionId, operationId)
    try {
      await this.closeResources(
        connection,
        connection.resources
          .filter((resource) => resource.state !== 'closed' && predicate(resource))
          .map((resource) => resource.mid),
      )
      await this.registry.mutate(connectionId, (saved) => {
        if (saved.pending?.id === operationId) saved.pending = null
      })
    } catch (error) {
      await this.retire(connectionId, true)
      throw error
    }
  }

  /**
   * Serialized per occurrence: one run at a time in this process (requests that arrive
   * meanwhile coalesce into one more run) and, across replicas, a short database lease.
   */
  async reconcile(occurrenceId: string): Promise<void> {
    const running = this.reconciling.get(occurrenceId)
    if (running) {
      running.again = true
      return running.done
    }
    const state = { again: true, done: Promise.resolve() }
    this.reconciling.set(occurrenceId, state)
    state.done = (async () => {
      try {
        while (state.again) {
          state.again = false
          await this.reconcileExclusive(occurrenceId)
        }
      } finally {
        this.reconciling.delete(occurrenceId)
      }
    })()
    return state.done
  }

  private async reconcileExclusive(occurrenceId: string): Promise<void> {
    const deadline = this.now() + this.leaseWaitMs
    while (!(await this.registry.tryLease(occurrenceId, this.holder, RECONCILE_LEASE_MS))) {
      // Another replica is reconciling this room; the next heartbeat brings us back.
      if (this.now() >= deadline) return
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
    try {
      await this.reconcileOnce(occurrenceId)
    } finally {
      await this.registry.releaseLease(occurrenceId, this.holder).catch(() => undefined)
    }
  }

  private async reconcileOnce(occurrenceId: string): Promise<void> {
    const active: LiveMediaConnection[] = []
    for (const connection of await this.registry.list(occurrenceId)) {
      if (connection.status === 'closed') continue
      if (
        connection.status !== 'active' ||
        Date.parse(connection.leaseEndsAt) <= this.now() ||
        Date.parse(connection.hardEndsAt) <= this.now()
      ) {
        await this.retire(connection.id).catch(() => undefined)
        continue
      }
      active.push(connection)
    }
    if (!active.length) return
    let results: LiveMediaAuthorizationResult[]
    try {
      results = await this.authorization.authorizeMany(
        occurrenceId,
        active.map((connection) => ({ actor: connection.actor, deviceId: connection.deviceId })),
      )
    } catch {
      // The room could not be read: a transient failure never retires a working connection.
      return
    }
    let skipped = false
    for (const [index, connection] of active.entries()) {
      const outcome = results[index]
      try {
        if (!outcome?.ok) {
          if (outcome && isDefinitiveDenial(outcome.error)) await this.retire(connection.id)
          continue
        }
        const access = outcome.access
        const forbidden = connection.resources.filter(
          (resource) =>
            resource.direction === 'local' &&
            resource.state !== 'closed' &&
            (!canPublishLiveKind(access, resource.publication.kind) ||
              (resource.publication.kind === 'microphone' &&
                resource.muteEpoch !== access.muteEpoch)),
        )
        if (!forbidden.length) continue
        if (connection.pending) {
          // A negotiation in flight finishes (its completion re-checks the policy) and the next
          // cycle closes the track; only an abandoned negotiation retires the connection.
          if (
            this.now() - Date.parse(connection.pending.startedAt) <
            this.operationTimeoutMs + 3_000
          ) {
            skipped = true
            continue
          }
          await this.retire(connection.id)
          continue
        }
        // Close only the forbidden tracks: the child keeps hearing the teacher.
        const closed = await this.closeLocal(
          connection.id,
          forbidden.map((resource) => resource.mid),
        )
        if (!closed) skipped = true
      } catch {
        // Provider or registry trouble: keep the connection; the next cycle retries.
        skipped = true
      }
    }
    if (skipped) this.retrySoon(occurrenceId)
  }

  private retrySoon(occurrenceId: string): void {
    if (this.retryTimers.has(occurrenceId)) return
    const timer = setTimeout(() => {
      this.retryTimers.delete(occurrenceId)
      void this.reconcile(occurrenceId).catch(() => undefined)
    }, 1_000)
    if (typeof timer === 'object' && 'unref' in timer) timer.unref()
    this.retryTimers.set(occurrenceId, timer)
  }

  /** Server-initiated close of some local tracks; false when a negotiation got there first. */
  private async closeLocal(connectionId: string, mids: string[]): Promise<boolean> {
    const operationId = crypto.randomUUID()
    let connection: LiveMediaConnection
    try {
      connection = await this.registry.mutate(connectionId, (saved) => {
        this.assertActive(saved)
        if (saved.pending)
          throw new LiveMediaError(
            'MEDIA_NEGOTIATION_PENDING',
            'A conexão está terminando outra operação.',
          )
        saved.pending = {
          id: operationId,
          state: 'requesting',
          startedAt: new Date(this.now()).toISOString(),
        }
        return structuredClone(saved)
      })
    } catch (error) {
      if (error instanceof LiveMediaError && error.code === 'MEDIA_NEGOTIATION_PENDING')
        return false
      throw error
    }
    try {
      await this.closeResources(connection, mids)
      await this.registry.mutate(connectionId, (saved) => {
        if (saved.pending?.id === operationId) saved.pending = null
      })
      return true
    } catch (error) {
      await this.retire(connectionId, true)
      throw error
    }
  }

  private async begin(
    context: Context,
    id: string,
    operationId: string,
  ): Promise<LiveMediaConnection> {
    await this.assertCurrent(context, id)
    return this.registry.mutate(id, (saved) => {
      this.assertActive(saved)
      if (saved.pending)
        throw new LiveMediaError(
          'MEDIA_NEGOTIATION_PENDING',
          'A conexão está terminando outra operação.',
        )
      saved.pending = {
        id: operationId,
        state: 'requesting',
        startedAt: new Date(this.now()).toISOString(),
      }
      return structuredClone(saved)
    })
  }

  private async allocate(
    connection: LiveMediaConnection,
    operationId: string,
    request: () => Promise<SfuResponse>,
    resource: (response: SfuResponse) => LiveMediaResource,
  ): Promise<LiveMediaNegotiation> {
    try {
      const response = await this.bounded(request(), async (late) => {
        await this.retainAllocations(connection.id, late)
        await this.cleanup(connection.id)
      })
      // Save successful mids even if another result/SDP is invalid.
      await this.retainAllocations(connection.id, response)
      const allocated = resource(response)
      if (
        !response.sessionDescription ||
        !['offer', 'answer'].includes(response.sessionDescription.type)
      )
        throw new LiveMediaError(
          'MEDIA_SDP_MISSING',
          'A transmissão não completou a negociação.',
          502,
        )
      const saved = await this.registry.mutate(connection.id, (current) => {
        this.assertActive(current)
        if (current.pending?.id !== operationId)
          throw new LiveMediaError('MEDIA_STALE_OPERATION', 'Negociação vencida.')
        current.resources = current.resources.filter((item) => item.mid !== allocated.mid)
        current.resources.push(allocated)
        current.pending = {
          ...current.pending,
          state:
            response.sessionDescription!.type === 'offer' ? 'awaiting-answer' : 'awaiting-applied',
          description: response.sessionDescription,
          mid: allocated.mid,
          publication: allocated.publication,
        }
        return structuredClone(current)
      })
      await this.supervisor.renew(saved)
      return {
        operationId,
        sessionDescription: response.sessionDescription,
        requiresAnswer: response.sessionDescription.type === 'offer',
        mid: allocated.mid,
        publication: allocated.publication,
      }
    } catch (error) {
      await this.retire(connection.id, true)
      throw error
    }
  }

  private async retainAllocations(id: string, result: SfuResponse): Promise<void> {
    await this.registry.mutate(id, (saved) => {
      for (const track of result.tracks ?? []) {
        if (!track.mid || track.errorCode) continue
        const existing = saved.resources.find((r) => r.mid === track.mid)
        if (existing) {
          if (track.status === 'inactive') existing.state = 'closed'
          else if (track.status === 'active' && existing.state === 'closed')
            existing.state = 'closing'
          continue
        }
        saved.resources.push({
          mid: track.mid,
          direction: 'remote',
          publication: {
            id: track.trackName ?? crypto.randomUUID(),
            actorId: saved.actor.id,
            role: saved.role,
            kind: 'camera',
            simulcast: false,
          },
          publisherSessionId: track.sessionId ?? saved.sessionId ?? '',
          trackName: track.trackName ?? '',
          state: track.status === 'inactive' ? 'closed' : 'closing',
          muteEpoch: 0,
        })
      }
      saved.cleanupPending = true
    })
  }

  private async retire(id: string, uncertain = false): Promise<void> {
    const connection = await this.registry.mutate(id, (saved) => {
      saved.status = 'retired'
      saved.cleanupPending = true
      saved.uncertain ||= uncertain
      return structuredClone(saved)
    })
    await this.supervisor.retire(connection).catch(() => undefined)
    await this.cleanup(id)
  }

  /** Unconfirmed closures stay durable for the independent supervisor and later reconciliation. */
  async cleanup(id: string): Promise<void> {
    const saved = await this.registry.get(id)
    if (!saved?.sessionId || saved.status === 'active') return
    try {
      const snapshot = await this.bounded(this.sfu.inspect(saved.sessionId), async () => undefined)
      await this.retainAllocations(id, snapshot)
      const current = (await this.registry.get(id))!
      await this.closeResources(
        current,
        current.resources.filter((item) => item.state !== 'closed').map((item) => item.mid),
      )
      await this.registry.mutate(id, (connection) => {
        if (
          connection.resources.every((item) => item.state === 'closed') &&
          !connection.uncertain
        ) {
          connection.status = 'closed'
          connection.cleanupPending = false
        }
      })
    } catch {
      /* Keep cleanupPending; never turn a failed close into success. */
    }
  }

  private async closeResources(connection: LiveMediaConnection, mids: string[]): Promise<void> {
    if (!mids.length || !connection.sessionId) return
    const response = await this.bounded(
      this.sfu.closeTracks(connection.sessionId, mids),
      async (late) => this.markClosed(connection.id, late),
    )
    await this.markClosed(connection.id, response)
    if (mids.some((mid) => !response.tracks?.some((item) => item.mid === mid && !item.errorCode)))
      throw new LiveMediaError(
        'MEDIA_CLOSE_INCOMPLETE',
        'A transmissão ainda não confirmou o encerramento.',
        502,
      )
  }

  private async markClosed(id: string, response: SfuResponse): Promise<void> {
    await this.registry.mutate(id, (connection) => {
      for (const track of response.tracks ?? []) {
        if (track.errorCode) continue
        const resource = connection.resources.find((item) => item.mid === track.mid)
        if (resource) resource.state = 'closed'
      }
    })
  }

  private async assertCurrent(context: Context, id: string): Promise<LiveMediaConnection> {
    await this.access(context)
    const saved = await this.registry.get(id)
    if (
      !saved ||
      saved.actor.id !== context.actor.id ||
      saved.occurrenceId !== context.occurrenceId ||
      saved.deviceId !== context.deviceId
    )
      throw new LiveMediaError('MEDIA_FORBIDDEN', 'Conexão não autorizada.', 403)
    this.assertActive(saved)
    return saved
  }

  private assertActive(connection: LiveMediaConnection): void {
    if (
      connection.status !== 'active' ||
      !connection.sessionId ||
      Date.parse(connection.hardEndsAt) <= this.now() ||
      Date.parse(connection.leaseEndsAt) <= this.now()
    )
      throw new LiveMediaError('MEDIA_CONNECTION_RETIRED', 'Reconecte para continuar na sala.')
  }

  private access(context: Context): Promise<LiveMediaAccess> {
    return this.authorization.authorize(context.actor, context.occurrenceId, context.deviceId)
  }

  private validatePublicationSdp(
    description: LiveMediaDescription,
    mid: string,
    kind: LiveMediaKind,
  ): void {
    if (description.type !== 'offer' || description.sdp.length > 256_000)
      throw new LiveMediaError('MEDIA_INVALID_SDP', 'Negociação inválida.', 400)
    const section = description.sdp
      .split(/\r?\nm=/)
      .slice(1)
      .find((part) => part.split(/\r?\n/).includes(`a=mid:${mid}`))
    const expected = kind === 'microphone' ? 'audio ' : 'video '
    if (!section?.startsWith(expected))
      throw new LiveMediaError('MEDIA_INVALID_TRACK', 'Tipo de trilha inválido.', 400)
  }

  private async bounded<T>(operation: Promise<T>, onLate: (value: T) => Promise<void>): Promise<T> {
    let timedOut = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const observed = operation.then(async (value) => {
      if (timedOut) await onLate(value)
      return value
    })
    // Observe late failures too; the durable retired state remains unresolved.
    observed.catch(() => undefined)
    try {
      return await Promise.race([
        observed,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            timedOut = true
            reject(
              new LiveMediaError(
                'MEDIA_UNCERTAIN',
                'A conexão não respondeu. Reconecte para tentar novamente.',
                504,
              ),
            )
          }, this.operationTimeoutMs)
        }),
      ])
    } finally {
      clearTimeout(timer)
    }
  }
}
