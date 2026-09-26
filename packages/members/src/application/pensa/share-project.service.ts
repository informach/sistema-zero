import type { CourseAudience } from '../../domain/course/course'
import { PensaNotFoundError, PensaNotOwnerError } from '../../domain/pensa/pensa.errors'
import { formatShareCode, generateShareCode } from '../../domain/pensa/share-code'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'

const MAX_ATTEMPTS = 5

/**
 * Gera (ou TROCA) o código do plano. Só o dono. Gerar de novo sobrescreve: o código antigo
 * para de funcionar na hora, e quem já entrou continua na equipe (o código é só a porta).
 * O índice único parcial do banco é a rede contra colisão: a pré-checagem evita a ida à toa e,
 * se dois donos sortearem o MESMO código no mesmo instante, o `setShareCode` devolve `false`
 * e o sorteio é repetido (até `MAX_ATTEMPTS`; 31^6 códigos, colisão real é ~1 em 887 milhões).
 */
export class SharePensaProjectService {
  constructor(
    private readonly repo: PensaRepository,
    private readonly clock: () => Date,
    private readonly generate: () => string = () => generateShareCode(),
  ) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    projectId: string,
  ): Promise<{ code: string; display: string }> {
    const project = await this.repo.findProject(projectId, userId, audience)
    if (!project) throw new PensaNotFoundError('Esse plano não está mais aqui.')
    if (project.role !== 'owner') throw new PensaNotOwnerError()
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const code = this.generate()
      if (await this.repo.findProjectByShareCode(code)) continue
      if (!(await this.repo.setShareCode(projectId, code, this.clock()))) continue
      return { code, display: formatShareCode(code) }
    }
    throw new Error('Não consegui gerar um código único para o plano')
  }
}

/** Desliga o código (ninguém mais entra por ele). Quem já está na equipe FICA. Só o dono. */
export class UnsharePensaProjectService {
  constructor(
    private readonly repo: PensaRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(userId: string, audience: CourseAudience, projectId: string): Promise<void> {
    const project = await this.repo.findProject(projectId, userId, audience)
    if (!project) throw new PensaNotFoundError('Esse plano não está mais aqui.')
    if (project.role !== 'owner') throw new PensaNotOwnerError()
    if (project.shareCode === null) return
    await this.repo.setShareCode(projectId, null, this.clock())
  }
}
