import type { CourseAudience } from '../../domain/course/course'
import { PensaNotFoundError, PensaTaskLockedError } from '../../domain/pensa/pensa.errors'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'
import { ValidationError } from '../../domain/shared/errors'

export class DeletePensaTaskService {
  constructor(
    private readonly repo: PensaRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(userId: string, audience: CourseAudience, taskId: string): Promise<void> {
    const found = await this.repo.findTaskWithProject(taskId, userId, audience)
    if (!found) throw new PensaNotFoundError()
    if (found.task.progress.status !== 'planned') throw new PensaTaskLockedError()
    const tasks = await this.repo.listTasks(found.cycle.id)
    if (tasks.some((task) => task.dependencies.includes(taskId))) {
      throw new ValidationError('Remova esta dependência dos cartões seguintes antes de apagar')
    }
    const now = this.clock()
    await this.repo.deleteTask(found.project.id, taskId, now)
    if (found.cycle.stage === 'done')
      await this.repo.reopenCycleReview(found.project.id, found.cycle.id, now)
  }
}
