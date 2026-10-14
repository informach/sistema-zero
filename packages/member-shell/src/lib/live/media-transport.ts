'use client'

import type {
  LiveMediaJoin,
  LiveMediaKind,
  LiveMediaNegotiation,
  LiveMediaPublication,
  LiveMediaState,
} from '@sistemazero/core/live'

export interface LiveMediaTransportOptions {
  baseUrl: string
  deviceId: string
  onTrack(event: {
    publication: LiveMediaPublication
    track: MediaStreamTrack
    stream: MediaStream
  }): void
  onTrackRemoved?(publicationId: string): void
  onState(state: LiveMediaState): void
  onError(error: Error): void
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  createPeerConnection?: (configuration: RTCConfiguration) => RTCPeerConnection
}

/** One queue owns SDP, API requests, answer application and the backend acknowledgement. */
export class LiveMediaOperationQueue {
  private tail: Promise<unknown> = Promise.resolve()
  private retired = false

  run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.tail.then(() => {
      if (this.retired) throw new Error('Esta conexão foi encerrada.')
      return operation()
    })
    this.tail = result.catch(() => undefined)
    return result
  }

  retire(): void {
    this.retired = true
  }
}

/** Explicit joins never request or reactivate a camera, microphone or screen. */
export function createLiveMediaTransport(options: LiveMediaTransportOptions) {
  let peer: RTCPeerConnection | null = null
  let connection: LiveMediaJoin | null = null
  let generation = 0
  let queue = new LiveMediaOperationQueue()
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined
  let heartbeatPending = false
  let lastControlAt = 0
  let lastServerAt = 0
  let retired = true
  let focusedPublication: string | null = null
  const local = new Map<LiveMediaKind, RTCRtpTransceiver>()
  const subscriptions = new Map<
    string,
    {
      publication: LiveMediaPublication
      mid: string
      quality: 'thumbnail' | 'full'
      track?: MediaStreamTrack
    }
  >()
  const request = options.fetch ?? fetch

  function state(value: LiveMediaState) {
    options.onState(value)
  }
  function assertGeneration(value: number) {
    if (retired || value !== generation) throw new Error('A tentativa de conexão foi substituída.')
  }

  async function api<T>(path: string, body?: Record<string, unknown>): Promise<T> {
    const response = await request(`${options.baseUrl}/${path}`, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify({ ...body, deviceId: options.deviceId }) } : {}),
      signal: AbortSignal.timeout(18_000),
    })
    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as {
        message?: string
        error?: { message?: string }
      } | null
      throw new Error(
        error?.message ??
          error?.error?.message ??
          'Não foi possível confirmar a transmissão. Reconecte para tentar novamente.',
      )
    }
    return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>)
  }

  function stopLocal(): void {
    for (const transceiver of local.values()) {
      transceiver.sender.track?.stop()
    }
    local.clear()
    for (const subscription of subscriptions.values()) {
      subscription.track?.stop()
      options.onTrackRemoved?.(subscription.publication.id)
    }
    subscriptions.clear()
    focusedPublication = null
    peer?.close()
    peer = null
    clearInterval(heartbeatTimer)
    heartbeatTimer = undefined
  }

  async function closeAs(next: LiveMediaState): Promise<void> {
    retired = true
    generation++
    queue.retire()
    const old = connection
    connection = null
    stopLocal()
    state(next)
    if (old) await api('close', { connectionId: old.connectionId })
  }

  async function fail(error: unknown, suspended = false): Promise<never> {
    const resolved = error instanceof Error ? error : new Error('Falha na transmissão.')
    await closeAs(suspended ? 'suspended' : 'failed').catch(() => undefined)
    options.onError(resolved)
    throw resolved
  }

  async function finish(result: LiveMediaNegotiation, attempt: number): Promise<void> {
    assertGeneration(attempt)
    if (!peer || !connection || !result.sessionDescription)
      throw new Error('Negociação de mídia incompleta.')
    await peer.setRemoteDescription(result.sessionDescription)
    assertGeneration(attempt)
    let description: RTCSessionDescriptionInit | undefined
    if (result.requiresAnswer) {
      await peer.setLocalDescription(await peer.createAnswer())
      await gatherIce(peer)
      description = peer.localDescription?.toJSON()
      if (!description?.sdp) throw new Error('Não foi possível preparar a resposta da conexão.')
    }
    assertGeneration(attempt)
    await api('complete', {
      connectionId: connection.connectionId,
      operationId: result.operationId,
      ...(description ? { sessionDescription: description } : {}),
    })
    assertGeneration(attempt)
  }

  function serial<T>(operation: (attempt: number) => Promise<T>): Promise<T> {
    const attempt = generation
    return queue.run(async () => {
      assertGeneration(attempt)
      try {
        return await operation(attempt)
      } catch (error) {
        if (attempt !== generation) throw error
        return fail(error)
      }
    })
  }

  async function join(): Promise<void> {
    if (!retired) await closeAs('closed')
    retired = false
    const attempt = ++generation
    queue = new LiveMediaOperationQueue()
    state('connecting')
    lastControlAt = Date.now()
    try {
      const joined = await api<LiveMediaJoin>('join', { attemptId: crypto.randomUUID() })
      if (attempt !== generation || retired) {
        await api('close', { connectionId: joined.connectionId })
        return
      }
      connection = joined
      peer = (options.createPeerConnection ?? ((config) => new RTCPeerConnection(config)))({
        iceServers: joined.iceServers,
        bundlePolicy: 'max-bundle',
      })
      peer.addEventListener('track', (event) => {
        if (attempt !== generation || retired) {
          event.track.stop()
          return
        }
        const mid = event.transceiver.mid
        const found = [...subscriptions.values()].find((item) => item.mid === mid)
        if (!found) {
          event.track.stop()
          return
        }
        found.track = event.track
        options.onTrack({
          publication: found.publication,
          track: event.track,
          stream: new MediaStream([event.track]),
        })
      })
      peer.addEventListener('connectionstatechange', () => {
        if (attempt !== generation || retired) return
        if (peer?.connectionState === 'connected') state('connected')
        if (peer?.connectionState === 'failed' || peer?.connectionState === 'disconnected') {
          void fail(new Error('A transmissão foi interrompida. Reconecte para continuar.')).catch(
            () => undefined,
          )
        }
      })
      lastServerAt = Date.now()
      heartbeatTimer = setInterval(() => {
        if (retired || attempt !== generation || !connection) return
        const deadline = Math.min(lastServerAt, lastControlAt) + joined.controlLeaseMs
        if (Date.now() >= deadline) {
          void fail(
            new Error('A transmissão foi pausada porque os controles deixaram de responder.'),
            true,
          ).catch(() => undefined)
          return
        }
        if (!heartbeatPending) {
          heartbeatPending = true
          void api('heartbeat', { connectionId: connection.connectionId })
            .then(() => {
              if (attempt === generation) lastServerAt = Date.now()
            })
            .catch((error) => fail(error, true))
            .catch(() => undefined)
            .finally(() => {
              heartbeatPending = false
            })
        }
      }, 3_000)
    } catch (error) {
      if (attempt === generation) await fail(error)
      else throw error
    }
  }

  function publish(kind: LiveMediaKind, track: MediaStreamTrack): Promise<void> {
    return serial(async (attempt) => {
      if (!peer || !connection || local.has(kind)) {
        track.stop()
        throw new Error('Reconecte antes de publicar esta trilha.')
      }
      if (track.kind !== (kind === 'microphone' ? 'audio' : 'video')) {
        track.stop()
        throw new Error('Tipo de mídia inválido.')
      }
      const transceiver = peer.addTransceiver(track, {
        direction: 'sendonly',
        ...(track.kind === 'video'
          ? {
              sendEncodings: [
                {
                  rid: 'f',
                  maxBitrate: kind === 'camera' ? 600_000 : 1_200_000,
                  maxFramerate: kind === 'camera' ? 20 : 10,
                },
                { rid: 'q', scaleResolutionDownBy: 4, maxBitrate: 100_000, maxFramerate: 5 },
              ],
            }
          : {}),
      })
      local.set(kind, transceiver)
      await peer.setLocalDescription(await peer.createOffer())
      await gatherIce(peer)
      assertGeneration(attempt)
      const description = peer.localDescription?.toJSON()
      if (!description?.sdp || !transceiver.mid)
        throw new Error('Não foi possível preparar a mídia.')
      const result = await api<LiveMediaNegotiation>('publish', {
        connectionId: connection.connectionId,
        operationId: crypto.randomUUID(),
        kind,
        mid: transceiver.mid,
        sessionDescription: description,
      })
      await finish(result, attempt)
      track.addEventListener(
        'ended',
        () => {
          if (attempt === generation && !retired) void stopPublishing(kind).catch(() => undefined)
        },
        { once: true },
      )
    }).catch((error) => {
      track.stop()
      throw error
    })
  }

  function refreshPublications(): Promise<void> {
    return serial(async (attempt) => {
      if (!connection || !peer) throw new Error('Entre na sala antes de receber a transmissão.')
      const visible = await api<{ publications: LiveMediaPublication[] }>(
        `publications?deviceId=${encodeURIComponent(options.deviceId)}`,
      )
      assertGeneration(attempt)
      for (const [id, item] of subscriptions) {
        if (
          !visible.publications.some((current) => current.id === id) ||
          item.quality !== publicationQuality(item.publication)
        ) {
          item.track?.stop()
          subscriptions.delete(id)
          options.onTrackRemoved?.(id)
          await api('unsubscribe', { connectionId: connection.connectionId, publicationId: id })
        }
      }
      for (const publication of visible.publications) {
        if (subscriptions.has(publication.id)) continue
        const quality = publicationQuality(publication)
        const result = await api<LiveMediaNegotiation>('subscribe', {
          connectionId: connection.connectionId,
          operationId: crypto.randomUUID(),
          publicationId: publication.id,
          quality,
        })
        if (!result.mid) throw new Error('A trilha recebida está incompleta.')
        subscriptions.set(publication.id, { publication, mid: result.mid, quality })
        await finish(result, attempt)
      }
    })
  }

  function publicationQuality(publication: LiveMediaPublication): 'thumbnail' | 'full' {
    return publication.simulcast &&
      (publication.kind === 'screen' || publication.kind === 'camera') &&
      publication.id !== focusedPublication
      ? 'thumbnail'
      : 'full'
  }

  function focusPublication(publicationId: string | null): Promise<void> {
    focusedPublication = publicationId
    return refreshPublications()
  }

  function stopPublishing(kind: LiveMediaKind): Promise<void> {
    // Stop capture immediately, without waiting for an HTTP request or the negotiation queue.
    local.get(kind)?.sender.track?.stop()
    return serial(async () => {
      const transceiver = local.get(kind)
      if (!transceiver || !connection) return
      await transceiver.sender.replaceTrack(null)
      await api('unpublish', { connectionId: connection.connectionId, kind })
      transceiver.stop()
      local.delete(kind)
    })
  }

  return {
    join,
    publish,
    refreshPublications,
    focusPublication,
    stopPublishing,
    close: () => closeAs('closed'),
    observeControlHeartbeat: (at = Date.now()) => {
      lastControlAt = at
    },
  }
}

/** Cloudflare uses a complete SDP; no unauthenticated trickle-ICE endpoint is exposed. */
export async function gatherIce(peer: RTCPeerConnection, timeoutMs = 5_000): Promise<void> {
  if (peer.iceGatheringState === 'complete') return
  await new Promise<void>((resolve, reject) => {
    const done = () => {
      clearTimeout(timer)
      peer.removeEventListener('icegatheringstatechange', change)
    }
    const change = () => {
      if (peer.iceGatheringState === 'complete') {
        done()
        resolve()
      }
    }
    const timer = setTimeout(() => {
      done()
      reject(new Error('A rede não conseguiu preparar a conexão de vídeo.'))
    }, timeoutMs)
    peer.addEventListener('icegatheringstatechange', change)
    change()
  })
}
