import {
  DonoDaGaleriaSchema,
  PedidoDePosseDaGaleriaSchema,
} from '@sistemazero/arquipelago-contracts'
import { UnauthorizedError } from '@sistemazero/core/http'
import { safeEqual } from '@sistemazero/core/security'
import { Elysia } from 'elysia'
import { z } from 'zod'
import type { ArquipelagoCoinsRepository } from '../../../infrastructure/persistence/drizzle/arquipelago-coins.repository'
import type { ArquipelagoInventoryRepository } from '../../../infrastructure/persistence/drizzle/arquipelago-inventory.repository'

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
  inventory?: Pick<ArquipelagoInventoryRepository, 'ler' | 'comprar'>
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
    .get('/galeria', async ({ query, set }) => {
      const parsed = DonoDaGaleriaSchema.safeParse(query)
      if (!parsed.success) {
        set.status = 400
        return { error: { code: 'INVALID_OWNER' } }
      }
      if (!deps.inventory) {
        set.status = 424
        return { error: { code: 'INVENTORY_UNAVAILABLE' } }
      }
      const result = await deps.inventory.ler(parsed.data)
      if (!result) {
        set.status = 403
        return { error: { code: 'OWNER_MISMATCH' } }
      }
      return result
    })
    .post('/galeria/compras', async ({ body, set }) => {
      const parsed = PedidoDePosseDaGaleriaSchema.safeParse(body)
      if (!parsed.success) {
        set.status = 400
        return { error: { code: 'INVALID_PURCHASE' } }
      }
      if (!deps.inventory) {
        set.status = 424
        return { error: { code: 'INVENTORY_UNAVAILABLE' } }
      }
      const result = await deps.inventory.comprar(parsed.data)
      if (!result.ok) set.status = result.codigo === 'DONO_DIFERENTE' ? 403 : 409
      return result
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
