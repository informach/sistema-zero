import type { CourseAudience } from '../../domain/course/course'
import { PensaNotFoundError } from '../../domain/pensa/pensa.errors'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'
import { toPensaTaskView } from '../mappers/pensa-views'
import { pensaTaskTeamBlock } from './team-roles'

export class GetPensaTaskHandoffService {
  constructor(private readonly repo: PensaRepository) {}

  /**
   * `teamBlock` (equipe no v2, 14/10/2026): a missão é da outra função ou já foi pega por outra
   * artista. A rota o transforma em `capability: {owned: false, blockedReason}` no handoff e no
   * 403/409 da rota de progresso; ele não vai na resposta.
   */
  async execute(userId: string, audience: CourseAudience, taskId: string) {
    const found = await this.repo.findTaskWithProject(taskId, userId, audience)
    if (!found) throw new PensaNotFoundError()
    return {
      task: toPensaTaskView(found.task),
      project: { id: found.project.id, name: found.project.name },
      cycle: { id: found.cycle.id, number: found.cycle.number, goal: found.cycle.goal },
      teamBlock: await pensaTaskTeamBlock(this.repo, found, userId),
    }
  }
}
