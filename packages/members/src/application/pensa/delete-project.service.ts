import type { CourseAudience } from '../../domain/course/course'
import { PensaNotFoundError, PensaNotOwnerError } from '../../domain/pensa/pensa.errors'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'

/**
 * Apaga o plano DE VEZ (decisão da usuária, 14/09/2026): a criança pediu para sumir,
 * some — ciclos, conversas, artefatos e Cartões de Criação caem na cascata do banco.
 * Não há lixeira; a rede de segurança é a janela de confirmação da tela.
 *
 * O `status: 'archived'` do PATCH continua existindo para quem quiser só esconder,
 * mas não é este caminho.
 *
 * ⚠️ O XP e as medalhas do Pensa FICAM: `xp_events` guarda `source_id` derivado, sem FK
 * para o projeto. Apagar o plano não apaga o que a criança já conquistou fazendo ele.
 */
export class DeletePensaProjectService {
  constructor(private readonly repo: PensaRepository) {}

  async execute(userId: string, audience: CourseAudience, projectId: string): Promise<void> {
    const existing = await this.repo.findProject(projectId, userId, audience)
    // A mensagem chega INTEIRA na janela da criança (o BFF repassa `error.message`), e
    // "Recurso do Pensa não encontrado" é recado de servidor. O caso real é ela apagar
    // o mesmo plano em duas abas. Plano de outro perfil cai aqui também, e a frase
    // serve igual: não confirma nem nega que ele existe.
    if (!existing) throw new PensaNotFoundError('Esse plano não está mais aqui.')
    // Só o dono apaga; quem entrou pelo código sai da equipe, não leva o plano junto.
    if (existing.role !== 'owner') throw new PensaNotOwnerError()
    await this.repo.deleteProject(projectId, userId, audience)
  }
}
