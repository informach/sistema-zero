/** Independent operational lease; this service never grants classroom access. */
export interface SupervisorRecord {
  connectionId: string
  generation: number
  sessionId: string | null
  leaseEndsAt: number
  hardEndsAt: number
  retired: boolean
  mids: string[]
  closedMids: string[]
  cleanupPending: boolean
  lastErrorAt: number | null
  sessionClosed?: boolean
}

interface DurableStorage {
  get<T>(key: string): Promise<T | undefined>
  put<T>(key: string, value: T): Promise<void>
  setAlarm(at: number): Promise<void>
}

interface ObjectState {
  storage: DurableStorage
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>
}

interface SupervisorEnvironment {
  SUPERVISOR_TOKEN: string
  SFU_APP_ID: string
  SFU_APP_SECRET: string
  CONNECTIONS: {
    idFromName(name: string): unknown
    get(id: unknown): { fetch(request: Request): Promise<Response> }
  }
}

export async function authorized(request: Request, secret: string): Promise<boolean> {
  if (secret.length < 32) return false
  const supplied = request.headers.get('authorization') ?? ''
  const [a, b] = await Promise.all(
    [supplied, `Bearer ${secret}`].map((value) =>
      crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
  )
  const left = new Uint8Array(a!),
    right = new Uint8Array(b!)
  let difference = 0
  for (let i = 0; i < left.length; i++) difference |= left[i]! ^ right[i]!
  return difference === 0
}

function valid(value: unknown): value is SupervisorRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as SupervisorRecord
  return (
    typeof record.connectionId === 'string' &&
    /^[\da-f-]{36}$/i.test(record.connectionId) &&
    Number.isSafeInteger(record.generation) &&
    record.generation > 0 &&
    (record.sessionId === null ||
      (typeof record.sessionId === 'string' && record.sessionId.length < 256)) &&
    Number.isFinite(record.leaseEndsAt) &&
    Number.isFinite(record.hardEndsAt) &&
    record.leaseEndsAt <= Date.now() + 20_000 &&
    record.hardEndsAt <= Date.now() + 5 * 3_600_000 &&
    typeof record.retired === 'boolean' &&
    Array.isArray(record.mids) &&
    record.mids.length <= 128 &&
    record.mids.every((mid) => typeof mid === 'string' && mid.length <= 32)
  )
}

export default {
  async fetch(request: Request, env: SupervisorEnvironment): Promise<Response> {
    if (!(await authorized(request, env.SUPERVISOR_TOKEN ?? '')))
      return new Response('Unauthorized', { status: 401 })
    const url = new URL(request.url)
    const match = /^\/connections\/([\da-f-]{36})$/i.exec(url.pathname)
    if (!match || !['PUT', 'GET'].includes(request.method))
      return new Response('Not found', { status: 404 })
    if (Number(request.headers.get('content-length') ?? 0) > 16_384)
      return new Response('Too large', { status: 413 })
    const id = env.CONNECTIONS.idFromName(match[1]!)
    return env.CONNECTIONS.get(id).fetch(request)
  },
}

export class LiveConnectionSupervisor {
  constructor(
    private readonly ctx: ObjectState,
    private readonly env: SupervisorEnvironment,
  ) {}

  async fetch(request: Request): Promise<Response> {
    if (!(await authorized(request, this.env.SUPERVISOR_TOKEN ?? '')))
      return new Response('Unauthorized', { status: 401 })
    if (request.method === 'GET') {
      const record = await this.ctx.storage.get<SupervisorRecord>('connection')
      return Response.json(record ?? { absent: true }, { headers: { 'Cache-Control': 'no-store' } })
    }
    const raw = await request.text()
    if (raw.length > 16_384) return new Response('Too large', { status: 413 })
    let input: unknown
    try {
      input = JSON.parse(raw)
    } catch {
      return new Response('Invalid JSON', { status: 400 })
    }
    if (!valid(input)) return new Response('Invalid lease', { status: 400 })
    const incoming = input
    return this.ctx.blockConcurrencyWhile(async () => {
      const prior = await this.ctx.storage.get<SupervisorRecord>('connection')
      if (
        prior &&
        (prior.connectionId !== incoming.connectionId ||
          prior.generation !== incoming.generation ||
          (prior.sessionId && incoming.sessionId && prior.sessionId !== incoming.sessionId))
      )
        return new Response('Generation conflict', { status: 409 })
      const retired =
        !!prior?.retired ||
        incoming.retired ||
        (prior !== undefined && prior.leaseEndsAt <= Date.now())
      const record: SupervisorRecord = {
        connectionId: incoming.connectionId,
        generation: incoming.generation,
        sessionId: prior?.sessionId ?? incoming.sessionId,
        leaseEndsAt: Math.min(incoming.leaseEndsAt, incoming.hardEndsAt),
        hardEndsAt: Math.min(prior?.hardEndsAt ?? incoming.hardEndsAt, incoming.hardEndsAt),
        retired,
        mids: [...new Set([...(prior?.mids ?? []), ...incoming.mids])],
        closedMids: prior?.closedMids ?? [],
        cleanupPending: true,
        lastErrorAt: prior?.lastErrorAt ?? null,
      }
      await this.ctx.storage.put('connection', record)
      await this.ctx.storage.setAlarm(
        retired ? Date.now() : Math.min(record.leaseEndsAt, record.hardEndsAt),
      )
      return Response.json({ accepted: true, retired, cleanupPending: record.cleanupPending })
    })
  }

