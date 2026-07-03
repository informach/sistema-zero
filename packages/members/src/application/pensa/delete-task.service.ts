import type { CourseAudience } from '../../domain/course/course'
import { PensaNotFoundError } from '../../domain/pensa/pensa.errors'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'

/**
 * Apaga UMA missão do kanban (autoria manual). Ownership pelo projeto dono → 404.
 * Deixar um buraco de `position` é inócuo (a ordem é relativa; os moves re-densam).
 */
export class DeletePensaTaskService {
  constructor(
    private readonly repo: PensaRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(userId: string, audience: CourseAudience, taskId: string): Promise<void> {
    const found = await this.repo.findTaskWithProject(taskId, userId, audience)
    if (!found) throw new PensaNotFoundError()
    await this.repo.deleteTask(found.project.id, taskId, this.clock())
  }
}
