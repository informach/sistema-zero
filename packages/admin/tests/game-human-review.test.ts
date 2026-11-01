import { expect, test } from 'bun:test'
import { gameAdminRequest } from '../src/lib/arquipelago-admin'

const jogador = '11111111-1111-4111-8111-111111111111'
const desafio = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

test('BFF da revisão humana da Lenda: a fila, um item e a resposta, nada além', () => {
  expect(
    gameAdminRequest('GET', ['revisoes'], new URLSearchParams({ estado: 'aguardando' }), undefined),
  ).toEqual({
    path: '/arquipelago/admin/revisoes',
    query: { estado: 'aguardando' },
    body: undefined,
  })
  expect(
    gameAdminRequest('GET', ['revisoes', jogador, desafio], new URLSearchParams(), undefined),
  ).toEqual({ path: `/arquipelago/admin/revisoes/${jogador}/${desafio}`, body: undefined })
  const resposta = {
    envio: 2,
    estado: 'nova-tentativa',
    retorno: 'Faça a pedra cair mais devagar.',
  } as const
  expect(
    gameAdminRequest('POST', ['revisoes', jogador, desafio], new URLSearchParams(), resposta),
  ).toEqual({ path: `/arquipelago/admin/revisoes/${jogador}/${desafio}`, body: resposta })
  // Estado desconhecido, id inválido, corpo a mais ou resposta "aguardando" não passam.
  expect(() =>
    gameAdminRequest('GET', ['revisoes'], new URLSearchParams({ estado: 'todos' }), undefined),
  ).toThrow()
  expect(() =>
    gameAdminRequest('GET', ['revisoes', 'x', desafio], new URLSearchParams(), undefined),
  ).toThrow()
  expect(() =>
    gameAdminRequest('POST', ['revisoes', jogador, desafio], new URLSearchParams(), {
      ...resposta,
      estado: 'aguardando',
    }),
  ).toThrow()
  expect(() =>
    gameAdminRequest('POST', ['revisoes', jogador, desafio], new URLSearchParams(), {
      ...resposta,
      revisadoPor: jogador,
    }),
  ).toThrow()
  expect(() =>
    gameAdminRequest('PUT', ['revisoes', jogador, desafio], new URLSearchParams(), resposta),
  ).toThrow()
})
