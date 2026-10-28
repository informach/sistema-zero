import { UnauthorizedError } from '@sistemazero/core/http'
import { safeEqual } from '@sistemazero/core/security'
import { Elysia } from 'elysia'
import { z } from 'zod'
import type { ArquipelagoCoinsRepository } from '../../../infrastructure/persistence/drizzle/arquipelago-coins.repository'

const Movimento = z.strictObject({
  userId: z.uuid(),
  accountId: z.uuid(),
  audience: z.enum(['kids', 'adult']),
  key: z.uuid(),
  operation: z.enum(['credit', 'debit']),
  amount: z.number().int().min(1).max(1_000_000),
})

/** Porta S2S dedicada: nunca roteada pelo gateway ou exposta ao navegador. */
export function arquipelagoCoinsRoutes(deps: {
  repository: Pick<ArquipelagoCoinsRepository, 'movimentar'>
  token?: string
}) {
  return new Elysia({ prefix: '/members/internal/arquipelago' })
    .onBeforeHandle(({ headers }) => {
      if (
        !deps.token ||
        !headers['x-arquipelago-token'] ||
        !safeEqual(headers['x-arquipelago-token'], deps.token)
      )
        throw new UnauthorizedError('Chamada não autorizada')
    })
    .post('/coins', async ({ body, set }) => {
      const parsed = Movimento.safeParse(body)
      if (!parsed.success) {
        set.status = 400
        return { error: { code: 'INVALID_MOVEMENT' } }
      }
      const result = await deps.repository.movimentar(parsed.data)
      if (!result.ok) set.status = result.code === 'OWNER_MISMATCH' ? 403 : 409
      return result
    })
}
