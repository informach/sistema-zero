import type { ProfileAggregate } from '../profile/profile.aggregate'

/** Resultado do create atômico sob teto: o perfil persistido ou o limite batido. */
export type CreateProfileOutcome =
  | { outcome: 'created'; profile: ProfileAggregate }
  | { outcome: 'limit_reached' }
  | { outcome: 'account_inactive' }

/** Filtro da busca UNIFICADA do painel (criança OU responsável). Paginação já coerida. */
export interface SearchProfilesFilter {
  /** Busca LITERAL case-insensitive (o adapter escapa os curingas do ILIKE). */
  q?: string
  limit: number
  offset: number
}

/** Identidade mínima da CONTA responsável anexada ao perfil (nunca o agregado inteiro). */
export interface ProfileAccountSummary {
  id: string
  email: string
  firstName: string
  lastName: string
}

/**
 * Read-model PLANO da busca admin de perfis (não é o agregado): o perfil ATIVO +
 * a conta responsável do LEFT JOIN local em `auth.users`. `account: null` = conta
 * apagada (o perfil sobrevive porque nada aqui tem FK — snapshot administrativo).
 */
export interface ProfileWithAccountRow {
  id: string
  name: string
  avatarUrl: string | null
  birthDate: string | null
  accountUserId: string
  account: ProfileAccountSummary | null
}

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
   * Busca UNIFICADA do painel: perfis ATIVOS + identidade mínima da conta
   * responsável (LEFT JOIN local em `auth.users`; conta apagada → `account: null`).
   * `q` casa LITERAL (ILIKE escapado, case-insensitive) em OR sobre nome do
   * perfil / e-mail / nome, sobrenome ou nome completo do responsável; ausente → lista todos os
   * ativos. Ordenação ESTÁVEL `name asc, id asc`; `total` usa o MESMO filtro.
   */
  searchWithAccount(
    filter: SearchProfilesFilter,
  ): Promise<{ items: ProfileWithAccountRow[]; total: number }>
  /**
   * Cria respeitando o teto ATOMICAMENTE: serializa por conta (advisory xact-lock),
   * conta os ativos e insere só se `count < maxProfiles`. Atribui o `sortOrder`
   * (max+1). Devolve o perfil persistido OU `limit_reached`.
   */
  createWithinLimit(profile: ProfileAggregate, maxProfiles: number): Promise<CreateProfileOutcome>
  /** Persiste edição/arquivamento (UPDATE por id). `false` se a linha sumiu. */
  update(profile: ProfileAggregate): Promise<boolean>
}
