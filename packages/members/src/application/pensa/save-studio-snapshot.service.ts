import type { CourseAudience } from '../../domain/course/course'
import { MAX_STUDIO_SNAPSHOT_CHARS } from '../../domain/pensa/pensa'
import { PensaNotFoundError } from '../../domain/pensa/pensa.errors'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'
import { ValidationError } from '../../domain/shared/errors'

/**
 * Grava o snapshot do Estúdio na NUVEM (last-write-wins): `content` tem que ser
 * objeto PLAIN (o Project serializado do Estúdio) e ≤1.8M chars stringificado
 * (cap do contrato → 400). Grava `studio_snapshot` + `studio_snapshot_at = now`
 * e toca o `updated_at` do projeto (a lista ordena por ele).
 */
export class SavePensaStudioSnapshotService {
  constructor(
    private readonly repo: PensaRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    projectId: string,
    content: unknown,
  ): Promise<{ updatedAt: string }> {
    const project = await this.repo.findProject(projectId, userId, audience)
    if (!project) throw new PensaNotFoundError()

    // Objeto PLAIN obrigatório: array/null/primitivo não é um Project do Estúdio.
    if (typeof content !== 'object' || content === null || Array.isArray(content)) {
      throw new ValidationError('O snapshot precisa ser um objeto')
    }
    const serialized = JSON.stringify(content)
    if (serialized.length > MAX_STUDIO_SNAPSHOT_CHARS) {
      throw new ValidationError('O snapshot do Estúdio é grande demais')
    }

    const now = this.clock()
    await this.repo.saveStudioSnapshot(projectId, content as Record<string, unknown>, now)
    return { updatedAt: now.toISOString() }
  }
}
