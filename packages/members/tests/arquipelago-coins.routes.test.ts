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

test('inventário usa token de moedas, valida privilégio e recusa antes do repositório', async () => {
  const consultas: unknown[] = []
  const posse = { versao: 1 as const, possuidas: [] as const, saldo: 10 }
  const app = new Elysia()
    .onError({ as: 'global' }, ({ error, set }) => {
      if (error instanceof UnauthorizedError) {
        set.status = 401
        return { error: 'unauthorized' }
      }
    })
    .use(
      arquipelagoCoinsRoutes({
        token,
        repository: {
          movimentar: async () => ({ ok: false as const, code: 'OWNER_MISMATCH' as const }),
        },
        inventory: {
          ler: async (dono) => {
            consultas.push(dono)
            return { ...posse, possuidas: [] }
          },
          comprar: async (pedido) => {
            consultas.push(pedido)
            return { ok: false, codigo: 'SALDO_INSUFICIENTE' }
          },
        },
      }),
    )
  const dono = { userId: randomUUID(), accountId: randomUUID(), audience: 'kids' }
  const pedido = { ...dono, aparencia: 'aquario-classico', equipe: false }
  const request = (body: unknown, t = token) =>
    new Request('http://local/members/internal/arquipelago/galeria/compras', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-arquipelago-token': t },
      body: JSON.stringify(body),
    })
  expect((await app.handle(request(pedido, 'token-de-leitura'))).status).toBe(401)
  expect((await app.handle(request({ ...pedido, preco: 0 }))).status).toBe(400)
  expect((await app.handle(request({ ...pedido, equipe: 'true' }))).status).toBe(400)
  expect(consultas).toHaveLength(0)
  const resposta = await app.handle(request(pedido))
  expect(resposta.status).toBe(409)
  expect(await resposta.json()).toEqual({ ok: false, codigo: 'SALDO_INSUFICIENTE' })
  const leitura = await app.handle(
    new Request(`http://local/members/internal/arquipelago/galeria?${new URLSearchParams(dono)}`, {
      headers: { 'x-arquipelago-token': token },
    }),
  )
  expect(leitura.status).toBe(200)
  expect(await leitura.json()).toEqual(posse)
})
