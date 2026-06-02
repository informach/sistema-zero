import type { UserResolver } from '../../auth/authenticated-user'
import type { Stage } from '../stage.port'

/**
 * Resolve o principal autenticado em um usuário (`ctx.user`). É a "seção" que
 * retorna `null` (sem usuário) ou `{id,email,firstName,lastName,role,status,…}`.
 * Não decide acesso — apenas popula o contexto; a autorização (RBAC) vem depois.
 * Pula HMAC (sistema-a-sistema) e rotas públicas (sem principal).
 */
export function createUserResolutionStage(resolver: UserResolver): Stage {
  return {
    name: 'user-resolution',
    async run(ctx) {
      if (!ctx.principal) return undefined
      const user = await resolver.resolve(ctx.principal)
      if (user) ctx.user = user
      return undefined
    },
  }
}
