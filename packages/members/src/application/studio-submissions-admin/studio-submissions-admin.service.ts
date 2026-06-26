import { ContentNotFoundError } from '../../domain/course/course.errors'
import type { StudioCheckResult } from '../../domain/course/studio-activity'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'

export interface StudioSubmissionSummaryView {
  /** Quem entregou (perfil da criança no kids; a conta no adulto). */
  userId: string
  /** Conta responsável (kids: o pai; adulto: = userId). `null` em entregas legadas. */
  accountId: string | null
  submittedAt: string
  /** Nota da correção automática (atividade); `null` sem atividade. */
  score: number | null
  /** ISO da correção; `null` sem atividade. */
  checkedAt: string | null
  /** Atingiu a nota de corte (sticky). */
  passed: boolean
}

export interface StudioSubmissionDetailView {
  /** Snapshot `Project` do Estúdio enviado pelo aluno — importável no Estúdio do professor. */
  project: unknown
  submittedAt: string
  score: number | null
  /** Resultado por checagem (com `verifiedBy`: server recalculado × client reportado). */
  results: StudioCheckResult[] | null
  checkedAt: string | null
  passed: boolean
}

/**
 * Acompanhamento das entregas do Estúdio pelo professor (admin). A identidade
 * (nome/e-mail) é hidratada pelo BFF do admin via auth — aqui só o userId + data
 * + correção (lista) e o projeto inteiro + resultado por checagem (detalhe).
 */
export class StudioSubmissionsAdminService {
  constructor(private readonly submissions: StudioSubmissionRepository) {}

  async list(blockId: string): Promise<StudioSubmissionSummaryView[]> {
    const rows = await this.submissions.listByBlock(blockId)
    return rows.map((r) => ({
      userId: r.userId,
      accountId: r.accountId,
      submittedAt: r.submittedAt.toISOString(),
      score: r.score,
      checkedAt: r.checkedAt?.toISOString() ?? null,
      passed: r.passed,
    }))
  }

  async getOne(userId: string, blockId: string): Promise<StudioSubmissionDetailView> {
    const row = await this.submissions.getOne(userId, blockId)
    if (!row) throw new ContentNotFoundError('Entrega não encontrada')
    return {
      project: row.project,
      submittedAt: row.submittedAt.toISOString(),
      score: row.score,
      results: row.results,
      checkedAt: row.checkedAt?.toISOString() ?? null,
      passed: row.passedAt != null,
    }
  }
}
