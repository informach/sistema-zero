import type { ProfileRepository } from '../../domain/ports/profile-repository.port'

/** Um irmão como a sessão da criança pode vê-lo: só o id e o nome (nenhum outro dado). */
export interface SiblingView {
  id: string
  name: string
}

/**
 * Os irmãos da criança na sessão de PERFIL (fase3-12 do Arquipélago, 29/10/2026): os outros
 * perfis ativos e prontos da MESMA conta, na ordem da grade. Só id e nome: sem foto, nascimento,
 * telefone ou dado da conta. É o que o BFF usa para pôr o nome nos recordes e nas visitas do jogo
 * (a grade completa, `/auth/profiles`, é da área dos pais).
 */
export class ListSiblingsService {
  constructor(private readonly profiles: ProfileRepository) {}

  async execute(accountUserId: string, ownProfileId: string): Promise<{ siblings: SiblingView[] }> {
    const list = await this.profiles.listActiveByAccount(accountUserId)
    return {
      siblings: list.filter((p) => p.id !== ownProfileId).map((p) => ({ id: p.id, name: p.name })),
    }
  }
}
