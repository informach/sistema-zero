import { createHash } from 'node:crypto'
import { statfs } from 'node:fs/promises'
import {
  authorize,
  canonical,
  effectSchema,
  type Run,
  type ToolDefinition,
  type ToolOutcome,
  ToolRejected,
} from '@sistemazero/agent-core'
import { Artifacts } from '../store/artifacts'
import type { Supervisor } from '../supervisor'
import { Capacity } from './capacity'
import { Grants } from './grants'
import { Locks } from './locks'

export class Dispatcher {
  readonly tools = new Map<string, ToolDefinition>()
  private locks = new Locks()
  private readers = new Capacity(8)
  private builds = new Map<string, { gate: Capacity; users: number }>()
  private async admission(effect: string, workspace: string, name: string, signal: AbortSignal) {
    if (effect === 'read') return this.readers.acquire(signal)
    // Coordinators and long-lived services have their own quotas; only heavy foreground jobs serialize.
    if (!['process_run', 'project_check_run', 'environment_run'].includes(name)) return () => {}
    const key = process.platform === 'win32' ? workspace.toLowerCase() : workspace
    let item = this.builds.get(key)
    if (!item) {
      item = { gate: new Capacity(1), users: 0 }
      this.builds.set(key, item)
    }
    item.users++
    const current = item
    const done = () => {
      if (--current.users === 0) this.builds.delete(key)
    }
    try {
      const release = await current.gate.acquire(signal)
      return () => {
        release()
        done()
      }
    } catch (error) {
      done()
      throw error
    }
  }
  get grants() {
    return new Grants(this.supervisor.store)
  }
  constructor(readonly supervisor: Supervisor) {}
  register(tool: ToolDefinition) {
    if (this.tools.has(tool.definition.name))
      throw new Error(`Duplicate tool ${tool.definition.name}`)
    this.tools.set(tool.definition.name, tool)
  }
  async dispatch(
    run: Run,
    workspace: string,
    invocationId: string,
    name: string,
    input: unknown,
    signal: AbortSignal,
  ): Promise<ToolOutcome> {
    return this.locks.with(invocationId, async () => {
      const operation = () =>
        Artifacts.owned(run.id, () =>
          this.execute(run, workspace, invocationId, name, input, signal),
        )
      if (this.tools.get(name)?.definition.effect !== 'external') return operation()
      const key = createHash('sha256').update(canonical({ name, input, workspace })).digest('hex')
      return this.locks.with(`external:${key}`, operation)
    })
  }
  private async execute(
    run: Run,
    workspace: string,
    invocationId: string,
    name: string,
    input: unknown,
    signal: AbortSignal,
  ): Promise<ToolOutcome> {
    signal.throwIfAborted()
    const tool = this.tools.get(name)
    if (!tool)
      return {
        kind: 'failed',
        code: 'UNKNOWN_TOOL',
        message: `Unknown tool ${name}`,
        retry: 'never',
      }
    const digest = createHash('sha256')
      .update(canonical({ capability: tool.definition, input, workspace }))
      .digest('hex')
    const operationDigest = createHash('sha256')
      .update(canonical({ name, input, workspace }))
      .digest('hex')
    const decision = authorize(run, tool.definition)
    if (decision === 'deny')
      return {
        kind: 'failed',
        code: 'POLICY_DENIED',
        message: 'Plan mode does not permit this operation',
        retry: 'never',
      }
    const existing = await this.supervisor.store.call({ op: 'effect.get', id: invocationId })
    if (existing) {
      const effect = effectSchema.parse(existing)
      if (effect.digest !== digest || effect.runId !== run.id)
        throw new Error('Invocation identity reused')
      return (
        effect.outcome ?? {
          kind: 'unknown',
          effectId: effect.id,
          reason: 'Invocation exists; reconcile before retry',
        }
      )
    }
    if (tool.definition.effect === 'external') {
      const unresolved = await this.supervisor.store.call({
        op: 'effect.uncertain',
        operationDigest,
      })
      if (unresolved) {
        const prior = effectSchema.parse(unresolved)
        return {
          kind: 'unknown',
          effectId: prior.id,
          reason:
            'An earlier identical external effect is unresolved. Reconcile it before dispatching again.',
        }
      }
    }
    try {
      await tool.validate?.(input)
      if (tool.definition.effect !== 'read') {
        const disk = await statfs(this.supervisor.directory, { bigint: true })
        if (disk.bavail * disk.bsize < BigInt(64 * 1024 ** 2))
          throw new Error(
            'Insufficient free disk for durable effect journal; free at least 64 MiB before dispatch',
          )
      }
    } catch (error) {
      return {
        kind: 'failed',
        code: 'INVALID_INPUT',
        message: error instanceof Error ? error.message.slice(0, 4000) : 'Invalid tool input',
        retry: 'never',
      }
    }
    if (decision === 'approve' && !(await this.grants.allows(run, workspace, name, digest))) {
      const preview = JSON.stringify(input, null, 2)
      if (Buffer.byteLength(preview) > 12000)
        return {
          kind: 'failed',
          code: 'APPROVAL_TOO_LARGE',
          message: 'Split this operation into reviewable steps',
          retry: 'never',
        }
      const answer = await this.supervisor.ask(
        run,
        `${name}\n${preview}\nallow_session autoriza somente estes mesmos argumentos nesta sessão, por até 8 horas.`,
        ['approve', 'allow_session', 'deny'],
        'approval',
        digest,
        signal,
      )
      if (answer !== 'approve' && answer !== 'allow_session')
        return { kind: 'failed', code: 'DENIED', message: 'Operation not approved', retry: 'never' }
      if (answer === 'allow_session') await this.grants.issue(run, workspace, name, digest)
    }
    signal.throwIfAborted()
    const release = await this.admission(tool.definition.effect, workspace, name, signal)
    try {
      signal.throwIfAborted()
      const intentStarted = performance.now()
      const effect = {
        id: invocationId,
        runId: run.id,
        capability: name,
        digest,
        operationDigest,
        state: 'prepared' as const,
      }
      await this.supervisor.store.call({ op: 'effect.put', value: effect })
      signal.throwIfAborted()
      await this.supervisor.store.call({
        op: 'effect.put',
        value: { ...effect, state: 'dispatched' },
      })
      const intentMs = performance.now() - intentStarted
      const executeStarted = performance.now()
      let outcome: ToolOutcome
      try {
        signal.throwIfAborted()
        const value = await tool.execute(input, {
          run,
          workspace,
          signal,
          ask: (prompt, options) =>
            this.supervisor.ask(run, prompt, options, 'input', undefined, signal),
        })
        const encoded = JSON.stringify(value)
        if (encoded === undefined) throw new Error('Tool returned a non-JSON result')
        if (Buffer.byteLength(encoded) > 48000) {
          const artifact = await new Artifacts(this.supervisor.directory).put(
            encoded,
            'application/json',
          )
          outcome = {
            kind: 'ok',
            value: { preview: encoded.slice(0, 4000), truncated: true },
            artifacts: [artifact],
            valueArtifact: artifact,
          }
        } else outcome = { kind: 'ok', value, artifacts: [] }
      } catch (error) {
        outcome =
          tool.definition.effect === 'external' && !(error instanceof ToolRejected)
            ? {
                kind: 'unknown',
                effectId: invocationId,
                reason: 'External operation was dispatched without a confirmed result',
              }
            : {
                kind: 'failed',
                code:
                  error instanceof ToolRejected
                    ? error.code
                    : signal.aborted
                      ? 'CANCELED'
                      : 'TOOL_FAILED',
                message: error instanceof Error ? error.message.slice(0, 16000) : 'Tool failed',
                retry: tool.definition.effect === 'read' ? 'read' : 'never',
              }
      }
      await this.supervisor.store.call({
        op: 'effect.put',
        value: {
          ...effect,
          state:
            outcome.kind === 'ok' ? 'confirmed' : outcome.kind === 'failed' ? 'failed' : 'unknown',
          outcome,
        },
      })
      await this.supervisor.emit(run.id, 'metric.tool', {
        traceId: run.rootId ?? run.id,
        runId: run.id,
        invocationId,
        capability: name,
        backend: run.backend,
        intentMs,
        executeAndCommitMs: performance.now() - executeStarted,
        outcome: outcome.kind,
      })
      return outcome
    } finally {
      release()
    }
  }
}
