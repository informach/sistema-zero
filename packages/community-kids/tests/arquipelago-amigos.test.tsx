import { afterEach, expect, mock, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { VisitasDeAmigos } from '../src/app/pais/_components/arquipelago-familia'

const LIA = '11111111-1111-4111-8111-111111111111'
const CASA = '33333333-3333-4333-8333-333333333333'
const CODIGO = 'abcdefghijklmnopqrstuvwxyz012345'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

type Rotas = Record<string, (init?: RequestInit) => Response>

function servidor(rotas: Rotas) {
  const calls: Array<{ url: string; method: string; body?: string }> = []
  globalThis.fetch = Object.assign(
    mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      calls.push({ url, method, body: init?.body?.toString() })
      const responder = rotas[`${method} ${url}`]
      return responder ? responder(init) : Response.json({}, { status: 404 })
    }),
    { preconnect: originalFetch.preconnect },
  )
  return calls
}

const ROTA = '/api/parents/arquipelago/amigos'
const amigos = (ativo: boolean, casas: Array<{ id: string; apelido: string }> = []) =>
  Response.json({
    versao: 1,
    situacao: 'ok',
    convites: [{ perfilId: LIA, ativo, nome: 'Lia' }],
    casas,
  })

test('gerar o convite mostra o código uma vez e o convite fica ligado', async () => {
  let ativo = false
  const calls = servidor({
    [`GET ${ROTA}`]: () => amigos(ativo),
    [`POST ${ROTA}/convite`]: () => {
      ativo = true
      return Response.json({ versao: 1, perfilId: LIA, codigo: CODIGO })
    },
  })
  render(<VisitasDeAmigos />)
  fireEvent.click(await screen.findByRole('button', { name: 'Gerar convite' }))
  expect(await screen.findByText(CODIGO)).toBeTruthy()
  await screen.findByText('Lia: convite ligado')
  expect(calls.find((c) => c.method === 'POST')?.body).toBe(JSON.stringify({ perfilId: LIA }))
})

test('aceitar o código de outra família guarda a casa com o apelido', async () => {
  let casas: Array<{ id: string; apelido: string }> = []
  const calls = servidor({
    [`GET ${ROTA}`]: () => amigos(false, casas),
    [`POST ${ROTA}/aceitar`]: () => {
      casas = [{ id: CASA, apelido: 'Casa da Bia' }]
      return Response.json({ versao: 1, id: CASA, apelido: 'Casa da Bia' })
    },
  })
  render(<VisitasDeAmigos />)
  fireEvent.change(await screen.findByLabelText('Código recebido de outra família'), {
    target: { value: ` ${CODIGO} ` },
  })
  fireEvent.change(screen.getByLabelText('Como as crianças vão chamar essa casa'), {
    target: { value: 'Casa da Bia' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Aceitar a casa' }))
  await screen.findByText('Casa da Bia entrou nas casas de amigos.')
  expect(screen.getByRole('button', { name: 'Remover' })).toBeTruthy()
  expect(calls.find((c) => c.method === 'POST')?.body).toBe(
    JSON.stringify({ codigo: CODIGO, apelido: 'Casa da Bia' }),
  )
})

test('código recusado avisa sem guardar nada', async () => {
  servidor({
    [`GET ${ROTA}`]: () => amigos(false),
    [`POST ${ROTA}/aceitar`]: () =>
      Response.json({ code: 'CASA_DE_AMIGO_INDISPONIVEL' }, { status: 404 }),
  })
  render(<VisitasDeAmigos />)
  fireEvent.change(await screen.findByLabelText('Código recebido de outra família'), {
    target: { value: CODIGO },
  })
  fireEvent.change(screen.getByLabelText('Como as crianças vão chamar essa casa'), {
    target: { value: 'Casa da Bia' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Aceitar a casa' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Não consegui salvar agora')
  expect(screen.queryByRole('button', { name: 'Remover' })).toBeNull()
})
