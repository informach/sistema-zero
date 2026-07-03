import type { CourseAudience } from '../../domain/course/course'
import { MAX_TASKS_PER_CYCLE, type PensaMission } from '../../domain/pensa/pensa'
import { PensaNotFoundError, PensaQuotaExceededError } from '../../domain/pensa/pensa.errors'
import type { NewPensaTask, PensaRepository } from '../../domain/ports/pensa-repository.port'
import { type PensaTaskView, toPensaTaskView } from '../mappers/pensa-views'

export interface ReplacePensaTaskInput {
  title: string
  summary?: string | null
  taskType?: string | null
  mission: PensaMission
}

/**
 * REPLACE total das tasks do ciclo (o plano de missões vem inteiro do cliente):
 * todas nascem `backlog` com `position` = índice do array. ≤60 → 409
 * PENSA_QUOTA_EXCEEDED (cota de use case, não do banco).
 */
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
    if (tasks.length > MAX_TASKS_PER_CYCLE) {
      throw new PensaQuotaExceededError(`Um ciclo aceita no máximo ${MAX_TASKS_PER_CYCLE} missões`)
    }

    const now = this.clock()
    const newTasks: NewPensaTask[] = tasks.map((task, index) => ({
      id: this.newId(),
      title: task.title,
      summary: task.summary ?? null,
      taskType: task.taskType ?? null,
      mission: task.mission,
      column: 'backlog',
      position: index,
      notes: null,
    }))
    await this.repo.replaceTasks(found.project.id, cycleId, newTasks, now)

    return newTasks.map((task) =>
      toPensaTaskView({ ...task, cycleId, createdAt: now, updatedAt: now }),
    )
  }
}