  async alarm(): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      const record = await this.ctx.storage.get<SupervisorRecord>('connection')
      if (!record) return
      if (!record.retired && Date.now() < Math.min(record.leaseEndsAt, record.hardEndsAt)) {
        await this.ctx.storage.setAlarm(Math.min(record.leaseEndsAt, record.hardEndsAt))
        return
      }
      record.retired = true
      await this.ctx.storage.put('connection', record)
      if (!record.sessionId) {
        // A creation response can arrive later; it will schedule another alarm.
        record.cleanupPending = true
        await this.ctx.storage.put('connection', record)
        return
      }
      try {
        const inspected = await this.call(record.sessionId, '', 'GET')
        if (inspected.sessionClosed) {
          // A known session returning 410/session_error cannot reconnect. Keep the
          // resource history; this is evidence about the session, not item absence.
          record.sessionClosed = true
          record.cleanupPending = false
          record.lastErrorAt = null
          await this.ctx.storage.put('connection', record)
          if (Date.now() < record.hardEndsAt + 60_000)
            await this.ctx.storage.setAlarm(Date.now() + 15_000)
          return
        }
        record.sessionClosed = false
        const discovered = (inspected.tracks ?? []).flatMap((item) => (item.mid ? [item.mid] : []))
        record.mids = [...new Set([...record.mids, ...discovered])]
        // Inspection is newer evidence: force-close may leave inactive entries, and a delayed
        // mutation can make a previously closed mid active again. Reconcile both directions.
        for (const track of inspected.tracks ?? []) {
          if (!track.mid) continue
          if (track.status === 'inactive') {
            if (!record.closedMids.includes(track.mid)) record.closedMids.push(track.mid)
          } else record.closedMids = record.closedMids.filter((mid) => mid !== track.mid)
        }
        const unresolved = record.mids.filter((mid) => !record.closedMids.includes(mid))
        await this.ctx.storage.put('connection', record)
        if (unresolved.length) {
          const closed = await this.call(record.sessionId, '/tracks/close', 'PUT', {
            force: true,
            tracks: unresolved.map((mid) => ({ mid })),
          })
          for (const track of closed.tracks ?? [])
            if (track.mid && (!track.errorCode || track.errorCode === 'close_track_error'))
              record.closedMids.push(track.mid)
        }
        record.cleanupPending = record.mids.some((mid) => !record.closedMids.includes(mid))
        record.lastErrorAt = record.cleanupPending ? Date.now() : null
      } catch {
        record.lastErrorAt = Date.now()
        record.cleanupPending = true
      }
      await this.ctx.storage.put('connection', record)
      // Reinspect beyond successful closure: an earlier timed-out operation may allocate late.
      if (record.cleanupPending || Date.now() < record.hardEndsAt + 60_000)
        await this.ctx.storage.setAlarm(Date.now() + 15_000)
    })
  }

  private async call(
    sessionId: string,
    suffix: string,
    method: string,
    body?: unknown,
  ): Promise<{
    tracks?: { mid?: string; errorCode?: string; status?: string }[]
    sessionClosed?: boolean
  }> {
    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/apps/${encodeURIComponent(this.env.SFU_APP_ID)}/sessions/${encodeURIComponent(sessionId)}${suffix}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${this.env.SFU_APP_SECRET}`,
          'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(8_000),
      },
    )
    const result = (await response.json()) as {
      tracks?: { mid?: string; errorCode?: string; status?: string }[]
      errorCode?: string
    }
    if (method === 'GET' && response.status === 410 && result.errorCode === 'session_error')
      return { sessionClosed: true }
    if (!response.ok) throw new Error('SFU cleanup not confirmed')
    if (result.errorCode) throw new Error('SFU cleanup not confirmed')
    return result
  }
}
