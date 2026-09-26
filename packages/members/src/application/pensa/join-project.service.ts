import type { CourseAudience } from '../../domain/course/course'
import { MAX_JOINED_PROJECTS, MAX_PROJECT_MEMBERS } from '../../domain/pensa/pensa'
import {
  PensaAlreadyMemberError,
  PensaInviteInvalidError,
  PensaJoinLimitError,
  PensaNotFoundError,
  PensaTeamFullError,
} from '../../domain/pensa/pensa.errors'
import { normalizeShareCode } from '../../domain/pensa/share-code'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'
import type { PensaProjectDetailView } from '../mappers/pensa-views'
import { loadPensaProjectDetail } from './project-detail'

/**
 * Entrar numa equipe pelo código. O GATE de produto (a conta do convidado precisa ter o
 * Pensa) é da ROTA, como no criar projeto. Código que não abre plano nenhum é 404, sem dizer
 * se existe: nunca vazar a existência de um plano alheio pelo código errado.
 */
export class JoinPensaProjectService {
  constructor(
    private readonly repo: PensaRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    rawCode: string,
  ): Promise<PensaProjectDetailView> {
    const code = normalizeShareCode(rawCode)
    if (!code) throw new PensaInviteInvalidError()
    const project = await this.repo.findProjectByShareCode(code)
    if (!project || project.audience !== audience || project.status !== 'active') {
      throw new PensaInviteInvalidError()
    }
    if (project.userId === userId) throw new PensaAlreadyMemberError('Esse plano já é seu.')
    const members = await this.repo.listMembers(project.id)
    if (members.some((member) => member.profileId === userId)) {
      throw new PensaAlreadyMemberError()
    }
    if (members.length >= MAX_PROJECT_MEMBERS) throw new PensaTeamFullError()
    if ((await this.repo.countMemberships(userId, audience)) >= MAX_JOINED_PROJECTS) {
      throw new PensaJoinLimitError()
    }
    // As conferências acima são a UX (mensagens certas, sem ir ao banco à toa); a que VALE é a
    // do repositório, dentro da transação que tranca o projeto: duas abas ou dois convidados no
    // mesmo instante voltam como 'duplicate'/'full' em vez de estourar a chave ou passar do teto.
    const outcome = await this.repo.addMember(
      { projectId: project.id, profileId: userId, accountId, invitedBy: project.userId },
      this.clock(),
      MAX_PROJECT_MEMBERS,
    )
    if (outcome === 'duplicate') throw new PensaAlreadyMemberError()
    if (outcome === 'full') throw new PensaTeamFullError()
    const access = await this.repo.findProject(project.id, userId, audience)
    if (!access) throw new PensaNotFoundError() // defensivo: acabou de entrar
    return loadPensaProjectDetail(this.repo, access)
  }
}
