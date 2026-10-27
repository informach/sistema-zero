import { expect, mock, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { UnauthorizedError } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import { arquipelagoCoinsRoutes } from '../src/interfaces/http/routes/arquipelago-coins.routes'

const token = 'token-de-teste-exclusivo-para-esta-rota'
const movimento = {
  userId: randomUUID(),
  accountId: randomUUID(),
  key: randomUUID(),
  audience: 'adult',
  operation: 'credit',
  amount: 5,
}
const post = (body: unknown, chave?: string) =>
  new Request('http://local/members/internal/arquipelago/coins', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(chave ? { 'x-arquipelago-token': chave } : {}),
    },
    body: JSON.stringify(body),
  })

test('porta de moedas exige token dedicado e valida o corpo antes de executar', async () => {
  const movimentar = mock(async () => ({
    ok: true as const,
    balance: 5,
    amount: 5,
    replayed: false,
  }))
  const create = (configured?: string) =>
    new Elysia()
      .onError({ as: 'global' }, ({ error, set }) => {
        if (error instanceof UnauthorizedError) {
          set.status = 401
          return { error: 'unauthorized' }
        }
      })
      .use(arquipelagoCoinsRoutes({ repository: { movimentar }, token: configured }))
  expect((await create().handle(post(movimento, token))).status).toBe(401)
  const app = create(token)
  expect((await app.handle(post(movimento))).status).toBe(401)
  expect((await app.handle(post(movimento, 'invalido'))).status).toBe(401)
  expect((await app.handle(post({ ...movimento, amount: -1 }, token))).status).toBe(400)
  expect(movimentar).toHaveBeenCalledTimes(0)
  expect((await app.handle(post(movimento, token))).status).toBe(200)
  expect(movimentar).toHaveBeenCalledTimes(1)
})
