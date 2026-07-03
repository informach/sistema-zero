import type { CourseAudience } from '../../domain/course/course'
import {
  MAX_ARTIFACT_CONTENT_CHARS,
  type PensaArtifactType,
  type PensaWorkStage,
} from '../../domain/pensa/pensa'
import { PensaNotFoundError } from '../../domain/pensa/pensa.errors'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import { type PensaArtifactView, toPensaArtifactView } from '../mappers/pensa-views'

/**
 * Salva uma NOVA versão do artefato (append-only): `version = latest+1`, nasce
 * `draft`. Teto do contrato: `content` ≤262K chars stringificado → 400.
 */
export class SavePensaArtifactService {
  constructor(
    private readonly repo: PensaRepository,
    private readonly newId: () => string,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    cycleId: string,
    input: { stage: PensaWorkStage; type: PensaArtifactType; content: unknown },
  ): Promise<PensaArtifactView> {
    const found = await this.repo.findCycleWithProject(cycleId, userId, audience)
    if (!found) throw new PensaNotFoundError()

    // `undefined` não é JSON (stringify viraria a string ausente e o jsonb NOT NULL falharia).
    const serialized = input.content === undefined ? undefined : JSON.stringify(input.content)
    if (serialized === undefined) throw new ValidationError('O conteúdo do artefato é obrigatório')
    if (serialized.length > MAX_ARTIFACT_CONTENT_CHARS) {
      throw new ValidationError('O conteúdo do artefato é grande demais')
    }

    const artifact = await this.repo.insertArtifact(
      found.project.id,
      { id: this.newId(), cycleId, stage: input.stage, type: input.type, content: input.content },
      this.clock(),
    )
    return toPensaArtifactView(artifact)
  }
}
