import type { CourseAudience } from '../../domain/course/course'
import { PensaNotFoundError } from '../../domain/pensa/pensa.errors'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'
import type { PensaProjectDetailView } from '../mappers/pensa-views'
import { loadPensaProjectDetail } from './project-detail'

/** Detalhe do projeto (cycles + artifactsIndex do ciclo corrente). Ownership → 404. */
export class GetPensaProjectService {
  constructor(private readonly repo: PensaRepository) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    projectId: string,
  ): Promise<PensaProjectDetailView> {
    const project = await this.repo.findProject(projectId, userId, audience)
    if (!project) throw new PensaNotFoundError()
    return loadPensaProjectDetail(this.repo, project)
  }
}
