import type { CourseAudience } from '../../domain/course/course'
import { MAX_TASKS_PER_CYCLE } from '../../domain/pensa/pensa'
import { PensaNotFoundError, PensaQuotaExceededError } from '../../domain/pensa/pensa.errors'
import type { NewPensaTask, PensaRepository } from '../../domain/ports/pensa-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import { type PensaTaskView, toPensaTaskView } from '../mappers/pensa-views'
import type { ReplacePensaTaskInput } from './replace-tasks.service'

/**
 * ADICIONA missões ao FIM do backlog SEM apagar as existentes — a criança
 * autora à mão ("+ Nova missão") e o "sugerir mais missões" (regeneração
 * NÃO-destrutiva) usam esta rota em vez do PUT (replace, que zera o quadro).
 * Total > 60 → 409 PENSA_QUOTA_EXCEEDED. Nascem `backlog` após o maior position.
 */
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
    if (tasks.length === 0) throw new ValidationError('Nenhuma missão para adicionar')

    const existing = await this.repo.listTasks(cycleId)
    if (existing.length + tasks.length > MAX_TASKS_PER_CYCLE) {
      throw new PensaQuotaExceededError(`Um ciclo aceita no máximo ${MAX_TASKS_PER_CYCLE} missões`)
    }
    // As novas entram no FIM do backlog (após o maior position que já existe lá).
    const backlogMax = existing
      .filter((t) => t.column === 'backlog')
      .reduce((max, t) => Math.max(max, t.position), -1)

    const now = this.clock()
    const newTasks: NewPensaTask[] = tasks.map((task, index) => ({
      id: this.newId(),
      title: task.title,
      summary: task.summary ?? null,
      taskType: task.taskType ?? null,
      mission: task.mission,
      column: 'backlog',
      position: backlogMax + 1 + index,
      notes: null,
    }))
    await this.repo.appendTasks(found.project.id, cycleId, newTasks, now)

    return newTasks.map((task) =>
      toPensaTaskView({ ...task, cycleId, createdAt: now, updatedAt: now }),
    )
  }
}
