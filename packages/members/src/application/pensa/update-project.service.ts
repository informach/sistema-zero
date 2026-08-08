import type { CourseAudience } from '../../domain/course/course'
import type { PensaProjectStatus } from '../../domain/pensa/pensa'
import { PensaNotFoundError } from '../../domain/pensa/pensa.errors'
import type { PensaProjectPatch, PensaRepository } from '../../domain/ports/pensa-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import type { PensaProjectDetailView } from '../mappers/pensa-views'
import { loadPensaProjectDetail } from './project-detail'

export interface UpdatePensaProjectInput {
  name?: string
  status?: PensaProjectStatus
}

/** PATCH parcial do plano (nome/status). Toca `updated_at` sempre. */
export class UpdatePensaProjectService {
  constructor(
    private readonly repo: PensaRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    projectId: string,
    input: UpdatePensaProjectInput,
  ): Promise<PensaProjectDetailView> {
    const existing = await this.repo.findProject(projectId, userId, audience)
    if (!existing) throw new PensaNotFoundError()

    const patch: PensaProjectPatch = {}
    if (input.name !== undefined) {
      const name = input.name.trim()
      if (name.length < 2 || name.length > 120) {
        throw new ValidationError('O nome do projeto precisa ter entre 2 e 120 caracteres')
      }
      patch.name = name
    }
    if (input.status !== undefined) patch.status = input.status
    await this.repo.updateProject(projectId, patch, this.clock())
    const updated = await this.repo.findProject(projectId, userId, audience)
    if (!updated) throw new PensaNotFoundError() // defensivo (corrida com purge)
    return loadPensaProjectDetail(this.repo, updated)
  }
}
