import { createHash } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { realpath } from 'node:fs/promises'
import {
  type Command,
  canonical,
  questionSchema,
  type Run,
  runSchema,
  type Settings,
  sessionSchema,
  settingsSchema,
  startRunSchema,
  terminalStates,
} from '@sistemazero/agent-core'
import { z } from 'zod'
import { readSettings, writeSettings } from './config'
import { Locks } from './execution/locks'
import { Artifacts } from './store/artifacts'
import type { Store, StoreMutation } from './store/client'
import { storeCommand } from './store/schema'

export type RunExecutor = (run: Run, workspace: string, signal: AbortSignal) => Promise<void>
export class Supervisor {
  readonly beforeShutdown = new Set<() => void | Promise<void>>()
  readonly cleanup = new Set<() => void | Promise<void>>()
  readonly commands = new Map<string, (params: unknown, signal: AbortSignal) => Promise<unknown>>()
  readonly changes = new EventEmitter()
  readonly active = new Map<string, AbortController>()
  private queue: Run[] = []
  private idleWaiters = new Set<() => void>()
  private stopping = false
  private projectionRevision = 0
  readiness: 'recovering' | 'ready' | 'failed' = 'ready'
  recoveryError: string | undefined
  private questionLocks = new Locks()
  executor: RunExecutor | undefined
  settings!: Settings
  constructor(
    readonly directory: string,
    readonly store: Store,
  ) {
    store.on('changed', (mutation: StoreMutation) => {
      this.changes.emit('changed', mutation)
      if (
        ['run.put', 'run.state', 'question.put', 'question.answer', 'recover'].includes(mutation.op)
      ) {
        this.projectionRevision++
        this.changes.emit('projection')
      }
    })
  }
  async initialize() {
    this.settings = await readSettings(this.directory)
    await this.store.call({ op: 'recover' })
  }
  notifyProjection() {
    this.projectionRevision++
    this.changes.emit('projection')
  }
  async emit(runId: string, type: string, payload: unknown) {
    if (type === 'assistant.final' && Buffer.byteLength(JSON.stringify(payload)) > 120000) {
      const content = typeof payload === 'string' ? payload : JSON.stringify(payload)
      const artifact = await Artifacts.owned(runId, () =>
        new Artifacts(this.directory).put(content),
      )
      payload = {
        artifact,
        preview: `${content.slice(0, 8000)}\n[… conteúdo completo no artefato …]\n${content.slice(-8000)}`,
      }
    }
    return this.store.call({ op: 'event.append', runId, type, payload })
  }
  async setState(id: string, state: Run['state'], error?: string) {
    return runSchema.parse(await this.store.call({ op: 'run.state', id, state, error }))
  }
  async ask(
    run: Run,
    prompt: string,
    options: string[] = [],
    kind: 'input' | 'approval' = 'input',
    digest?: string,
    signal?: AbortSignal,
  ): Promise<string> {
    return this.questionLocks.with(run.id, () =>
      this.askOnce(run, prompt, options, kind, digest, signal),
    )
  }
  private async askOnce(
    run: Run,
    prompt: string,
    options: string[] = [],
    kind: 'input' | 'approval' = 'input',
    digest?: string,
    signal?: AbortSignal,
  ): Promise<string> {
    signal?.throwIfAborted()
    await this.setState(run.id, kind === 'input' ? 'waiting_input' : 'waiting_approval')
    const question = questionSchema.parse({
      id: crypto.randomUUID(),
      runId: run.id,
      kind,
      prompt,
      options,
      digest,
      createdAt: new Date().toISOString(),
    })
    await this.store.call({ op: 'question.put', value: question })
    while (true) {
      signal?.throwIfAborted()
      const changed = this.waitForChange(signal, 'projection')
      const questions = z
        .array(questionSchema)
        .parse(await this.store.call({ op: 'question.list', runId: run.id }))
      const answered = questions.find((item) => item.id === question.id)?.answer
      if (answered !== undefined) {
        changed.cancel()
        await this.setState(run.id, 'running')
        return answered
      }
      await changed.promise
    }
  }
  private waitForChange(signal?: AbortSignal, event = 'changed') {
    let cleanup = () => {}
    const promise = new Promise<void>((resolve, reject) => {
      const done = () => {
        cleanup()
        resolve()
      }
      const abort = () => {
        cleanup()
        reject(signal?.reason ?? new Error('Canceled'))
      }
      const timer = setTimeout(done, 10000)
      cleanup = () => {
        clearTimeout(timer)
        this.changes.off(event, done)
        signal?.removeEventListener('abort', abort)
      }
      this.changes.once(event, done)
      signal?.addEventListener('abort', abort, { once: true })
      if (signal?.aborted) abort()
    })
    // Cancellation removes listeners without leaving an unhandled rejection.
    void promise.catch(() => {})
    return { promise, cancel: cleanup }
  }
  async submit(raw: unknown, beforeQueue?: (run: Run) => Promise<void>) {
    if (this.readiness !== 'ready')
      throw new Error(this.recoveryError ?? 'Runtime recovering; retry when ready')
    if (this.stopping || !this.executor) throw new Error('Agent executor unavailable')
    if (this.queue.length >= 100) throw new Error('Task queue is full')
    const input = startRunSchema.parse(raw)
    const now = new Date().toISOString()
    const run = runSchema.parse({
      id: crypto.randomUUID(),
      sessionId: input.sessionId,
      input: input.input,
      task: input.task,
      backend: input.backend ?? this.settings.backend,
      model: input.model ?? this.settings.model,
      mode: input.mode ?? this.settings.mode,
      state: 'queued',
      createdAt: now,
      updatedAt: now,
      maxCost: Math.min(input.maxCost ?? this.settings.maxCost, this.settings.maxCost),
      maxSteps: Math.min(input.maxSteps ?? this.settings.maxSteps, this.settings.maxSteps),
      parentId: input.parentId,
      allowedTools: input.allowedTools,
    })
    const saved = runSchema.parse(
      await this.store.call({
        op: 'run.put',
        value: run,
        requestId: input.requestId,
        digest: createHash('sha256').update(canonical(input)).digest('hex'),
      }),
    )
    await beforeQueue?.(saved)
    if (
      saved.state === 'queued' &&
      !this.queue.some((item) => item.id === saved.id) &&
      !this.active.has(saved.id)
    ) {
      this.queue.push(saved)
      this.pump()
    }
    return saved
  }
  async waitRun(id: string, signal: AbortSignal) {
    while (true) {
      signal.throwIfAborted()
      const changed = this.waitForChange(signal, 'projection')
      try {
        const run = runSchema.parse(await this.store.call({ op: 'run.get', id }))
        if (terminalStates.has(run.state)) return run
        await changed.promise
      } finally {
        changed.cancel()
      }
    }
  }
  async handle(command: Command, signal: AbortSignal): Promise<unknown> {
    switch (command.method) {
      case 'ping':
        return {
          version: 1,
          pid: process.pid,
          active: this.active.size,
          queued: this.queue.length,
          readiness: this.readiness,
          recoveryError: this.recoveryError,
        }
      case 'runtime.metrics':
        return {
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          uptimeSeconds: process.uptime(),
          active: this.active.size,
          queued: this.queue.length,
        }
      case 'history.page':
        return this.store.call(
          storeCommand.parse({
            ...z.record(z.string(), z.unknown()).parse(command.params),
            op: 'history.page',
          }),
        )
      case 'events.tail':
        return this.store.call(
          storeCommand.parse({
            ...z.record(z.string(), z.unknown()).parse(command.params),
            op: 'event.tail',
          }),
        )
      case 'session.snapshot': {
        const args = z
          .object({
            sessionId: z.string(),
            afterRevision: z.number().int().nonnegative().optional(),
          })
          .parse(command.params)
        const changed = this.waitForChange(signal, 'projection')
        try {
          if (args.afterRevision === this.projectionRevision) await changed.promise
          const revision = this.projectionRevision
          const snapshot = z
            .object({ runs: z.array(z.unknown()), questions: z.array(questionSchema) })
            .parse(await this.store.call({ op: 'session.snapshot', sessionId: args.sessionId }))
          return {
            ...snapshot,
            revision,
            settings: this.settings,
            readiness: this.readiness,
            recoveryError: this.recoveryError,
          }
        } finally {
          changed.cancel()
        }
      }
      case 'usage':
        return this.store.call({
          op: 'budget.list',
          ...z.object({ runId: z.string() }).parse(command.params),
        })
      case 'settings.get':
        return this.settings
      case 'settings.set':
        this.settings = await writeSettings(this.directory, settingsSchema.parse(command.params))
        this.notifyProjection()
        return this.settings
      case 'session.create': {
        const input = z
          .object({
            workspace: z.string(),
            title: z.string().min(1).max(200).default('Nova sessão'),
          })
          .parse(command.params)
        const session = sessionSchema.parse({
          id: crypto.randomUUID(),
          workspace: await realpath(input.workspace),
          title: input.title,
          createdAt: new Date().toISOString(),
          archived: false,
        })
        return this.store.call({ op: 'session.put', value: session })
      }
      case 'session.list':
        return this.store.call({
          op: 'session.list',
          ...z.object({ offset: z.number().int().nonnegative().default(0) }).parse(command.params),
        })
      case 'session.get':
        return this.store.call({
          op: 'session.get',
          ...z.object({ id: z.string() }).parse(command.params),
        })
      case 'run.start': {
        return this.submit(command.params)
      }
      case 'run.get':
        return this.store.call({
          op: 'run.get',
          ...z.object({ id: z.string() }).parse(command.params),
        })
      case 'run.list':
        return this.store.call({
          op: 'run.list',
          ...z.object({ sessionId: z.string().optional() }).parse(command.params),
        })
      case 'run.cancel': {
        const { id } = z.object({ id: z.string() }).parse(command.params)
        const run = runSchema.parse(await this.store.call({ op: 'run.get', id }))
        if (terminalStates.has(run.state)) return run
        if (run.state === 'queued' || !this.active.has(id)) {
          this.queue = this.queue.filter((item) => item.id !== id)
          if (run.state !== 'queued' && run.state !== 'canceling')
            await this.setState(id, 'canceling')
          return this.setState(id, 'canceled')
        }
        if (run.state !== 'canceling') await this.setState(id, 'canceling')
        this.active.get(id)?.abort(new Error('Cancelado pelo usuário'))
        return { id, state: 'canceling' }
      }
      case 'events': {
        const args = z
          .object({
            runId: z.string(),
            after: z.number().int().nonnegative().default(0),
            wait: z.boolean().default(false),
          })
          .parse(command.params)
        const changed = this.waitForChange(signal)
        try {
          const events = await this.store.call({
            op: 'event.list',
            runId: args.runId,
            after: args.after,
            limit: 100,
          })
          if (!args.wait || (Array.isArray(events) && events.length)) return events
          await changed.promise
          return this.store.call({
            op: 'event.list',
            runId: args.runId,
            after: args.after,
            limit: 100,
          })
        } finally {
          changed.cancel()
        }
      }
      case 'question.list':
        return this.store.call({
          op: 'question.list',
          ...z.object({ runId: z.string() }).parse(command.params),
        })
      case 'question.answer': {
        const args = z.object({ id: z.string(), answer: z.string() }).parse(command.params)
        return this.store.call({ op: 'question.answer', ...args })
      }
      default: {
        const handler = this.commands.get(command.method)
        if (
          this.readiness !== 'ready' &&
          !command.method.endsWith('.list') &&
          ![
            'runtime.shutdown',
            'connections',
            'models',
            'native.models',
            'capabilities',
            'checkpoints',
          ].includes(command.method)
        )
          throw new Error(this.recoveryError ?? 'Runtime recovering; retry when ready')
        if (handler) return handler(command.params, signal)
        throw new Error(`Unknown command: ${command.method}`)
      }
    }
  }
  private pump() {
    while (!this.stopping && this.active.size < 2 && this.queue.length) {
      const run = this.queue.shift()
      if (!run) break
      const controller = new AbortController()
      this.active.set(run.id, controller)
      void this.execute(run, controller)
        .finally(() => {
          this.active.delete(run.id)
          this.pump()
          if (!this.active.size) for (const notify of this.idleWaiters) notify()
        })
        .catch((error) => {
          console.error('Run cleanup failed', error)
          this.stopping = true
        })
    }
  }
  private async execute(run: Run, controller: AbortController) {
    try {
      const session = sessionSchema.parse(
        await this.store.call({ op: 'session.get', id: run.sessionId }),
      )
      const running = await this.setState(run.id, 'running')
      if (!this.executor) throw new Error('Executor unavailable')
      await Artifacts.owned(run.id, () =>
        this.executor?.(running, session.workspace, controller.signal),
      )
      controller.signal.throwIfAborted()
      const pending = z
        .object({ count: z.number(), ids: z.array(z.string()) })
        .parse(await this.store.call({ op: 'effect.pending', runId: run.id }))
      if (pending.count)
        throw new Error(`Uncertain effects require reconciliation: ${pending.ids.join(', ')}`)
      await this.setState(run.id, 'succeeded')
    } catch (error) {
      const current = runSchema.parse(await this.store.call({ op: 'run.get', id: run.id }))
      if (!terminalStates.has(current.state))
        await this.setState(
          run.id,
          controller.signal.aborted ? 'canceled' : 'failed',
          error instanceof Error ? error.message : 'Execution failed',
        )
    }
  }
  async shutdown() {
    this.stopping = true
    for (const stop of this.beforeShutdown) await stop()
    for (const [id, controller] of this.active) {
      if (controller.signal.aborted) continue
      const run = runSchema.parse(await this.store.call({ op: 'run.get', id }))
      if (terminalStates.has(run.state)) continue
      await this.setState(id, 'canceling')
      controller.abort(new Error('Supervisor shutting down'))
    }
    if (this.active.size)
      await new Promise<void>((resolve) => {
        this.idleWaiters.add(resolve)
      })
    for (const cleanup of this.cleanup) await cleanup()
    await this.store.close()
  }
}
