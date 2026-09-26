import type { CourseAudience } from '../../domain/course/course'
import {
  PensaNotFoundError,
  PensaNotOwnerError,
  PensaOwnerCannotLeaveError,
} from '../../domain/pensa/pensa.errors'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'

/**
 * Tirar alguém da equipe (só o dono) ou SAIR dela (`target: 'me'`, só membro: o dono não sai
 * do próprio plano, ele o apaga ou desliga o código). Quem sai perde o acesso na hora; o XP
 * que ganhou fazendo o plano fica no ledger.
 */
export class RemovePensaProjectMemberService {
  constructor(
    private readonly repo: PensaRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    projectId: string,
    target: string,
  ): Promise<void> {
    const access = await this.repo.findProject(projectId, userId, audience)
    if (!access) throw new PensaNotFoundError('Esse plano não está mais aqui.')
    if (target === 'me') {
      if (access.role === 'owner') throw new PensaOwnerCannotLeaveError()
      await this.repo.removeMember(projectId, userId, this.clock())
      return
    }
    if (access.role !== 'owner') throw new PensaNotOwnerError()
    const removed = await this.repo.removeMember(projectId, target, this.clock())
    if (!removed) throw new PensaNotFoundError('Essa pessoa não está na equipe.')
  }
}
