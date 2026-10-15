import { realpath, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import {
  canonical,
  type EnvironmentLease,
  type EnvironmentRequest,
  environmentLeaseSchema,
  environmentRequestSchema,
  type ToolContext,
} from '@sistemazero/agent-core'
import { z } from 'zod'
import { Locks } from '../execution/locks'
import type { Processes } from '../process/manager'
import { profileIdentity } from '../profile-identity'
import type { Store } from '../store/client'
import { exists, hash, inside } from '../tools/paths'
import { WorkspaceExports } from '../workspace/export'
import { snapshotSchema, Workspaces } from '../workspace/snapshot'
import { Containers } from './container'

const liveStates = ['creating', 'ready', 'stopping', 'destroying', 'unknown']
export class Environments {
  readonly containers: Containers
  readonly exports: WorkspaceExports
  private locks = new Locks()
  private executionLocks = new Locks()
  private stopLocks = new Locks()
  private timers = new Map<string, ReturnType<typeof setTimeout>>()
  private users = new Map<string, Set<{ abort: () => void; done: Promise<unknown> }>>()
  private closing = false
  constructor(
    readonly store: Store,
    readonly processes: Processes,
    readonly directory: string,
  ) {
    this.containers = new Containers(
      processes,
      directory,
      hash(profileIdentity(directory)).slice(0, 32),
    )
    this.exports = new WorkspaceExports(store, directory)
  }
  async list(after = '', states?: string[]) {
    return z
      .object({ values: z.array(environmentLeaseSchema), nextCursor: z.string().optional() })
      .parse(
        await this.store.call({
          op: 'document.page',
          namespace: 'environments',
          after,
          states,
          limit: 100,
        }),
      )
  }
  async get(id: string) {
    return environmentLeaseSchema.parse(
      await this.store.call({ op: 'document.get', namespace: 'environments', id }),
    )
  }
  private async save(lease: EnvironmentLease) {
    await this.store.call({
      op: 'document.put',
      namespace: 'environments',
      id: lease.id,
      value: lease,
    })
    return lease
  }
  async validate(
    ref: { id: string; generation: number },
    context: Pick<ToolContext, 'workspace' | 'run'>,
  ) {
    const lease = await this.get(ref.id)
    if (
      lease.generation !== ref.generation ||
      lease.state !== 'ready' ||
      Date.parse(lease.expiresAt) <= Date.now()
    )
      throw new Error('Environment lease is expired, revoked or not ready')
    if (lease.workspace !== context.workspace || lease.owner !== context.run.sessionId)
      throw new Error('Environment belongs to another workspace or session')
    return lease
  }
  async acquire(raw: EnvironmentRequest, context: ToolContext) {
    const request = environmentRequestSchema.parse(raw)
    const workspace = await realpath(context.workspace)
    const id = hash(
      this.containers.installation + ':' + context.run.sessionId + ':' + request.intentId,
    ).slice(0, 40)
    const digest = hash(canonical({ request, workspace }))
    return this.locks.with('acquire', async () => {
      if (this.closing) throw new Error('Environment manager is stopping')
      context.signal.throwIfAborted()
      const old = await this.store.call({ op: 'document.get', namespace: 'environments', id })
      if (old) {
        const previous = environmentLeaseSchema.parse(old)
        if (previous.intentDigest !== digest)
          throw new Error('Environment intent identity conflict')
        return previous
      }
      const active = await this.list('', liveStates)
      if (active.values.length >= 4 || active.nextCursor)
        throw new Error('Environment quota reached; release an existing lease')
      let snapshot: z.infer<typeof snapshotSchema> | undefined
      if (request.kind !== 'local') {
        if (!request.snapshotId)
          throw new Error('Isolated environments require a workspace snapshot')
        snapshot = snapshotSchema.parse(
          await this.store.call({
            op: 'document.get',
            namespace: 'snapshots',
            id: request.snapshotId,
          }),
        )
        if (snapshot.workspace !== workspace)
          throw new Error('Snapshot belongs to another workspace')
      }
      if (request.kind === 'container' && !request.template.image)
        throw new Error('Container template requires an inspected image digest')
      const lease = environmentLeaseSchema.parse({
        id,
        generation: 1,
        intentDigest: digest,
        owner: context.run.sessionId,
        workspace,
        root:
          request.kind === 'local'
            ? workspace
            : request.kind === 'worktree'
              ? join(this.directory, 'worktrees', id)
              : join(this.directory, 'environments', id, 'workspace'),
        worktreeId: request.kind === 'worktree' ? id : undefined,
        kind: request.kind,
        snapshotId: request.snapshotId,
        template: request.template,
        templateDigest: hash(canonical(request.template)),
        cacheKey: hash(
          canonical({
            os: process.platform,
            architecture: process.arch,
            template: request.template,
            locks:
              snapshot?.files
                .filter((file) =>
                  /(^|[/\\])(bun.lock|package-lock.json|pnpm-lock.yaml|yarn.lock)$/.test(file.path),
                )
                .map((file) => file.artifact?.sha256 ?? null) ?? [],
          }),
        ),
        resourceName: 'zero-' + id,
        state: 'creating',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + request.template.lifetimeMs).toISOString(),
      })
      await this.save(lease)
      try {
        if (request.kind === 'worktree' && snapshot) {
          const fork = await new Workspaces(this.store, this.processes, this.directory).branch(
            snapshot.id,
            id,
            context.signal,
            id,
          )
          lease.root = fork.path
          lease.worktreeId = fork.id
        } else if (request.kind === 'container' && snapshot) {
          await this.exports.seed(snapshot.id, lease.root, context.signal)
          lease.resourceId = await this.containers.create(lease, context.signal)
        }
        context.signal.throwIfAborted()
        lease.state = 'ready'
        await this.save(lease)
        this.expiry(lease)
        return lease
      } catch (error) {
        lease.state = 'unknown'
        lease.error = error instanceof Error ? error.message : 'Environment provision failed'
        await this.save(lease)
        throw error
      }
    })
  }
  private expiry(lease: EnvironmentLease) {
    const old = this.timers.get(lease.id)
    if (old) clearTimeout(old)
    this.timers.set(
      lease.id,
      setTimeout(
        () => {
          void this.stop(lease.id, lease.generation).catch((error) =>
            console.error('Environment auto-stop failed', String(error)),
          )
        },
        Math.max(1, Date.parse(lease.expiresAt) - Date.now()),
      ),
    )
  }
  async own<T>(
    ref: { id: string; generation: number },
    context: ToolContext,
    start: (lease: EnvironmentLease, signal: AbortSignal) => Promise<T>,
    serialize = true,
  ): Promise<T> {
    const operation = async () => {
      let result!: Promise<T>
      let item!: { abort: () => void; done: Promise<T> }
      await this.locks.with(ref.id, async () => {
        const lease = await this.validate(ref, context)
        if ((this.users.get(ref.id)?.size ?? 0) >= 8)
          throw new Error('Environment process quota reached')
        const abort = new AbortController()
        result = Promise.resolve().then(() =>
          start(lease, AbortSignal.any([context.signal, abort.signal])),
        )
        item = { abort: () => abort.abort(new Error('Environment lease revoked')), done: result }
        const users = this.users.get(ref.id) ?? new Set()
        users.add(item)
        this.users.set(ref.id, users)
      })
      try {
        return await result
      } finally {
        const users = this.users.get(ref.id)
        users?.delete(item)
        if (!users?.size) this.users.delete(ref.id)
      }
    }
    return serialize ? this.executionLocks.with(ref.id, operation) : operation()
  }
  async execute(
    ref: { id: string; generation: number },
    executable: string,
    args: string[],
    timeoutMs: number,
    context: ToolContext,
  ) {
    let broken = false
    try {
      return await this.own(ref, context, async (lease, signal) => {
        const container =
          lease.kind === 'container' ? await this.containers.inspect(lease, signal) : undefined
        if (lease.kind === 'container' && !container?.State.Running)
          throw new Error('Owned container is not running')
        let result: Awaited<ReturnType<Processes['run']>>
        try {
          result = await this.processes.run(
            {
              executable: lease.kind === 'container' ? 'docker' : executable,
              args:
                lease.kind === 'container'
                  ? ['exec', '--workdir', '/workspace', container?.Id ?? '', executable, ...args]
                  : args,
              cwd: lease.root,
              timeoutMs,
            },
            signal,
          )
        } catch (error) {
          broken = lease.kind === 'container'
          throw error
        }
        broken = lease.kind === 'container' && (result.reason !== 'exited' || signal.aborted)
        if (broken) throw new Error('Container execution interrupted; environment must be stopped')
        if (result.code !== 0 || result.reason !== 'exited')
          throw new Error('Environment process failed: ' + result.output)
        return result
      })
    } finally {
      if (
        (broken || context.signal.aborted) &&
        (await this.get(ref.id)).generation === ref.generation
      )
        await this.stop(ref.id, ref.generation)
    }
  }
  async stop(id: string, generation: number) {
    return this.stopLocks.with(id, async () => {
      const lease = await this.locks.with(id, async () => {
        const lease = await this.get(id)
        if (lease.generation !== generation) throw new Error('Environment generation changed')
        if (lease.state === 'destroyed' || lease.state === 'stopped') return lease
        lease.generation++
        lease.state = 'stopping'
        if (lease.desiredState !== 'destroyed') lease.desiredState = 'stopped'
        await this.save(lease)
        clearTimeout(this.timers.get(id))
        this.timers.delete(id)
        for (const item of this.users.get(id) ?? []) item.abort()
        return lease
      })
      await Promise.allSettled([...(this.users.get(id) ?? [])].map((item) => item.done))
      if (lease.state === 'destroyed' || lease.state === 'stopped') return lease
      try {
        if (lease.kind === 'container')
          await this.containers.stop(lease, AbortSignal.timeout(30000))
        lease.state = 'stopped'
        lease.elapsedMs = Date.now() - Date.parse(lease.createdAt)
        return await this.save(lease)
      } catch (error) {
        lease.state = 'unknown'
        lease.error = error instanceof Error ? error.message : 'Environment stop unconfirmed'
        await this.save(lease)
        throw error
      }
    })
  }
  async export(id: string, generation: number, signal: AbortSignal) {
    return this.locks.with(id, async () => {
      const lease = await this.get(id)
      if (lease.generation !== generation || lease.state !== 'stopped')
        throw new Error('Stop the environment before exporting its stable workspace')
      if (!lease.snapshotId)
        throw new Error(
          'Local workspace is preserved directly; capture a snapshot for isolated exports',
        )
      const exported = await this.exports.capture(lease.snapshotId, lease.root, signal)
      lease.export = exported.artifact
      await this.save(lease)
      return exported
    })
  }
  async destroy(id: string, generation: number, signal: AbortSignal) {
    return this.locks.with(id, async () => {
      const lease = await this.get(id)
      if (lease.generation !== generation) throw new Error('Environment generation changed')
      if (lease.state === 'destroyed') return lease
      if (lease.state !== 'stopped')
        throw new Error('Stop and drain the environment before destroying it')
      if (lease.kind !== 'local') {
        if (!lease.export) throw new Error('Export the environment changes before destroying it')
        if (await exists(lease.root)) {
          const current = await this.exports.capture(lease.snapshotId ?? '', lease.root, signal)
          if (current.artifact.sha256 !== lease.export.sha256)
            throw new Error('Workspace changed after export; export it again')
        }
      }
      lease.state = 'destroying'
      lease.desiredState = 'destroyed'
      await this.save(lease)
      try {
        if (lease.kind === 'container') await this.containers.destroy(lease, signal)
        if (lease.kind === 'worktree') {
          const expectedRoot = resolve(this.directory, 'worktrees', lease.worktreeId ?? '')
          if (resolve(lease.root) !== expectedRoot || !lease.worktreeId)
            throw new Error('Invalid owned worktree path')
          const workspaces = new Workspaces(this.store, this.processes, this.directory)
          const registered = (
            await workspaces.git(lease.workspace, ['worktree', 'list', '--porcelain', '-z'], signal)
          )
            .split('\0')
            .filter((value) => value.startsWith('worktree '))
            .some((value) => resolve(value.slice(9)) === expectedRoot)
          if (await exists(expectedRoot)) {
            if (
              !inside(resolve(this.directory, 'worktrees'), await realpath(expectedRoot)) ||
              !registered
            )
              throw new Error('Worktree ownership cannot be confirmed')
          }
          if (registered)
            await workspaces.git(
              lease.workspace,
              ['worktree', 'remove', '--force', expectedRoot],
              signal,
            )
        } else if (lease.kind === 'container') {
          const expectedRoot = resolve(this.directory, 'environments', lease.id, 'workspace')
          if (resolve(lease.root) !== expectedRoot)
            throw new Error('Invalid owned environment path')
          if (await exists(lease.root)) {
            if (!inside(resolve(this.directory, 'environments'), await realpath(lease.root)))
              throw new Error('Invalid owned environment path')
            await rm(expectedRoot, { recursive: true })
          }
        }
        lease.state = 'destroyed'
        lease.generation++
        return await this.save(lease)
      } catch (error) {
        lease.state = 'unknown'
        lease.error = error instanceof Error ? error.message : 'Environment destruction unconfirmed'
        await this.save(lease)
        throw error
      }
    })
  }
  async reconcile() {
    const reports: { id: string; state: string; error?: string }[] = []
    let after = ''
    do {
      const page = await this.list(after, liveStates)
      for (const lease of page.values) {
        try {
          let stopped = await this.stop(lease.id, lease.generation)
          if (stopped.desiredState === 'destroyed')
            stopped = await this.destroy(stopped.id, stopped.generation, AbortSignal.timeout(30000))
          reports.push({ id: stopped.id, state: stopped.state })
        } catch (error) {
          reports.push({ id: lease.id, state: 'unknown', error: String(error) })
        }
      }
      after = page.nextCursor ?? ''
    } while (after)
    return reports
  }
  async close() {
    this.closing = true
    for (const timer of this.timers.values()) clearTimeout(timer)
    this.timers.clear()
    return this.reconcile()
  }
}
