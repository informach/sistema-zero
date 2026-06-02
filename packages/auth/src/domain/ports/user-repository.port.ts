import type { UserAggregate } from '../user/user.aggregate'

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
}
