import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type ToolContext, ToolRejected } from '@sistemazero/agent-core'
import {
  browserActionSchema,
  browserOpenSchema,
  browserSnapshotSchema,
  redactUrl,
} from '@sistemazero/agent-integrations/browser'
import { z } from 'zod'
import { Locks } from '../execution/locks'
import type { Processes } from '../process/manager'
import { ProcessRpc, ProcessRpcError } from '../process/rpc'
import type { Services } from '../services/registry'
import { Artifacts } from '../store/artifacts'
import type { Supervisor } from '../supervisor'
import { hash, readBounded, workspacePath } from '../tools/paths'
import { startBrowserWorker } from './worker'

const recordSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  workspace: z.string(),
  mode: z.enum(['plan', 'build']),
  state: z.enum(['starting', 'ready', 'closed', 'interrupted']),
  createdAt: z.string(),
  serviceId: z.string().optional(),
  account: z.string().optional(),
  url: z.string().optional(),
  error: z.string().optional(),
  forced: z.boolean().optional(),
})
type BrowserRecord = z.infer<typeof recordSchema>
interface Actor {
  record: BrowserRecord
  directory: string
  rpc: ProcessRpc
  created: number
  runId: string
  timer?: ReturnType<typeof setTimeout>
}
export class Browsers {
  private actors = new Map<string, Actor>()
  private closing = new Set<Promise<unknown>>()
  private locks = new Locks()
  private artifacts: Artifacts
  constructor(
    private supervisor: Supervisor,
    private processes: Processes,
    private services: Services,
  ) {
    this.artifacts = new Artifacts(supervisor.directory)
  }
  private save(record: BrowserRecord) {
    return this.supervisor.store.call({
      op: 'document.put',
      namespace: 'browsers',
      id: record.id,
      value: record,
    })
  }
  async list(after = '') {
    return z.object({ values: z.array(recordSchema), nextCursor: z.string().optional() }).parse(
      await this.supervisor.store.call({
        op: 'document.page',
        namespace: 'browsers',
        after,
        limit: 100,
      }),
    )
  }
  async initialize() {
    let after = ''
    do {
      const page = await this.list(after)
      for (const record of page.values)
        if (record.state === 'starting' || record.state === 'ready')
          await this.save({
            ...record,
            state: 'interrupted',
            error: 'Supervisor restarted; open a new browser session',
          })
      after = page.nextCursor ?? ''
    } while (after)
  }
  private get(id: string, context: ToolContext) {
    const actor = this.actors.get(id)
    if (actor?.record.state !== 'ready')
      throw new ToolRejected('BROWSER_CLOSED', 'Browser session is not active')
    if (
      actor.record.sessionId !== context.run.sessionId ||
      actor.record.workspace !== context.workspace
    )
      throw new ToolRejected('BROWSER_OWNER', 'Browser belongs to another session or workspace')
    return actor
  }
  private expiry(actor: Actor) {
    clearTimeout(actor.timer)
    if (this.actors.get(actor.record.id) !== actor) return
    const remaining = Math.min(300000, actor.created + 1200000 - Date.now())
    actor.timer = setTimeout(
      () => {
        void this.close(actor.record.id, 'Browser lifetime or idle limit reached').catch((error) =>
          console.error(String(error)),
        )
      },
      Math.max(1, remaining),
    )
  }
  async open(
    input: {
      serviceId?: string
      url?: string
      publicWeb?: boolean
      account?: string
      headed?: boolean
      readOnly?: boolean
    },
    context: ToolContext,
  ) {
    return this.locks.with('open', async () => {
      context.signal.throwIfAborted()
      if (this.actors.size >= 2)
        throw new ToolRejected(
          'BROWSER_CAPACITY',
          'Close an existing browser before opening another',
        )
      if (
        input.account &&
        [...this.actors.values()].some((actor) => actor.record.account === input.account)
      )
        throw new ToolRejected('ACCOUNT_BUSY', 'This browser account already has an active owner')
      const service = input.serviceId
        ? await this.services.inspect(input.serviceId, context)
        : undefined
      if (service && (service.state !== 'ready' || !service.process?.running || !service.url))
        throw new ToolRejected('PREVIEW_NOT_READY', 'Preview service is not ready')
      const id = crypto.randomUUID()
      const directory = join(this.supervisor.directory, 'browsers', id)
      await mkdir(directory, { recursive: true, mode: 0o700 })
      const record = recordSchema.parse({
        id,
        sessionId: context.run.sessionId,
        workspace: context.workspace,
        mode: input.readOnly ? 'plan' : context.run.mode,
        state: 'starting',
        createdAt: new Date().toISOString(),
        serviceId: input.serviceId,
        account: input.account,
      })
      await this.save(record)
      let actor: Actor | undefined
      try {
        const child = await startBrowserWorker(this.processes, directory, context.signal)
        const rpc = new ProcessRpc(child, true)
        actor = { rpc, record, directory, created: Date.now(), runId: context.run.id }
        this.actors.set(id, actor)
        rpc.onRequest = async (method, params) => {
          if (method !== 'network.local') throw new Error('Unsupported browser control request')
          const { origin } = z.object({ origin: z.string() }).parse(params)
          if (!service || !this.actors.has(id)) return { allowed: false }
          const current = await this.services.inspect(service.id, context)
          return {
            allowed:
              current.state === 'ready' &&
              current.process?.running === true &&
              current.url === origin,
          }
        }
        rpc.onNotification = (method, params) => {
          const current = this.actors.get(id)
          if (method === 'browser.progress' && current)
            void this.supervisor
              .emit(current.runId, 'browser.progress', params)
              .catch((error) => console.error('Browser progress unavailable', String(error)))
        }
        rpc.onFailure = (error) => {
          if (this.actors.has(id))
            void this.close(id, error.message).catch((failure) => console.error(String(failure)))
        }
        let accountDirectory: string | undefined
        if (input.account) {
          accountDirectory = join(
            this.supervisor.directory,
            'browser-accounts',
            hash(input.account),
          )
          await mkdir(accountDirectory, { recursive: true, mode: 0o700 })
        }
        await this.request(
          actor,
          'open',
          browserOpenSchema.parse({
            mode: record.mode,
            headless: !input.headed,
            accountDirectory,
            publicWeb: input.publicWeb ?? !service,
            localOrigins: service?.url ? [service.url] : [],
          }),
          context.signal,
        )
        if (this.actors.get(id) !== actor) throw new Error('Browser closed during startup')
        record.state = 'ready'
        await this.save(record)
        this.expiry(actor)
        const target = input.url ?? service?.url
        const snapshot = target
          ? await this.navigate(id, target, context, record.mode === 'build')
          : undefined
        return { ...record, snapshot }
      } catch (error) {
        if (actor) await this.close(id, String(error))
        else
          await this.save({ ...record, state: 'interrupted', error: String(error).slice(0, 4000) })
        throw error
      }
    })
  }
  private async request(actor: Actor, method: string, params: unknown, signal: AbortSignal) {
    signal.throwIfAborted()
    const cancel = () => {
      void this.close(actor.record.id, 'Browser operation canceled').catch((error) =>
        console.error(String(error)),
      )
    }
    signal.addEventListener('abort', cancel, { once: true })
    try {
      const result = await actor.rpc.request(method, params)
      signal.throwIfAborted()
      this.expiry(actor)
      return result
    } catch (error) {
      if (error instanceof ProcessRpcError) {
        if (error.code === -32010) throw new ToolRejected('BROWSER_PRECONDITION', error.message)
      } else await this.close(actor.record.id, String(error))
      throw error
    } finally {
      signal.removeEventListener('abort', cancel)
    }
  }
  async observe(id: string, context: ToolContext) {
    return this.locks.with(id, async () => {
      const actor = this.get(id, context)
      actor.runId = context.run.id
      return browserSnapshotSchema.parse(await this.request(actor, 'observe', {}, context.signal))
    })
  }
  async navigate(id: string, url: string, context: ToolContext, interactive = false) {
    return this.locks.with(id, async () => {
      const actor = this.get(id, context)
      actor.runId = context.run.id
      if (actor.record.mode === 'build' && (!interactive || context.run.mode !== 'build'))
        throw new ToolRejected(
          'INTERACTIVE_NAVIGATION',
          'Use browser_navigate_interactive for a Build browser; page scripts may produce external effects',
        )
      const snapshot = browserSnapshotSchema.parse(
        await this.request(actor, 'navigate', { url }, context.signal),
      )
      actor.record.url = redactUrl(url)
      await this.save(actor.record)
      return snapshot
    })
  }
  private async artifact(actor: Actor, raw: unknown) {
    const input = z
      .object({
        file: z.string().regex(/^[a-f0-9-]{36}\.(png|download)$/),
        mediaType: z.string(),
        bytes: z.number().int().nonnegative().max(8_000_000),
      })
      .parse(raw)
    const data = await readBounded(join(actor.directory, input.file), 8_000_000)
    if (data.length !== input.bytes) throw new Error('Browser artifact size changed')
    const artifact = await this.artifacts.put(data, input.mediaType)
    await unlink(join(actor.directory, input.file))
    return artifact
  }
  async action(
    id: string,
    input: z.infer<typeof browserActionSchema>,
    context: ToolContext,
    upload?: { path: string; expectedHash: string },
  ) {
    return this.locks.with(id, async () => {
      const actor = this.get(id, context)
      actor.runId = context.run.id
      if (actor.record.mode !== 'build' || context.run.mode !== 'build')
        throw new ToolRejected('PLAN_BROWSER', 'Open a Build browser to perform this action')
      let file: string | undefined
      if (upload) {
        const data = await readBounded(
          await workspacePath(context.workspace, upload.path),
          8_000_000,
        )
        if (hash(data) !== upload.expectedHash)
          throw new ToolRejected('UPLOAD_CHANGED', 'Upload changed since review')
        file = `${crypto.randomUUID()}.upload`
        await writeFile(join(actor.directory, file), data, { flag: 'wx', mode: 0o600 })
      }
      try {
        const result = z
          .object({ snapshot: browserSnapshotSchema, artifact: z.unknown().nullable() })
          .parse(
            await this.request(
              actor,
              'action',
              browserActionSchema.parse({ ...input, file }),
              context.signal,
            ),
          )
        return {
          snapshot: result.snapshot,
          artifacts: result.artifact ? [await this.artifact(actor, result.artifact)] : [],
        }
      } finally {
        if (file) await unlink(join(actor.directory, file))
      }
    })
  }
  async screenshot(id: string, context: ToolContext) {
    return this.locks.with(id, async () => {
      const actor = this.get(id, context)
      actor.runId = context.run.id
      const result = z
        .object({
          file: z.string(),
          mediaType: z.string(),
          bytes: z.number(),
          revision: z.string(),
          url: z.string(),
        })
        .parse(await this.request(actor, 'screenshot', {}, context.signal))
      return {
        artifact: await this.artifact(actor, result),
        revision: result.revision,
        url: result.url,
      }
    })
  }
  async inspect(id: string, context: ToolContext) {
    const actor = this.get(id, context)
    const trace = await this.request(actor, 'inspect', {}, context.signal)
    return {
      ...actor.record,
      trace: await this.artifacts.put(JSON.stringify(trace), 'application/json'),
    }
  }
  async extract(id: string, fields: unknown, context: ToolContext) {
    return this.locks.with(id, async () => {
      const actor = this.get(id, context)
      return this.request(actor, 'extract', { fields }, context.signal)
    })
  }
  service(id: string, context: ToolContext) {
    return this.get(id, context).record.serviceId
  }
  async closeOwned(id: string, context: ToolContext) {
    this.get(id, context)
    return this.close(id)
  }
  async close(id: string, reason?: string) {
    const actor = this.actors.get(id)
    if (!actor) return { closed: true }
    this.actors.delete(id)
    clearTimeout(actor.timer)
    const closing = (async () => {
      let forced = false
      try {
        await actor.rpc.request('close', {}, 2000)
      } catch {
        forced = true
      } finally {
        await actor.rpc.close()
      }
      await this.save({
        ...actor.record,
        state: reason ? 'interrupted' : 'closed',
        error: reason?.slice(0, 4000),
        forced,
      })
      return { closed: true, forced }
    })()
    this.closing.add(closing)
    try {
      return await closing
    } finally {
      this.closing.delete(closing)
    }
  }
  async shutdown() {
    await Promise.allSettled([...this.actors.keys()].map((id) => this.close(id)))
    await Promise.allSettled(this.closing)
  }
}
