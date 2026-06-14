import { ContentNotFoundError } from '../../domain/course/course.errors'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'

export interface StudioSubmissionSummaryView {
  userId: string
  submittedAt: string
}

export interface StudioSubmissionDetailView {
  /** Snapshot `Project` do Estúdio enviado pelo aluno — importável no Estúdio do professor. */
  project: unknown
  submittedAt: string
}

/**
 * Acompanhamento das entregas do Estúdio pelo professor (admin). A identidade
 * (nome/e-mail) é hidratada pelo BFF do admin via auth — aqui só o userId + data
 * (lista) e o projeto inteiro (abrir no Estúdio embutido).
 */
export class StudioSubmissionsAdminService {
  constructor(private readonly submissions: StudioSubmissionRepository) {}

  async list(blockId: string): Promise<StudioSubmissionSummaryView[]> {
    const rows = await this.submissions.listByBlock(blockId)
    return rows.map((r) => ({ userId: r.userId, submittedAt: r.submittedAt.toISOString() }))
  }

  async getOne(userId: string, blockId: string): Promise<StudioSubmissionDetailView> {
    const row = await this.submissions.getOne(userId, blockId)
    if (!row) throw new ContentNotFoundError('Entrega não encontrada')
    return { project: row.project, submittedAt: row.submittedAt.toISOString() }
  }
}
