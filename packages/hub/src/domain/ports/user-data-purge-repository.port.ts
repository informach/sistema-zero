/**
 * Porta de PURGA dos dados de comunidade do usuário (exclusão de usuário pelo
 * painel). Apaga o estado de interação keyado no usuário — reações, leitura
 * (read-state) e silenciamentos/banimentos. NÃO apaga tópicos/comentários
 * autorados (histórico imutável; `author_id` é snapshot). Idempotente.
 */
export interface UserDataPurgeRepository extends AccountDeletionFence {
  /** Apaga as linhas keyadas em `user_id ∈ userIds` e cerca a conta responsável. */
  purgeForUser(userIds: string[], accountId: string): Promise<void>
}

import type { AccountDeletionFence } from '@sistemazero/core/http'
