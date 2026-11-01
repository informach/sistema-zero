import { expect, test } from 'bun:test'
import { VERSAO_CONTRATO_PLATAFORMA } from '@sistemazero/arquipelago-contracts'
import { localizarEntrada, origemDoCliente } from '../src/lib/arquipelago-cliente'

/** A publicação separada (lacunas, 01/11/2026): o canal no CDN ou o manifesto do serviço. */
const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } })
const ponteiro = (extra: Record<string, unknown> = {}) => ({
  formato: 2,
  canal: 'estavel',
  versao: '2026110101',
  entrada: 'entrada-abc.js',
  versaoContrato: VERSAO_CONTRATO_PLATAFORMA,
  geradoEm: '2026-11-01T10:00:00.000Z',
  promovidoEm: '2026-11-01T12:00:00.000Z',
  ...extra,
})

test('a origem do CDN é só uma origem https; o canal padrão é o estável', () => {
  expect(origemDoCliente({ cdn: 'https://cdn.exemplo.com', canal: 'teste' })).toEqual({
    cdn: 'https://cdn.exemplo.com',
    canal: 'teste',
  })
  expect(origemDoCliente({ cdn: 'https://cdn.exemplo.com/', canal: 'outro' })?.canal).toBe(
    'estavel',
  )
  for (const cdn of [
    undefined,
    '',
    'http://cdn.exemplo.com',
    'https://cdn.exemplo.com/pasta',
    'https://u:p@cdn.exemplo.com',
    'https://cdn.exemplo.com/?x=1',
    'nao-e-url',
  ])
    expect(origemDoCliente({ cdn })).toBeNull()
})

test('pelo canal: a entrada da versão apontada; ponteiro de outro canal ou contrato fora, nada', async () => {
  const origem = { cdn: 'https://cdn.exemplo.com', canal: 'estavel' as const }
  const pedidos: string[] = []
  const buscar = (corpo: unknown, status = 200) =>
    (async (url: string) => {
      pedidos.push(url)
      return resposta(corpo, status)
    }) as unknown as typeof fetch
  expect(await localizarEntrada(origem, '/api/arquipelago', buscar(ponteiro()))).toBe(
    'https://cdn.exemplo.com/arquipelago/versoes/2026110101/entrada-abc.js',
  )
  expect(pedidos[0]).toBe('https://cdn.exemplo.com/arquipelago/canais/estavel.json')
  expect(await localizarEntrada(origem, '', buscar(ponteiro({ canal: 'teste' })))).toBeNull()
  expect(await localizarEntrada(origem, '', buscar(ponteiro({ versaoContrato: 99 })))).toBeNull()
  expect(await localizarEntrada(origem, '', buscar(ponteiro({ versao: '../x' })))).toBeNull()
  expect(await localizarEntrada(origem, '', buscar(null, 404))).toBeNull()
})

test('sem CDN: o manifesto do serviço, como antes', async () => {
  const buscar = (async () =>
    resposta({
      versao: '1',
      entrada: 'entrada-abc.js',
      versaoContrato: VERSAO_CONTRATO_PLATAFORMA,
      geradoEm: '2026-11-01T10:00:00.000Z',
    })) as unknown as typeof fetch
  expect(await localizarEntrada(null, '/api/arquipelago', buscar)).toBe(
    '/api/arquipelago/cliente/entrada-abc.js',
  )
})
