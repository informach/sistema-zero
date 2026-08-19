import type { UserAggregate } from '../user/user.aggregate'
import type { UserRole } from '../user/user.role'
import type { UserStatus } from '../user/user.status'

/** Filtros da listagem admin (paginada). `q` casa em e-mail/nome (case-insensitive). */
export interface ListUsersFilter {
  q?: string
  role?: UserRole
  status?: UserStatus
  /** Origem do cadastro (funnel/web/mobile/admin) — match exato. */
  source?: string
  /** Janela de cadastro (createdAt): a partir de / até (inclusive). */
  createdFrom?: Date
  createdTo?: Date
  limit: number
  offset: number
}

/**
 * Porta de persistência de usuários. O CONTRATO central: as consultas retornam
 * `null` quando o usuário não existe; senão o agregado (mapeado para a view
 * `{id,email,firstName,lastName,role,status,phone?,signupSource?}` na aplicação).
 */
export interface UserRepository {
  findById(id: string): Promise<UserAggregate | null>
  findByEmail(email: string): Promise<UserAggregate | null>
  /**
   * Insere um novo usuário. Em violação do índice único de e-mail (corrida entre
   * dois cadastros simultâneos), lança `EmailAlreadyInUseError`.
   */
  create(user: UserAggregate): Promise<void>
  /** Listagem admin paginada + total de registros que casam o filtro. */
  list(filter: ListUsersFilter): Promise<{ users: UserAggregate[]; total: number }>
  /** Busca em LOTE por ids (hidratação de identidade no painel). Ids ausentes são omitidos. */
  listByIds(ids: string[]): Promise<UserAggregate[]>
  /**
   * Persiste alterações com concorrência otimista: só grava se a `version` no
   * banco ainda for `expectedVersion`. Retorna `false` quando nenhuma linha casou
   * (conflito) — a aplicação traduz em `VersionConflictError` (409).
   */
  update(user: UserAggregate, expectedVersion: number): Promise<boolean>
  /**
   * Cerca uma exclusão: bloqueia a conta e devolve TODOS os perfis, inclusive
   * arquivados. Usa o mesmo advisory lock da criação de perfil.
   */
  prepareDeletion(id: string): Promise<{ profileIds: string[] } | null>
  /**
   * Recibo durável de uma exclusão já concluída. Distingue retry legítimo de um
   * UUID que nunca existiu e preserva os donos enumerados antes da cascata.
   */
  findDeletionReceipt(id: string): Promise<{ profileIds: string[] } | null>
  /**
   * Exclui FÍSICA e definitivamente o usuário e os dados auth-owned keyados nele
   * (refresh tokens, tokens de reset/OTP, handoffs de impersonação, perfis), numa
   * única transação. A trilha de auditoria (`audit_logs`) é PRESERVADA (compliance —
   * `actor_id` é snapshot, sem FK). Idempotente: usuário inexistente = no-op.
   */
  deleteById(id: string): Promise<void>
}
