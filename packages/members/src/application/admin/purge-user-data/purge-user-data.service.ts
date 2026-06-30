import type { UserDataPurgeRepository } from '../../../domain/ports/user-data-purge-repository.port'

export interface PurgeUserDataCommand {
  /** Conta (id do auth user) sendo excluída. */
  userId: string
  /** Perfis (kids) sob a conta — seus dados são keyados no id do perfil. */
  profileIds: string[]
}

/**
 * Purga TODOS os dados do aprendiz na área de membros (parte da exclusão de usuário
 * pelo painel). Orquestrado pelo BFF ANTES de apagar a identidade no auth. A lista
 * de alvos = a conta + os perfis; a conta também cobre, por `account_id`, os dados
 * kids que ficam keyados nela. Idempotente (DELETEs).
 */
export class PurgeUserDataService {
  constructor(private readonly repo: UserDataPurgeRepository) {}

  async execute({ userId, profileIds }: PurgeUserDataCommand): Promise<void> {
    const userIds = [...new Set([userId, ...profileIds])]
    await this.repo.purgeForUser({ userIds, accountId: userId })
  }
}
