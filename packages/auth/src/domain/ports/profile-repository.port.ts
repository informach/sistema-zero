import type { ProfileAggregate } from '../profile/profile.aggregate'

/** Resultado do create atômico sob teto: o perfil persistido ou o limite batido. */
export type CreateProfileOutcome =
  | { outcome: 'created'; profile: ProfileAggregate }
  | { outcome: 'limit_reached' }
  | { outcome: 'account_inactive' }

/**
 * Persistência dos perfis (estilo Netflix) de uma conta. O `createWithinLimit`
 * carrega a regra de concorrência (advisory lock por conta) para o teto não ser
 * furado por dois creates simultâneos.
 */
export interface ProfileRepository {
  /** Perfis ATIVOS da conta, na ordem da grade (`sortOrder`). */
  listActiveByAccount(accountUserId: string): Promise<ProfileAggregate[]>
  /** Por id (qualquer status). `null` se não existe. */
  findById(id: string): Promise<ProfileAggregate | null>
  /** Lote por ids, inclusive arquivados (suporte administrativo e histórico). */
  listByIds(ids: string[]): Promise<ProfileAggregate[]>
  /** Lote por ids, SÓ ativos (report dos pais — saudação das crianças). Ausentes são omitidos. */
  listActiveByIds(ids: string[]): Promise<ProfileAggregate[]>
  /**
   * Cria respeitando o teto ATOMICAMENTE: serializa por conta (advisory xact-lock),
   * conta os ativos e insere só se `count < maxProfiles`. Atribui o `sortOrder`
   * (max+1). Devolve o perfil persistido OU `limit_reached`.
   */
  createWithinLimit(profile: ProfileAggregate, maxProfiles: number): Promise<CreateProfileOutcome>
  /** Persiste edição/arquivamento (UPDATE por id). `false` se a linha sumiu. */
  update(profile: ProfileAggregate): Promise<boolean>
}
