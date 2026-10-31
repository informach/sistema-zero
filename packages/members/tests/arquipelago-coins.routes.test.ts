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

test('roupas do jogo: token dedicado, corpo validado e recusa de dono como 403 (A21)', async () => {
  const conceder = mock(async (p: { pecas: string[] }) =>
    p.pecas.includes('hat-99')
      ? ({ ok: false, code: 'UNKNOWN_PART' } as const)
      : p.pecas.includes('hat-02')
        ? ({ ok: false, code: 'OWNER_MISMATCH' } as const)
        : ({ ok: true, concedidas: p.pecas } as const),
  )
  const app = new Elysia()
    .onError({ as: 'global' }, ({ error, set }) => {
      if (error instanceof UnauthorizedError) {
        set.status = 401
        return { error: 'unauthorized' }
      }
    })
    .use(
      arquipelagoCoinsRoutes({ repository: { movimentar: mock() }, avatar: { conceder }, token }),
    )
  const pedido = {
    userId: randomUUID(),
    accountId: randomUUID(),
    audience: 'kids',
    pecas: ['hat-04'],
  }
  const enviar = (body: unknown, chave?: string) =>
    app.handle(
      new Request('http://local/members/internal/arquipelago/avatar/pecas', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(chave ? { 'x-arquipelago-token': chave } : {}),
        },
        body: JSON.stringify(body),
      }),
    )
  expect((await enviar(pedido)).status).toBe(401)
  expect((await enviar({ ...pedido, pecas: [] }, token)).status).toBe(400)
  expect((await enviar({ ...pedido, extra: 1 }, token)).status).toBe(400)
  expect(conceder).toHaveBeenCalledTimes(0)
  const ok = await enviar(pedido, token)
  expect(ok.status).toBe(200)
  expect(await ok.json()).toEqual({ ok: true, concedidas: ['hat-04'] })
  expect((await enviar({ ...pedido, pecas: ['hat-02'] }, token)).status).toBe(403)
  expect((await enviar({ ...pedido, pecas: ['hat-99'] }, token)).status).toBe(409)
})
