import type { CourseAudience } from '../../domain/course/course'
import { PensaNotFoundError } from '../../domain/pensa/pensa.errors'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'

export interface PensaStudioSnapshotView {
  /** O projeto do Estúdio serializado (JSON opaco) — `null` = nunca salvo. */
  project: unknown
  /** Quando foi salvo por último (ISO) — `null` = nunca salvo. */
  updatedAt: string | null
}

/**
 * Snapshot do Estúdio na NUVEM (backup do jogo atrelado ao projeto do Pensa).
 * Ownership → 404 (nunca vaza existência); o blob só sai AQUI (a detail view
 * traz apenas o `studioSnapshotAt`).
 */
export class GetPensaStudioSnapshotService {
  constructor(private readonly repo: PensaRepository) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    projectId: string,
  ): Promise<PensaStudioSnapshotView> {
    const project = await this.repo.findProject(projectId, userId, audience)
    if (!project) throw new PensaNotFoundError()

    const { snapshot, snapshotAt } = await this.repo.getStudioSnapshot(projectId)
    return { project: snapshot ?? null, updatedAt: snapshotAt ? snapshotAt.toISOString() : null }
  }
}
