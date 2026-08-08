import type { CourseAudience } from '../../domain/course/course'
import { PensaNotFoundError } from '../../domain/pensa/pensa.errors'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'
import { toPensaTaskView } from '../mappers/pensa-views'

export class GetPensaTaskHandoffService {
  constructor(private readonly repo: PensaRepository) {}

  async execute(userId: string, audience: CourseAudience, taskId: string) {
    const found = await this.repo.findTaskWithProject(taskId, userId, audience)
    if (!found) throw new PensaNotFoundError()
    return {
      task: toPensaTaskView(found.task),
      project: { id: found.project.id, name: found.project.name },
      cycle: { id: found.cycle.id, number: found.cycle.number, goal: found.cycle.goal },
    }
  }
}
