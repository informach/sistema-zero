import { DurableObject } from 'cloudflare:workers'
import { getSandbox, Sandbox } from '@cloudflare/sandbox'
import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import { PYTHON_LANGUAGE_LIMITS } from '@sistemazero/core/studio/python-language'
import {
  StudioPythonLanguageOpenSchema,
  StudioPythonLanguageStartSchema,
} from '@sistemazero/core/studio/python-language-authorization'

export class PythonLanguageSandbox extends Sandbox {
  enableInternet = false
}
interface RateLimitBinding {
  limit(input: { key: string }): Promise<{ success: boolean }>
}
export interface Env {
  PythonLanguageSandbox: DurableObjectNamespace<PythonLanguageSandbox>
  PythonLanguageOwner: DurableObjectNamespace<PythonLanguageOwner>
  LANGUAGE_OPEN_LIMIT: RateLimitBinding
  LANGUAGE_COMMAND_LIMIT: RateLimitBinding
  INTERNAL_TOKEN: string
}
type Lease = {
  id: string
  project_id: string
  token: string
  created_ms: number
  used_ms: number
  phase: string
  cleanup_ms: number
  binding: string | null
}
const secret = (bytes: number) =>
  [...crypto.getRandomValues(new Uint8Array(bytes))]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
  })
const expired = () =>
  json({ error: 'expired', message: 'A análise Python precisa ser reconectada.' }, 410)

