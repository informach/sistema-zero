import { describe, expect, test } from 'bun:test'
import { MembrosIndisponiveisError } from '../../src/domain/membros.port'
import { MoedasIndisponiveisError } from '../../src/domain/moedas.port'
import { MembrosHttp } from '../../src/infrastructure/members/membros-http'
import { MoedasHttp } from '../../src/infrastructure/members/moedas-http'

const LIA = '11111111-1111-4111-8111-111111111111'
const KEY = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function fetchDeMentira(status: number, corpo: unknown, pedidos: Request[] = []) {
  return (async (url: URL | RequestInfo, init?: RequestInit) => {
    pedidos.push(new Request(url, init))
    return Response.json(corpo, { status })
  }) as typeof fetch
}

const pedido = { userId: LIA, accountId: LIA, audience: 'kids' as const, key: KEY, amount: 60 }

describe('o débito pela porta de moedas', () => {
  test('manda operation debit na rota das moedas e lê o saldo de depois', async () => {
    const pedidos: Request[] = []
    const moedas = new MoedasHttp({
      url: 'http://members',
      token: 't',
      fetch: fetchDeMentira(200, { ok: true, balance: 40, amount: -60, replayed: false }, pedidos),
    })
    expect(await moedas.debitar(pedido)).toEqual({ situacao: 'debitado', saldo: 40 })
    expect(pedidos[0]?.url).toBe('http://members/members/internal/arquipelago/coins')
    expect(await pedidos[0]?.json()).toEqual({ ...pedido, operation: 'debit' })
    expect(pedidos[0]?.headers.get('x-arquipelago-token')).toBe('t')
  })

  test('saldo curto, recusa com código e resposta estranha', async () => {
    const com = (status: number, corpo: unknown) =>
      new MoedasHttp({ url: 'http://m', token: 't', fetch: fetchDeMentira(status, corpo) })
    expect(await com(409, { ok: false, code: 'INSUFFICIENT_BALANCE' }).debitar(pedido)).toEqual({
      situacao: 'saldo-insuficiente',
    })
    expect(await com(409, { ok: false, code: 'KEY_CONFLICT' }).debitar(pedido)).toEqual({
      situacao: 'recusado',
      codigo: 'KEY_CONFLICT',
    })
    for (const [status, corpo] of [
      [500, {}],
      [200, { ok: true }],
      [200, { ok: true, balance: -1 }],
    ] as const) {
      let erro: unknown
      try {
        await com(status, corpo).debitar(pedido)
      } catch (e) {
        erro = e
      }
      expect(erro).toBeInstanceOf(MoedasIndisponiveisError)
    }
  })

  test('o crédito dos prêmios segue igual', async () => {
    const pedidos: Request[] = []
    const moedas = new MoedasHttp({
      url: 'http://m',
      token: 't',
      fetch: fetchDeMentira(200, { ok: true, balance: 80 }, pedidos),
    })
    expect(await moedas.creditar(pedido)).toEqual({ situacao: 'creditado' })
    expect(await pedidos[0]?.json()).toEqual({ ...pedido, operation: 'credit' })
  })
})

describe('o saldo pelo Members', () => {
  test('lê pela rota interna, com a pessoa e o público', async () => {
    const pedidos: Request[] = []
    const membros = new MembrosHttp({
      url: 'http://members',
      token: 't',
      fetch: fetchDeMentira(200, { saldo: 75 }, pedidos),
    })
    const r = await membros.lerSaldo({ userId: LIA, accountId: LIA, audience: 'kids' })
    expect(r).toEqual({ saldo: 75 })
    expect(pedidos[0]?.url).toBe(
      `http://members/members/internal/arquipelago/saldo?userId=${LIA}&accountId=${LIA}&audience=kids`,
    )
  })

  test('formato estranho conta como indisponível', async () => {
    const membros = new MembrosHttp({
      url: 'http://m',
      token: 't',
      fetch: fetchDeMentira(200, { saldo: 'muito' }),
    })
    let erro: unknown
    try {
      await membros.lerSaldo({ userId: LIA, accountId: LIA, audience: 'kids' })
    } catch (e) {
      erro = e
    }
    expect(erro).toBeInstanceOf(MembrosIndisponiveisError)
  })
})
