import { expect, test } from 'bun:test'
import type { PosseDaGaleria } from '@sistemazero/arquipelago-contracts'
import { PosseIndisponivelError } from '../../src/domain/posse.port'
import { PosseHttp } from '../../src/infrastructure/members/posse-http'

const dono = {
  userId: crypto.randomUUID(),
  accountId: crypto.randomUUID(),
  audience: 'kids' as const,
}
const posse: PosseDaGaleria = { versao: 1, possuidas: ['aquario-classico'], saldo: 30 }
function porta(status: number, body: unknown, requests: Request[] = []) {
  return new PosseHttp({
    url: 'http://members',
    token: 'somente-teste',
    fetch: (async (url, init) => {
      requests.push(new Request(url, init))
      return Response.json(body, { status })
    }) as typeof fetch,
  })
}

test('leitura e compra usam somente a porta interna, com identidade e sem confiar em preço do cliente', async () => {
  const requests: Request[] = []
  expect(await porta(200, posse, requests).ler(dono)).toEqual(posse)
  expect(requests[0]?.url).toBe(
    `http://members/members/internal/arquipelago/galeria?${new URLSearchParams(dono)}`,
  )
  expect(requests[0]?.headers.get('x-arquipelago-token')).toBe('somente-teste')
  expect(requests[0]?.cache).toBe('no-store')
  const pedido = { ...dono, aparencia: 'aquario-classico' as const, equipe: false }
  expect(
    await porta(200, { ok: true, posse, jaPossuia: false }, requests).comprar(pedido),
  ).toMatchObject({ ok: true })
  expect(await requests[1]?.json()).toEqual(pedido)
  expect(requests[1]?.redirect).toBe('error')
})

test('respostas incompatíveis, grandes e falha de rede não viram posse nem galeria vazia', async () => {
  for (const [status, body] of [
    [500, posse],
    [200, { ...posse, saldo: -1 }],
    [200, { ...posse, possuidas: ['aquario-classico', 'aquario-classico'] }],
    [200, { ...posse, extra: 'x'.repeat(9000) }],
  ] as const)
    await expect(porta(status, body).ler(dono)).rejects.toBeInstanceOf(PosseIndisponivelError)
  const pedido = { ...dono, aparencia: 'aquario-classico' as const, equipe: false }
  await expect(
    porta(409, { ok: true, posse, jaPossuia: false }).comprar(pedido),
  ).rejects.toBeInstanceOf(PosseIndisponivelError)
  await expect(
    porta(200, { ok: false, codigo: 'SALDO_INSUFICIENTE' }).comprar(pedido),
  ).rejects.toBeInstanceOf(PosseIndisponivelError)
  expect(await porta(409, { ok: false, codigo: 'SALDO_INSUFICIENTE' }).comprar(pedido)).toEqual({
    ok: false,
    codigo: 'SALDO_INSUFICIENTE',
  })
  const fora = new PosseHttp({
    url: 'http://members',
    token: 't',
    fetch: (async () => {
      throw new Error('rede')
    }) as unknown as typeof fetch,
  })
  await expect(fora.ler(dono)).rejects.toBeInstanceOf(PosseIndisponivelError)
})
