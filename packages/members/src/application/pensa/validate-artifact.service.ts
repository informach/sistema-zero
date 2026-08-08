import type { CourseAudience } from '../../domain/course/course'
import type { PensaArtifactType, PensaWorkStage } from '../../domain/pensa/pensa'
import { PensaNotFoundError, PensaStageMismatchError } from '../../domain/pensa/pensa.errors'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'
import { type PensaArtifactView, toPensaArtifactView } from '../mappers/pensa-views'

/**
 * Marca o artefato LATEST do (cycle, type) como `validated` (é o que destrava os
 * gates do advance). Sem artefato do type → 404. Idempotente (revalidar = no-op).
 */
export class ValidatePensaArtifactService {
  constructor(
    private readonly repo: PensaRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    cycleId: string,
    type: PensaArtifactType,
  ): Promise<PensaArtifactView> {
    const found = await this.repo.findCycleWithProject(cycleId, userId, audience)
    if (!found) throw new PensaNotFoundError()

    const expectedStage: Record<PensaArtifactType, PensaWorkStage> = {
      idea: 'z',
      game_design: 'e',
      visual_direction: 'e',
      task_plan: 'r',
      plan_review: 'o',
    }
    if (found.cycle.stage !== expectedStage[type]) throw new PensaStageMismatchError()

    const latest = await this.repo.findLatestArtifact(cycleId, type)
    if (!latest) throw new PensaNotFoundError('Nenhum artefato deste tipo neste ciclo')

    const validated = await this.repo.validateArtifact(found.project.id, latest.id, this.clock())
    return toPensaArtifactView(validated)
  }
}
