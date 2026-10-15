import { canonical, leaseRefSchema, type ToolContext } from '@sistemazero/agent-core'
import { z } from 'zod'
import type { Environments } from '../environments/manager'
import { Locks } from '../execution/locks'
import type { ProcessHandle } from '../process/manager'
import { hash } from '../tools/paths'
import { assertFreePort, assertOwnedPort } from './ports'

export const serviceRequestSchema = z.object({
  lease: leaseRefSchema,
  intentId: z.string().min(1).max(100),
  executable: z.string().min(1),
  args: z.array(z.string()).max(100),
  port: z.number().int().min(1024).max(65535),
  healthPath: z
    .string()
    .regex(/^\/[a-zA-Z0-9/_.-]*$/)
    .default('/'),
  readinessMs: z.number().int().min(1000).max(60000).default(20000),
})
const serviceSchema = z.object({
  id: z.string(),
  digest: z.string(),
  lease: leaseRefSchema,
  owner: z.string(),
  workspace: z.string(),
  state: z.enum(['creating', 'ready', 'stopped', 'failed', 'interrupted']),
  processId: z.string().optional(),
  pid: z.number().optional(),
  port: z.number(),
  url: z.string().optional(),
  createdAt: z.string(),
  error: z.string().optional(),
  log: z.string().optional(),
})
export type Service = z.infer<typeof serviceSchema>
export class Services {
  private locks = new Locks()
  private live = new Map<
    string,
    { process: ProcessHandle; done: Promise<unknown>; abort: AbortController }
  >()
  constructor(readonly environments: Environments) {}
  private get store() {
    return this.environments.store
  }
  private save(service: Service) {
    return this.locks.with('state:' + service.id, async () => {
      const raw = await this.store.call({
        op: 'document.get',
        namespace: 'services',
        id: service.id,
      })
      if (raw) {
        const previous = serviceSchema.parse(raw)
        if (previous.digest !== service.digest) throw new Error('Service identity changed')
        if (
          ['failed', 'stopped', 'interrupted'].includes(previous.state) &&
          ['creating', 'ready'].includes(service.state)
        )
          throw new Error('Service already terminated')
      }
      return this.store.call({
        op: 'document.put',
        namespace: 'services',
        id: service.id,
        value: service,
      })
    })
  }
  async get(id: string) {
    return serviceSchema.parse(
      await this.store.call({ op: 'document.get', namespace: 'services', id }),
    )
  }
  async list(after = '', states?: string[]) {
    return z.object({ values: z.array(serviceSchema), nextCursor: z.string().optional() }).parse(
      await this.store.call({
        op: 'document.page',
        namespace: 'services',
        after,
        states,
        limit: 100,
      }),
    )
  }
  async initialize() {
    let after = ''
    do {
      const page = await this.list(after, ['creating', 'ready'])
      for (const item of page.values)
        await this.save({
          ...item,
          state: 'interrupted',
          error: 'Supervisor restarted; verify environment and create a new service intent',
        })
      after = page.nextCursor ?? ''
    } while (after)
  }
  async start(raw: z.infer<typeof serviceRequestSchema>, context: ToolContext) {
    const input = serviceRequestSchema.parse(raw)
    return this.locks.with('start', async () => {
      const lease = await this.environments.validate(input.lease, context)
      const id = hash(canonical({ lease: input.lease, intent: input.intentId })).slice(0, 40)
      const digest = hash(canonical(input))
      const existing = await this.store.call({ op: 'document.get', namespace: 'services', id })
      if (existing) {
        const service = serviceSchema.parse(existing)
        if (service.digest !== digest) throw new Error('Service intent identity conflict')
        return service
      }
      const active = await this.list('', ['creating', 'ready'])
      if (active.values.length >= 4) throw new Error('Service quota reached')
      if (
        lease.kind === 'container' &&
        active.values.some((service) => service.lease.id === lease.id)
      )
        throw new Error('Use a separate container lease for a second persistent service')
      const service = serviceSchema.parse({
        id,
        digest,
        lease: input.lease,
        owner: context.run.sessionId,
        workspace: context.workspace,
        state: 'creating',
        port: input.port,
        createdAt: new Date().toISOString(),
      })
      await this.save(service)
      const controller = new AbortController()
      let started!: (process: ProcessHandle) => void
      let failed!: (error: unknown) => void
      const starting = new Promise<ProcessHandle>((resolve, reject) => {
        started = resolve
        failed = reject
      })
      try {
        if (lease.kind !== 'container') await assertFreePort(input.port)
        else if (!lease.template.ports.includes(input.port))
          throw new Error('Container port is not declared by its template')
        const task = this.environments.own(
          input.lease,
          { ...context, signal: AbortSignal.any([context.signal, controller.signal]) },
          async (lease, signal) => {
            const container =
              lease.kind === 'container'
                ? await this.environments.containers.inspect(lease, signal)
                : undefined
            if (lease.kind === 'container' && !container?.State.Running)
              throw new Error('Owned container is not running')
            const command =
              lease.kind === 'container'
                ? {
                    executable: 'docker',
                    args: [
                      'exec',
                      '--env',
                      'PORT=' + input.port,
                      '--env',
                      'HOST=0.0.0.0',
                      '--workdir',
                      '/workspace',
                      container?.Id ?? '',
                      input.executable,
                      ...input.args,
                    ],
                  }
                : { executable: input.executable, args: input.args }
            const process = await this.environments.processes.start(
              {
                ...command,
                cwd: lease.root,
                env: { PORT: String(input.port), HOST: '127.0.0.1' },
                timeoutMs: Math.max(1, Date.parse(lease.expiresAt) - Date.now()),
                maxBytes: 16_000_000,
              },
              signal,
            )
            service.processId = process.id
            service.pid = process.pid
            service.log = process.inspect().log
            await this.save(service)
            started(process)
            const result = await process.completion
            await this.save({
              ...service,
              state: signal.aborted ? 'stopped' : 'failed',
              error: signal.aborted
                ? undefined
                : 'Service exited: ' + result.reason + ' (' + result.code + ')',
            })
          },
          false,
        )
        // Link failures before awaiting readiness. The terminal state remains durable even if startup fails.
        const done = task
          .catch(async (error) => {
            failed(error)
            await this.save({ ...service, state: 'failed', error: String(error).slice(0, 4000) })
            throw error
          })
          .finally(async () => {
            try {
              if (
                lease.kind === 'container' &&
                (await this.environments.get(lease.id)).generation === lease.generation
              )
                await this.environments.stop(lease.id, lease.generation)
            } finally {
              this.live.delete(id)
            }
          })
        void done.catch((error) => console.error('Service terminated', String(error)))
        const process = await starting
        this.live.set(id, { process, done, abort: controller })
        const port =
          lease.kind === 'container'
            ? await this.environments.containers.port(lease, input.port, context.signal)
            : input.port
        const url = 'http://127.0.0.1:' + port + input.healthPath
        const deadline = AbortSignal.any([context.signal, AbortSignal.timeout(input.readinessMs)])
        while (true) {
          deadline.throwIfAborted()
          if (!process.inspect().running)
            throw new Error('Service exited before readiness: ' + process.inspect().output)
          let healthy = false
          try {
            const response = await fetch(url, {
              signal: AbortSignal.any([deadline, AbortSignal.timeout(1000)]),
              redirect: 'manual',
            })
            healthy = response.status >= 200 && response.status < 400
            await response.body?.cancel()
          } catch (error) {
            if (deadline.aborted) throw error
          }
          if (healthy) break
          await Bun.sleep(250)
        }
        if (lease.kind === 'container') {
          if ((await this.environments.containers.port(lease, input.port, deadline)) !== port)
            throw new Error('Published port changed during readiness')
        } else
          await assertOwnedPort(
            this.environments.processes,
            this.environments.directory,
            process.pid,
            port,
            deadline,
          )
        await this.environments.validate(input.lease, context)
        if (!process.inspect().running) throw new Error('Service exited during readiness')
        service.state = 'ready'
        service.port = port
        service.url = 'http://127.0.0.1:' + port
        await this.save(service)
        return service
      } catch (error) {
        controller.abort(error)
        const live = this.live.get(id)
        if (live) await Promise.allSettled([live.done])
        await this.save({ ...service, state: 'failed', error: String(error).slice(0, 4000) })
        throw error
      }
    })
  }
  async stop(id: string, context: ToolContext) {
    const service = await this.get(id)
    if (service.owner !== context.run.sessionId || service.workspace !== context.workspace)
      throw new Error('Service ownership mismatch')
    const live = this.live.get(id)
    if (live) {
      live.abort.abort(new Error('Service stopped'))
      await live.done
    }
    return this.get(id)
  }
  async inspect(id: string, context: ToolContext) {
    const service = await this.get(id)
    if (service.owner !== context.run.sessionId || service.workspace !== context.workspace)
      throw new Error('Service ownership mismatch')
    return { ...service, process: this.live.get(id)?.process.inspect() }
  }
  async close() {
    const tasks = [...this.live.values()]
    for (const task of tasks) task.abort.abort(new Error('Supervisor stopped'))
    await Promise.allSettled(tasks.map((task) => task.done))
  }
}
