import type { UserDataPurgeRepository } from '../../../domain/ports/user-data-purge-repository.port'
import { InvalidStateTransitionError } from '../../../domain/shared/errors'

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
  constructor(
    private readonly repo: UserDataPurgeRepository,
    private readonly clock: () => Date = () => new Date(),
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {}

  async execute({ userId, profileIds }: PurgeUserDataCommand): Promise<void> {
    const userIds = [...new Set([userId, ...profileIds])]
    const createdAt = this.clock()
    await this.repo.purgeForUser({
      userIds,
      accountId: userId,
      cleanup: {
        id: this.newId(),
        prefixes: userIds.map((ownerId) => `creations/${ownerId}/`),
        // O JWT de acesso vale 15 min por padrão. Mais 5 min absorvem skew,
        // operações iniciadas antes da cerca e URLs PUT ainda em voo.
        notBefore: new Date(createdAt.getTime() + 20 * 60_000),
        createdAt,
      },
    })
  }

  /**
   * Segunda purga pós-TTL, pedida pelo worker de limpeza (`/account-deletion/finalize`).
   * ⚠️ Só purga conta que JÁ está em exclusão: a cerca nasce na mesma transação da 1ª purga
   * (e do job que o worker recebe) e nunca é apagada. Sem cerca, o pedido não veio de uma
   * exclusão de conta — ex.: um worker antigo tratando a limpeza de um PLANO do Pensa como
   * exclusão — e apagar seria levar matrículas, progresso e XP da família inteira. → 409,
   * nada apagado.
   */
  async finalize({ userId, profileIds }: PurgeUserDataCommand): Promise<void> {
    if (!(await this.repo.isFenced(userId)))
      throw new InvalidStateTransitionError(
        'Esta conta não está em exclusão; a finalização foi recusada sem apagar nada.',
      )
    await this.execute({ userId, profileIds })
  }
}
