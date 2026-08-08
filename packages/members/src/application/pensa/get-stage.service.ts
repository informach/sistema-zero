import type { CourseAudience } from '../../domain/course/course'
import type { PensaStage } from '../../domain/pensa/pensa'
import { PensaNotFoundError } from '../../domain/pensa/pensa.errors'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'
import { type PensaStageView, toPensaStageView } from '../mappers/pensa-views'

/**
 * View de UMA etapa do ciclo: conversa (mensagens/summary/messageCount) + state
 * + artefatos LATEST por type DESTA etapa. Ownership pelo projeto dono → 404.
 */
export class GetPensaStageService {
  constructor(private readonly repo: PensaRepository) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    cycleId: string,
    stage: PensaStage,
  ): Promise<PensaStageView> {
    const found = await this.repo.findCycleWithProject(cycleId, userId, audience)
    if (!found) throw new PensaNotFoundError()

    const [conversation, artifacts, tasks] = await Promise.all([
      this.repo.getConversation(cycleId, stage),
      this.repo.listLatestArtifactsByStage(cycleId, stage),
      // O plano e o progresso vivo aparecem em toda etapa para "Meu plano".
      this.repo.listTasks(cycleId),
    ])
    return toPensaStageView(stage, conversation, artifacts, tasks)
  }
}
