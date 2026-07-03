import type { CourseAudience } from '../../domain/course/course'
import { MAX_CYCLES_PER_PROJECT } from '../../domain/pensa/pensa'
import {
  PensaCycleNotDoneError,
  PensaNotFoundError,
  PensaQuotaExceededError,
} from '../../domain/pensa/pensa.errors'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import type { PensaProjectDetailView } from '../mappers/pensa-views'
import { loadPensaProjectDetail } from './project-detail'

/**
 * Cria o ciclo n+1 (nasce `stage z`). Regras do contrato: exige o ciclo de maior
 * `number` com `stage='done'` (senão 409 PENSA_CYCLE_NOT_DONE) e ≤20 ciclos por
 * projeto (senão 409 PENSA_QUOTA_EXCEEDED). HERDA a identidade validada do ciclo
 * anterior (a criança não refaz nome/paleta/ícone a cada Versão).
 */
export class CreatePensaCycleService {
  constructor(
    private readonly repo: PensaRepository,
    private readonly newId: () => string,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    projectId: string,
    goal: string,
  ): Promise<PensaProjectDetailView> {
    const project = await this.repo.findProject(projectId, userId, audience)
    if (!project) throw new PensaNotFoundError()

    const trimmedGoal = goal.trim()
    if (trimmedGoal.length < 2 || trimmedGoal.length > 500) {
      throw new ValidationError('O objetivo do ciclo precisa ter entre 2 e 500 caracteres')
    }

    const cycles = await this.repo.listCycles(projectId)
    if (cycles.length >= MAX_CYCLES_PER_PROJECT) {
      throw new PensaQuotaExceededError(
        `Este projeto já tem ${MAX_CYCLES_PER_PROJECT} ciclos — o máximo`,
      )
    }
    const latest = cycles[cycles.length - 1]
    if (!latest) throw new PensaNotFoundError() // invariante: nasce com ciclo 1
    if (latest.stage !== 'done') throw new PensaCycleNotDoneError()

    // Herda a IDENTIDADE validada do ciclo anterior (nome/paleta/ícone não mudam
    // entre versões) → a criança não refaz o funil de identidade a cada Versão. A
    // ideia NÃO é herdada: o Z da nova Versão foca no INCREMENTO (goal).
    const prevIdentity = await this.repo.findLatestArtifact(latest.id, 'identity')
    const inherit =
      prevIdentity && prevIdentity.status === 'validated'
        ? [
            {
              id: this.newId(),
              stage: 'e' as const,
              type: 'identity' as const,
              content: prevIdentity.content,
            },
          ]
        : []

    await this.repo.createCycle(
      { id: this.newId(), projectId, number: latest.number + 1, goal: trimmedGoal },
      this.clock(),
      inherit,
    )

    const updated = await this.repo.findProject(projectId, userId, audience)
    if (!updated) throw new PensaNotFoundError()
    return loadPensaProjectDetail(this.repo, updated)
  }
}
