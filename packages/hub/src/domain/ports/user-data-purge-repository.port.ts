/**
 * Porta de PURGA dos dados de comunidade do usuário (exclusão de usuário pelo
 * painel). Apaga o estado de interação keyado no usuário — reações, leitura
 * (read-state) e silenciamentos/banimentos. NÃO apaga tópicos/comentários
 * autorados (histórico imutável; `author_id` é snapshot). Idempotente.
 */
export interface UserDataPurgeRepository {
  /** Apaga as linhas keyadas em `user_id ∈ userIds` (conta + perfis kids). */
  purgeForUser(userIds: string[]): Promise<void>
}