/** One owner coordinates at most two private, ephemeral language processes. No source is persisted. */
export class PythonLanguageOwner extends DurableObject<Env> {
  private boots = new Map<string, Promise<void>>()
  private cleanups = new Map<string, Promise<void>>()
  private requests = new Map<
    string,
    Set<{ promise: Promise<Response>; controller: AbortController }>
  >()
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS leases (
        id TEXT PRIMARY KEY, project_id TEXT NOT NULL, token TEXT NOT NULL,
        created_ms INTEGER NOT NULL, used_ms INTEGER NOT NULL, phase TEXT NOT NULL, cleanup_ms INTEGER NOT NULL
      )`)
      const columns = ctx.storage.sql.exec<{ name: string }>('PRAGMA table_info(leases)').toArray()
      if (!columns.some((column) => column.name === 'binding'))
        ctx.storage.sql.exec('ALTER TABLE leases ADD COLUMN binding TEXT')
    })
  }
  private lease(id: string) {
    return this.ctx.storage.sql.exec<Lease>('SELECT * FROM leases WHERE id = ?', id).toArray()[0]
  }
  private sandbox(id: string) {
    return getSandbox(this.env.PythonLanguageSandbox, `language-${id}`, {
      sleepAfter: '5m',
      enableDefaultSession: false,
    })
  }
  private deadline(row: Lease) {
    return row.phase === 'closing'
      ? row.cleanup_ms
      : Math.min(
          row.created_ms + PYTHON_LANGUAGE_LIMITS.maxLifetimeMs,
          row.used_ms +
            (row.phase === 'reserved'
              ? PYTHON_LANGUAGE_LIMITS.reservationTtlMs
              : row.phase === 'opening'
                ? PYTHON_LANGUAGE_LIMITS.startupTimeoutMs
                : PYTHON_LANGUAGE_LIMITS.idleTtlMs),
        )
  }
  private async schedule() {
    const rows = this.ctx.storage.sql.exec<Lease>('SELECT * FROM leases').toArray()
    if (!rows.length) {
      await this.ctx.storage.deleteAlarm()
      return
    }
    const next = Math.min(...rows.map((row) => this.deadline(row)))
    await this.ctx.storage.setAlarm(Math.max(Date.now() + 1000, next))
  }
  private async destroy(id: string) {
    const existing = this.cleanups.get(id)
    if (existing) return existing
    const row = this.lease(id)
    if (!row) return
    // A reservation has never contacted a container and can be discarded synchronously.
    if (row.phase === 'reserved') {
      this.ctx.storage.sql.exec('DELETE FROM leases WHERE id=?', id)
      await this.schedule()
      return
    }
    this.ctx.storage.sql.exec(
      "UPDATE leases SET phase='closing',cleanup_ms=? WHERE id=?",
      Date.now() + 30_000,
      id,
    )
    const requests = [...(this.requests.get(id) ?? [])]
    for (const request of requests) request.controller.abort()
    const cleanup = (async () => {
      await this.schedule()
      // containerFetch/startProcess can start a stopped container. Drain their actual
      // promises before destroy, including SDK calls that ignore AbortSignal.
      await Promise.allSettled([this.boots.get(id), ...requests.map((request) => request.promise)])
      await this.sandbox(id).destroy()
      this.ctx.storage.sql.exec('DELETE FROM leases WHERE id=?', id)
    })().finally(async () => {
      this.cleanups.delete(id)
      await this.schedule()
    })
    this.cleanups.set(id, cleanup)
    return cleanup
  }
  async alarm() {
    const now = Date.now()
    const rows = this.ctx.storage.sql.exec<Lease>('SELECT * FROM leases').toArray()
    for (const row of rows) {
      const due = this.deadline(row) <= now
      if (!due) continue
      // Re-read after preceding network I/O: another request may have refreshed this lease.
      const current = this.lease(row.id)
      if (!current || (current.phase !== 'closing' && this.deadline(current) > Date.now())) continue
      try {
        await this.destroy(row.id)
      } catch {
        /* The persisted closing record and alarm retry cleanup. */
      }
    }
    await this.schedule()
  }
  async open(projectId: string, binding: string): Promise<Response> {
    if (!StudioPythonLanguageOpenSchema.safeParse({ projectId, binding }).success)
      return json({ error: 'invalid-project' }, 400)
    const count = this.ctx.storage.sql
      .exec<{ count: number }>('SELECT count(*) AS count FROM leases')
      .one().count
    if (count >= 2) {
      this.ctx.waitUntil(this.alarm())
      return json(
        {
          error: 'session-limit',
          message: 'Feche outro editor Python antes de iniciar uma nova análise.',
        },
        429,
      )
    }
    const id = secret(16),
      token = secret(32),
      now = Date.now()
    this.ctx.storage.sql.exec(
      "INSERT INTO leases (id, project_id, token, created_ms, used_ms, phase, cleanup_ms, binding) VALUES (?,?,?,?,?,'reserved',0,?)",
      id,
      projectId,
      token,
      now,
      now,
      binding,
    )
    await this.schedule()
    return json({ version: 1, sessionId: id, projectId })
  }
  private async boot(id: string, token: string) {
    const assertOpening = () => {
      if (this.lease(id)?.phase !== 'opening') throw new Error('Language startup cancelled')
    }
    assertOpening()
    const sandbox = this.sandbox(id)
    const process = await sandbox.startProcess(
      '/usr/local/bin/node --max-old-space-size=96 /opt/language/server.mjs',
      { processId: 'python-language', cwd: '/workspace', env: { PYTHON_LANGUAGE_TOKEN: token } },
    )
    assertOpening()
    await process.waitForPort(8789, { mode: 'tcp', timeout: 30_000 })
    assertOpening()
    const response = await sandbox.containerFetch(
      'http://language/healthz',
      {
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      },
      8789,
    )
    await response.body?.cancel()
    assertOpening()
    if (!response.ok) throw new Error('Language startup failed')
  }
  async start(id: string, binding: string): Promise<Response> {
    const row = this.lease(id)
    if (!row?.binding || row.binding !== binding) return expired()
    if (!row || row.phase === 'closing' || this.deadline(row) <= Date.now()) return expired()
    if (row.phase === 'ready') return json({ ready: true })
    let boot = this.boots.get(id)
    if (!boot) {
      if (row.phase !== 'reserved') {
        this.ctx.waitUntil(this.destroy(id).catch(() => {}))
        return expired()
      }
      this.ctx.storage.sql.exec(
        "UPDATE leases SET phase='opening',used_ms=? WHERE id=?",
        Date.now(),
        id,
      )
      boot = this.boot(id, row.token)
      this.boots.set(id, boot)
    }
    try {
      await this.schedule()
      await boot
      if (this.lease(id)?.phase === 'ready') return json({ ready: true })
      if (this.lease(id)?.phase !== 'opening') throw new Error('Language startup cancelled')
      this.ctx.storage.sql.exec(
        "UPDATE leases SET phase='ready',used_ms=? WHERE id=?",
        Date.now(),
        id,
      )
      await this.schedule()
      return json({ ready: true })
    } catch {
      try {
        await this.destroy(id)
      } catch {
        /* Persisted cleanup is retried by the alarm. */
      }
      return json(
        { error: 'unavailable', message: 'Não foi possível iniciar a análise Python.' },
        503,
      )
    } finally {
      if (this.boots.get(id) === boot) this.boots.delete(id)
    }
  }
  async command(id: string, request: Request, binding: string): Promise<Response> {
    const lease = this.lease(id),
      now = Date.now()
    if (
      !lease?.binding ||
      lease.binding !== binding ||
      lease?.phase !== 'ready' ||
      lease.created_ms + PYTHON_LANGUAGE_LIMITS.maxLifetimeMs <= now ||
      lease.used_ms + PYTHON_LANGUAGE_LIMITS.idleTtlMs <= now
    ) {
      // A different context cannot close or consume the rightful owner's session.
      if (lease?.binding === binding) this.ctx.waitUntil(this.destroy(id).catch(() => {}))
      await request.body?.cancel()
      return expired()
    }
    const operation = request.headers.get('x-studio-python-operation')
    if (!['sync', 'query', 'cancel', 'dispose'].includes(operation ?? '')) {
      await request.body?.cancel()
      return json({ error: 'invalid-operation' }, 400)
    }
    // This header is derived from the parsed command by the authenticated BFF.
    // Cancellation/disposal remain available after revocation, but cannot keep
    // an otherwise idle paid process alive.
    if (operation !== 'cancel' && operation !== 'dispose')
      this.ctx.storage.sql.exec('UPDATE leases SET used_ms=? WHERE id=?', now, id)
    await this.schedule()
    if (this.lease(id)?.phase !== 'ready') {
      await request.body?.cancel()
      return expired()
    }
    const controller = new AbortController()
    const pending = this.sandbox(id).containerFetch(
      'http://language/command',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${lease.token}` },
        body: request.body,
        signal: AbortSignal.any([
          controller.signal,
          request.signal,
          AbortSignal.timeout(PYTHON_LANGUAGE_LIMITS.requestTimeoutMs + 2000),
        ]),
      },
      8789,
    )
    const entry = { promise: pending, controller },
      requests = this.requests.get(id) ?? new Set()
    requests.add(entry)
    this.requests.set(id, requests)
    try {
      const response = await pending
      if (this.lease(id)?.phase !== 'ready') {
        await response.body?.cancel()
        return expired()
      }
      return new Response(response.body, {
        status: response.status,
        headers: {
          'content-type': 'application/json',
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
        },
      })
    } catch {
      this.ctx.waitUntil(this.destroy(id).catch(() => {}))
      return expired()
    } finally {
      requests.delete(entry)
      if (!requests.size) this.requests.delete(id)
    }
  }
  async close(id: string): Promise<Response> {
    try {
      await this.destroy(id)
      return json({ closed: true })
    } catch {
      return json({ closed: false, error: 'cleanup-pending' }, 503)
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (
      !env.INTERNAL_TOKEN ||
      request.headers.get('authorization') !== `Bearer ${env.INTERNAL_TOKEN}`
    )
      return json({ error: 'unauthorized' }, 401)
    const url = new URL(request.url)
    const route = /^\/v1\/python-language\/([a-f0-9]{64})\/(open|[a-f0-9]{32})(\/start)?$/.exec(
      url.pathname,
    )
    if (!route || url.search) return json({ error: 'not-found' }, 404)
    const owner = route[1]!,
      session = route[2]!
    const stub = env.PythonLanguageOwner.getByName(owner)
    if (route[3]) {
      if (session === 'open' || request.method !== 'POST')
        return json({ error: 'invalid-request' }, 400)
      if (!(await env.LANGUAGE_OPEN_LIMIT.limit({ key: owner })).success)
        return json({ error: 'rate-limit' }, 429)
      try {
        const body = StudioPythonLanguageStartSchema.parse(
          await readJsonBodyWithLimit(request, 512),
        )
        return stub.start(session, body.binding)
      } catch {
        return json({ error: 'invalid-request' }, 400)
      }
    }
    if (request.method === 'POST' && session === 'open') {
      if (!(await env.LANGUAGE_OPEN_LIMIT.limit({ key: owner })).success)
        return json({ error: 'rate-limit' }, 429)
      try {
        const body = StudioPythonLanguageOpenSchema.parse(await readJsonBodyWithLimit(request, 512))
        return await stub.open(body.projectId, body.binding)
      } catch {
        return json({ error: 'invalid-request' }, 400)
      }
    }
    if (session === 'open') return json({ error: 'not-found' }, 404)
    if (request.method === 'DELETE') return stub.close(session)
    if (
      request.method !== 'POST' ||
      !/^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? '') ||
      request.headers.has('content-encoding')
    )
      return json({ error: 'invalid-request' }, 400)
    if (Number(request.headers.get('content-length')) > PYTHON_LANGUAGE_LIMITS.maxRequestBytes)
      return json({ error: 'body-too-large' }, 413)
    if (!(await env.LANGUAGE_COMMAND_LIMIT.limit({ key: owner })).success)
      return json({ error: 'rate-limit' }, 429)
    const binding = request.headers.get('x-studio-python-binding')
    if (!binding || !/^[a-f0-9]{64}$/.test(binding)) {
      await request.body?.cancel()
      return json({ error: 'invalid-binding' }, 400)
    }
    if (
      !['sync', 'query', 'cancel', 'dispose'].includes(
        request.headers.get('x-studio-python-operation') ?? '',
      )
    ) {
      await request.body?.cancel()
      return json({ error: 'invalid-operation' }, 400)
    }
    return stub.command(session, request, binding)
  },
} satisfies ExportedHandler<Env>
