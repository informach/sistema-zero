import type { CourseAudience } from '../../domain/course/course'
import {
  MAX_TASKS_PER_CYCLE,
  type PensaTaskCategory,
  type PensaTaskContext,
  type PensaTaskDestination,
  type PensaTaskGuide,
} from '../../domain/pensa/pensa'
import {
  PensaNotFoundError,
  PensaQuotaExceededError,
  PensaTaskLockedError,
} from '../../domain/pensa/pensa.errors'
import { validateTaskPlan } from '../../domain/pensa/task-plan'
import type { NewPensaTask, PensaRepository } from '../../domain/ports/pensa-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import { type PensaTaskView, toPensaTaskView } from '../mappers/pensa-views'

export interface ReplacePensaTaskInput {
  /** Chave estável apenas dentro do lote; dependências usam estas chaves. */
  key: string
  title: string
  summary?: string | null
  destination: PensaTaskDestination
  category: PensaTaskCategory
  estimatedMinutes: number
  dependencies?: string[]
  guide: PensaTaskGuide
  context: PensaTaskContext
}

export const plannedTask = (task: NewPensaTask, cycleId: string, now: Date) => ({
  ...task,
  cycleId,
  progress: {
    status: 'planned' as const,
    completedStepIds: [],
    completedCriteriaIds: [],
    outputRef: null,
    startedAt: null,
    completedAt: null,
    updatedAt: null,
  },
  revision: task.revision ?? 1,
  supersedesTaskId: task.supersedesTaskId ?? null,
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
})

export function validatePensaTaskInputs(
  tasks: ReplacePensaTaskInput[],
  knownDependencies: ReadonlySet<string> = new Set(),
): void {
  const keys = new Set<string>()
  for (const task of tasks) {
    if (!task.key.trim() || keys.has(task.key))
      throw new ValidationError('Cada tarefa precisa de uma chave única')
    keys.add(task.key)
    if (task.destination !== task.context.kind)
      throw new ValidationError('O contexto precisa corresponder ao destino')
    if (task.estimatedMinutes < 5 || task.estimatedMinutes > 240)
      throw new ValidationError('A estimativa precisa ficar entre 5 e 240 minutos')
  }
  for (const task of tasks) {
    if ((task.dependencies ?? []).some((key) => !keys.has(key) && !knownDependencies.has(key)))
      throw new ValidationError('Uma dependência não existe neste plano')
  }
}

export class ReplacePensaTasksService {
  constructor(
    private readonly repo: PensaRepository,
    private readonly newId: () => string,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    cycleId: string,
    tasks: ReplacePensaTaskInput[],
  ): Promise<PensaTaskView[]> {
    const found = await this.repo.findCycleWithProject(cycleId, userId, audience)
    if (!found) throw new PensaNotFoundError()
    if (tasks.length === 0) throw new ValidationError('O plano precisa de pelo menos uma tarefa')
    if (tasks.length > MAX_TASKS_PER_CYCLE)
      throw new PensaQuotaExceededError(
        `Uma versão aceita no máximo ${MAX_TASKS_PER_CYCLE} tarefas`,
      )
    const existing = await this.repo.listTasks(cycleId)
    if (existing.some((task) => task.progress.status !== 'planned'))
      throw new PensaTaskLockedError()
    validatePensaTaskInputs(tasks)

    const ids = new Map(tasks.map((task) => [task.key, this.newId()]))
    const newTasks: NewPensaTask[] = tasks.map((task, position) => ({
      id: ids.get(task.key) as string,
      title: task.title.trim(),
      summary: task.summary?.trim() || null,
      destination: task.destination,
      category: task.category,
      estimatedMinutes: task.estimatedMinutes,
      position,
      dependencies: (task.dependencies ?? []).map((key) => ids.get(key) as string),
      guide: task.guide,
      context: task.context,
    }))
    const now = this.clock()
    const validation = validateTaskPlan(newTasks.map((task) => plannedTask(task, cycleId, now)))
    if (!validation.ok)
      throw new ValidationError(validation.issues[0]?.message ?? 'Plano de tarefas inválido')
    await this.repo.replaceTasks(found.project.id, cycleId, newTasks, now)
    if (found.cycle.stage === 'done')
      await this.repo.reopenCycleReview(found.project.id, cycleId, now)
    return newTasks.map((task) => toPensaTaskView(plannedTask(task, cycleId, now)))
  }
}
