import type { CourseAudience } from '../../domain/course/course'
import { MAX_ACTIVE_PROJECTS } from '../../domain/pensa/pensa'
import { PensaNotFoundError, PensaQuotaExceededError } from '../../domain/pensa/pensa.errors'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import type { PensaProjectDetailView } from '../mappers/pensa-views'
import { loadPensaProjectDetail } from './project-detail'

/**
 * Cria o projeto + ciclo 1 (stage z) ATOMICAMENTE. Cota: ≤20 projetos `active`
 * por (user, audience) → 409 PENSA_QUOTA_EXCEEDED. O GATE de produto (ref
 * `pensa` no catálogo) é da ROTA — aqui já se assume acesso concedido.
 */
export class CreatePensaProjectService {
  constructor(
    private readonly repo: PensaRepository,
    private readonly newId: () => string,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    input: { name: string },
  ): Promise<PensaProjectDetailView> {
    const name = input.name.trim()
    if (name.length < 2 || name.length > 120) {
      throw new ValidationError('O nome do projeto precisa ter entre 2 e 120 caracteres')
    }

    const active = await this.repo.countActiveProjects(userId, audience)
    if (active >= MAX_ACTIVE_PROJECTS) {
      throw new PensaQuotaExceededError(
        `Você já tem ${MAX_ACTIVE_PROJECTS} projetos ativos — arquive um para criar outro`,
      )
    }

    const projectId = this.newId()
    await this.repo.createProject(
      { id: projectId, userId, accountId, audience, kind: 'game', name },
      { id: this.newId(), projectId, number: 1, goal: null },
      this.clock(),
    )

    const project = await this.repo.findProject(projectId, userId, audience)
    if (!project) throw new PensaNotFoundError() // defensivo: acabou de ser criado
    return loadPensaProjectDetail(this.repo, project)
  }
}
