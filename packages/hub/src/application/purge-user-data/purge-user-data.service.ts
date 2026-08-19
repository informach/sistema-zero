import type { UserDataPurgeRepository } from '../../domain/ports/user-data-purge-repository.port'

export interface PurgeUserDataCommand {
  /** Conta (id do auth user) sendo excluída. */
  userId: string
  /** Perfis (kids) sob a conta — seus dados de comunidade são keyados no id do perfil. */
  profileIds: string[]
}

/**
 * Purga os dados de comunidade do usuário (parte da exclusão de usuário pelo
 * painel). Orquestrado pelo BFF. Alvos = a conta + os perfis. Idempotente.
 */
export class PurgeUserDataService {
  constructor(private readonly repo: UserDataPurgeRepository) {}

  async execute({ userId, profileIds }: PurgeUserDataCommand): Promise<void> {
    const userIds = [...new Set([userId, ...profileIds])]
    await this.repo.purgeForUser(userIds, userId)
  }
}
