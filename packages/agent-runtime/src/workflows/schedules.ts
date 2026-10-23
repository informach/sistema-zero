import {
  artifactSchema,
  canonical,
  runSchema,
  scheduleSpecSchema,
  type ToolContext,
  ToolRejected,
  terminalStates,
} from '@sistemazero/agent-core'
import { z } from 'zod'
import { JournalDriver } from '../execution/journal-driver'
import { Locks } from '../execution/locks'
import { Artifacts } from '../store/artifacts'
import type { Supervisor } from '../supervisor'
import { hash } from '../tools/paths'
import type { Workflows } from './runner'

const scheduleRecordSchema = z.object({
  id: z.string(),
  intentDigest: z.string(),
  generation: z.number(),
  state: z.enum(['enabled', 'disabled']),
  sessionId: z.string(),
  workspace: z.string(),
  digest: z.string(),
  inputs: artifactSchema,
  spec: scheduleSpecSchema,
  backend: runSchema.shape.backend,
  model: z.string(),
  mode: z.literal('build'),
  maxCost: z.number(),
  maxSteps: z.number(),
  allowedTools: z.array(z.string()).optional(),
  lastChecked: z.number(),
  nextAt: z.number(),
  createdAt: z.string(),
  error: z.string().optional(),
  execution: z.literal('while_supervisor_running'),
})
const occurrenceSchema = z.object({
  id: z.string(),
  scheduleId: z.string(),
  generation: z.number(),
  at: z.number(),
  key: z.string(),
  state: z.enum(['prepared', 'running', 'finished', 'skipped', 'interrupted']),
  runId: z.string().optional(),
  workflowId: z.string(),
  intentId: z.string(),
  result: z.string().optional(),
})
type ScheduleRecord = z.infer<typeof scheduleRecordSchema>
export class Schedules {
  private locks = new Locks()
  private artifacts: Artifacts
  private driver: JournalDriver
  private closed = false
  constructor(
    private supervisor: Supervisor,
    private workflows: Workflows,
    private now: () => number = Date.now,
  ) {
    this.artifacts = new Artifacts(supervisor.directory)
    this.driver = new JournalDriver(
      supervisor,
      () => this.tick(),
      (mutation) =>
        mutation.op === 'run.state' ||
        mutation.namespaces.some(
          (name) => name === 'schedules' || name === 'workflows' || name === 'schedule-occurrences',
        ),
    )
  }
  async list(after = '', states?: string[]) {
    return z
      .object({ values: z.array(scheduleRecordSchema), nextCursor: z.string().optional() })
      .parse(
        await this.supervisor.store.call({
          op: 'document.page',
          namespace: 'schedules',
          after,
          states,
          limit: 50,
        }),
      )
  }
  private async save(record: ScheduleRecord) {
    await this.supervisor.store.call({
      op: 'document.put',
      namespace: 'schedules',
      id: record.id,
      value: record,
    })
    return record
  }
  async initialize() {
    this.driver.start()
  }
  async create(
    input: {
      intentId: string
      digest: string
      inputs: unknown
      spec: unknown
      execution: 'while_supervisor_running'
    },
    context: ToolContext,
  ) {
    if (this.closed) throw new Error('Schedule coordinator stopped')
    if (context.run.mode !== 'build' || context.run.parentId)
      throw new ToolRejected(
        'SCHEDULE_SCOPE',
        'Schedules must be created by a top-level Build task',
      )
    const { validateSchedule, nextOccurrence } = await import('./schedule')
    const spec = validateSchedule(input.spec)
    const compiled = await this.workflows.definition(input.digest)
    await this.workflows.compiler.validator.validate(compiled.document.inputSchema, input.inputs)
    if (Buffer.byteLength(JSON.stringify(input.inputs)) > 256000)
      throw new Error('Schedule inputs exceed 256 KB')
    const id = hash(
      canonical({ sessionId: context.run.sessionId, intentId: input.intentId }),
    ).slice(0, 40)
    const intentDigest = hash(
      canonical({ digest: input.digest, inputs: input.inputs, spec, execution: input.execution }),
    )
    return this.locks.with('create', async () => {
      const existing = await this.supervisor.store.call({
        op: 'document.get',
        namespace: 'schedules',
        id,
      })
      if (existing) {
        const record = scheduleRecordSchema.parse(existing)
        if (record.intentDigest !== intentDigest)
          throw new ToolRejected('SCHEDULE_INTENT', 'Schedule intent changed')
        return record
      }
      if ((await this.list('', ['enabled'])).values.length >= 32)
        throw new ToolRejected('SCHEDULE_CAPACITY', 'At most 32 enabled schedules per profile')
      const now = this.now()
      return this.save(
        scheduleRecordSchema.parse({
          id,
          intentDigest,
          generation: 1,
          state: 'enabled',
          sessionId: context.run.sessionId,
          workspace: context.workspace,
          digest: input.digest,
          inputs: await this.artifacts.put(JSON.stringify(input.inputs), 'application/json', {
            pinned: true,
          }),
          spec,
          backend: context.run.backend,
          model: context.run.model,
          mode: 'build',
          maxCost: context.run.maxCost,
          maxSteps: context.run.maxSteps,
          allowedTools: context.run.allowedTools,
          lastChecked: now,
          nextAt: nextOccurrence(spec, now).at,
          createdAt: new Date(now).toISOString(),
          execution: input.execution,
        }),
      )
    })
  }
  private async occurrences() {
    return z.object({ values: z.array(occurrenceSchema), nextCursor: z.string().optional() }).parse(
      await this.supervisor.store.call({
        op: 'document.page',
        namespace: 'schedule-occurrences',
        after: '',
        states: ['prepared', 'running'],
        limit: 100,
      }),
    )
  }
  async tick() {
    if (this.closed) return
    return this.locks.with('tick', async () => {
      const schedules = (await this.list('', ['enabled'])).values
      const records = new Map(schedules.map((schedule) => [schedule.id, schedule]))
      let active = (await this.occurrences()).values
      for (const occurrence of active.filter((item) => item.state === 'running')) {
        const raw = await this.supervisor.store.call({
          op: 'document.get',
          namespace: 'workflows',
          id: occurrence.workflowId,
        })
        if (raw) {
          const workflow = await this.workflows.get(occurrence.workflowId)
          if (['succeeded', 'failed', 'canceled'].includes(workflow.state)) {
            occurrence.state = 'finished'
            occurrence.result = workflow.state
          }
        } else if (occurrence.runId) {
          const run = runSchema.parse(
            await this.supervisor.store.call({ op: 'run.get', id: occurrence.runId }),
          )
          if (terminalStates.has(run.state)) {
            occurrence.state = 'interrupted'
            occurrence.result = run.error ?? run.state
          }
        }
        if (occurrence.state !== 'running')
          await this.supervisor.store.call({
            op: 'document.put',
            namespace: 'schedule-occurrences',
            id: occurrence.id,
            value: occurrence,
          })
      }
      const now = this.now()
      for (const schedule of schedules) {
        if (schedule.nextAt > now) continue
        try {
          const { dueOccurrences, nextOccurrence } = await import('./schedule')
          const due = dueOccurrences(schedule.spec, schedule.lastChecked, now)
          const pending = active.filter(
            (item) =>
              item.scheduleId === schedule.id && ['prepared', 'running'].includes(item.state),
          )
          const documents: { namespace: string; id: string; value: unknown }[] = []
          const candidates = due.occurrences
          for (let index = 0; index < candidates.length; index++) {
            const due = candidates[index]
            if (!due) continue
            const id = hash(
              canonical({
                schedule: schedule.id,
                generation: schedule.generation,
                occurrence: due.key,
              }),
            ).slice(0, 40)
            if (
              await this.supervisor.store.call({
                op: 'document.get',
                namespace: 'schedule-occurrences',
                id,
              })
            )
              continue
            const intentId = `schedule-${id}`
            const capacity =
              schedule.spec.overlap === 'skip'
                ? 1
                : schedule.spec.overlap === 'queue_one'
                  ? 2
                  : schedule.spec.maxCatchUp + 1
            const skip = pending.length >= capacity || active.length >= 64
            const occurrence = occurrenceSchema.parse({
              id,
              scheduleId: schedule.id,
              generation: schedule.generation,
              at: due.at,
              key: due.key,
              state: skip ? 'skipped' : 'prepared',
              workflowId: hash(canonical({ session: schedule.sessionId, intentId })).slice(0, 40),
              intentId,
              result: skip ? 'overlap policy' : undefined,
            })
            documents.push({ namespace: 'schedule-occurrences', id, value: occurrence })
            if (!skip) {
              pending.push(occurrence)
              active.push(occurrence)
            }
          }
          schedule.lastChecked = Math.max(schedule.lastChecked, now)
          schedule.nextAt = nextOccurrence(schedule.spec, now).at
          schedule.error = undefined
          documents.push({ namespace: 'schedules', id: schedule.id, value: schedule })
          if (due.omitted || due.truncated)
            documents.push({
              namespace: 'schedule-audit',
              id: crypto.randomUUID(),
              value: {
                scheduleId: schedule.id,
                at: now,
                omitted: due.omitted,
                truncated: due.truncated,
              },
            })
          await this.supervisor.store.call({ op: 'document.batch', documents })
        } catch (error) {
          schedule.state = 'disabled'
          schedule.error = String(error).slice(0, 2000)
          await this.save(schedule)
        }
      }
      active = (await this.occurrences()).values
      for (const occurrence of active
        .filter((item) => item.state === 'prepared')
        .sort((a, b) => a.at - b.at)) {
        const schedule = records.get(occurrence.scheduleId)
        if (schedule?.state !== 'enabled' || schedule.generation !== occurrence.generation) {
          occurrence.state = 'skipped'
          occurrence.result = 'schedule disabled or revoked'
          await this.supervisor.store.call({
            op: 'document.put',
            namespace: 'schedule-occurrences',
            id: occurrence.id,
            value: occurrence,
          })
          continue
        }
        if (active.some((item) => item.scheduleId === schedule.id && item.state === 'running'))
          continue
        if (this.closed) return
        try {
          const inputs = JSON.parse((await this.artifacts.read(schedule.inputs)).toString('utf8'))
          await this.supervisor.submit(
            {
              requestId: `occurrence:${occurrence.id}`,
              sessionId: schedule.sessionId,
              input: `Scheduled workflow ${schedule.id} / ${occurrence.key}`,
              backend: schedule.backend,
              model: schedule.model,
              mode: 'build',
              maxCost: schedule.maxCost,
              maxSteps: schedule.maxSteps,
              ...(schedule.allowedTools ? { allowedTools: schedule.allowedTools } : {}),
              task: {
                kind: 'tool',
                name: 'workflow_start',
                arguments: { intentId: occurrence.intentId, digest: schedule.digest, inputs },
              },
            },
            async (run) => {
              occurrence.runId = run.id
              occurrence.state = 'running'
              await this.supervisor.store.call({
                op: 'document.guarded',
                guards: [
                  {
                    namespace: 'schedules',
                    id: schedule.id,
                    field: 'generation',
                    equals: occurrence.generation,
                  },
                  { namespace: 'schedules', id: schedule.id, field: 'state', equals: 'enabled' },
                ],
                documents: [
                  { namespace: 'schedule-occurrences', id: occurrence.id, value: occurrence },
                ],
              })
            },
          )
        } catch (error) {
          occurrence.state = 'interrupted'
          occurrence.result = String(error).slice(0, 2000)
          await this.supervisor.store.call({
            op: 'document.put',
            namespace: 'schedule-occurrences',
            id: occurrence.id,
            value: occurrence,
          })
        }
      }
      return schedules
        .filter((schedule) => schedule.state === 'enabled')
        .reduce<number | undefined>(
          (next, schedule) => Math.min(next ?? schedule.nextAt, schedule.nextAt),
          undefined,
        )
    })
  }
  async disable(id: string, context?: ToolContext) {
    return this.locks.with('tick', async () => {
      const schedule = scheduleRecordSchema.parse(
        await this.supervisor.store.call({ op: 'document.get', namespace: 'schedules', id }),
      )
      if (
        context &&
        (schedule.sessionId !== context.run.sessionId || schedule.workspace !== context.workspace)
      )
        throw new ToolRejected('SCHEDULE_OWNER', 'Schedule belongs to another session or workspace')
      if (schedule.state === 'disabled') return schedule
      schedule.state = 'disabled'
      schedule.generation++
      return this.save(schedule)
    })
  }
  async close() {
    this.closed = true
    await this.driver.close()
  }
}
