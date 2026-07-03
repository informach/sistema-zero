import type { CourseAudience } from '../../domain/course/course'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'
import { type PensaProjectListView, toPensaProjectListView } from '../mappers/pensa-views'

/**
 * Lista os projetos `active` do dono NA VITRINE (updated_at DESC — toda escrita
 * toca o projeto, então o mais recente trabalhado vem primeiro). Arquivado não
 * aparece (o contrato lista só ativos).
 */
export class ListPensaProjectsService {
  constructor(private readonly repo: PensaRepository) {}

  async execute(userId: string, audience: CourseAudience): Promise<PensaProjectListView[]> {
    const rows = await this.repo.listActiveProjects(userId, audience)
    return rows.map(({ project, currentCycle }) => toPensaProjectListView(project, currentCycle))
  }
}
