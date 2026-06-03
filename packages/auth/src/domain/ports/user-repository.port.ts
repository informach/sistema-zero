import type { UserAggregate } from '../user/user.aggregate'
import type { UserRole } from '../user/user.role'
import type { UserStatus } from '../user/user.status'

/** Filtros da listagem admin (paginada). `q` casa em e-mail/nome (case-insensitive). */
export interface ListUsersFilter {
  q?: string
  role?: UserRole
  status?: UserStatus
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
  /**
   * Persiste alterações com concorrência otimista: só grava se a `version` no
   * banco ainda for `expectedVersion`. Retorna `false` quando nenhuma linha casou
   * (conflito) — a aplicação traduz em `VersionConflictError` (409).
   */
  update(user: UserAggregate, expectedVersion: number): Promise<boolean>
}
