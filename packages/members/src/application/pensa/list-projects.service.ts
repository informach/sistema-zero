import type { CourseAudience } from '../../domain/course/course'
import type { AuthGateway } from '../../domain/ports/auth-gateway.port'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'
import { type PensaProjectListView, toPensaProjectListView } from '../mappers/pensa-views'

/**
 * Lista os projetos `active` de que o perfil é DONO ou MEMBRO, na vitrine (updated_at DESC —
 * toda escrita toca o projeto, então o mais recente trabalhado vem primeiro). Arquivado não
 * aparece. Para os planos de equipe, o 1º nome do dono vem do auth, best-effort (sem auth ou
 * com falha, a tela diz "um colega").
 */
export class ListPensaProjectsService {
  constructor(
    private readonly repo: PensaRepository,
    private readonly authGateway: AuthGateway | null = null,
  ) {}

  async execute(userId: string, audience: CourseAudience): Promise<PensaProjectListView[]> {
    const rows = await this.repo.listActiveProjects(userId, audience)
    const ownerIds = [
      ...new Set(
        rows.filter((row) => row.project.role === 'member').map((row) => row.project.userId),
      ),
    ]
    const names =
      ownerIds.length > 0 && this.authGateway
        ? await this.authGateway.getProfileNames(ownerIds).catch((error: unknown) => {
            console.warn('[pensa] nome do dono do plano indisponível (segue como "Colega")', error)
            return new Map<string, string>()
          })
        : new Map<string, string>()
    return rows.map(({ project, currentCycle }) =>
      toPensaProjectListView(project, currentCycle, names.get(project.userId) ?? null),
    )
  }
}
