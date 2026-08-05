import type { CourseAudience } from '../../domain/course/course'
import { MAX_TASKS_PER_CYCLE } from '../../domain/pensa/pensa'
import { PensaNotFoundError, PensaQuotaExceededError } from '../../domain/pensa/pensa.errors'
import { validateTaskPlan } from '../../domain/pensa/task-plan'
import type { NewPensaTask, PensaRepository } from '../../domain/ports/pensa-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import { type PensaTaskView, toPensaTaskView } from '../mappers/pensa-views'
import {
  plannedTask,
  type ReplacePensaTaskInput,
  validatePensaTaskInputs,
} from './replace-tasks.service'

export class AppendPensaTasksService {
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
    if (tasks.length === 0) throw new ValidationError('Nenhuma tarefa para adicionar')
    const existing = await this.repo.listTasks(cycleId)
    if (existing.length + tasks.length > MAX_TASKS_PER_CYCLE)
      throw new PensaQuotaExceededError(
        `Uma versão aceita no máximo ${MAX_TASKS_PER_CYCLE} tarefas`,
      )
    const keys = new Map(tasks.map((task) => [task.key, this.newId()]))
    const existingIds = new Set(existing.map((task) => task.id))
    validatePensaTaskInputs(tasks, existingIds)
    const start = existing.reduce((max, task) => Math.max(max, task.position), -1) + 1
    const newTasks: NewPensaTask[] = tasks.map((task, index) => ({
      id: keys.get(task.key) as string,
      title: task.title.trim(),
      summary: task.summary?.trim() || null,
      destination: task.destination,
      category: task.category,
      estimatedMinutes: task.estimatedMinutes,
      position: start + index,
      dependencies: (task.dependencies ?? []).map((id) => {
        const resolved = keys.get(id) ?? id
        if (![...keys.values()].includes(resolved) && !existingIds.has(resolved)) {
          throw new ValidationError('Uma dependência não existe neste plano')
        }
        return resolved
      }),
      guide: task.guide,
      context: task.context,
    }))
    const now = this.clock()
    const prospective = [...existing, ...newTasks.map((task) => plannedTask(task, cycleId, now))]
    const validation = validateTaskPlan(prospective)
    if (!validation.ok)
      throw new ValidationError(validation.issues[0]?.message ?? 'Plano de tarefas inválido')
    await this.repo.appendTasks(found.project.id, cycleId, newTasks, now)
    if (found.cycle.stage === 'done')
      await this.repo.reopenCycleReview(found.project.id, cycleId, now)
    return newTasks.map((task) => toPensaTaskView(plannedTask(task, cycleId, now)))
  }
}
