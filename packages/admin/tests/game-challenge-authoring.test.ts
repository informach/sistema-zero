import { expect, test } from 'bun:test'
import { CriarDesafioSchema } from '@sistemazero/arquipelago-contracts'
import { gameAdminRequest } from '../src/lib/arquipelago-admin'
import {
  challengeDraft,
  challengePayload,
  challengeType,
  newChallenge,
} from '../src/lib/game-challenge-authoring'

const id = 'db9ca185-3ce4-4eba-a07d-8cdba7a145fd'
function valid() {
  const draft = newChallenge('kids')
  draft.metadados.slug = 'primeira-cor'
  draft.conteudo.titulo = 'Primeira cor'
  draft.conteudo.enunciado = 'Faça o personagem andar.'
  draft.conteudo.objetivos = [
    {
      id: 'andar',
      label: 'O personagem anda',
      rule: {
        type: 'behavior',
        steps: [{ action: 'press', key: 'ArrowRight', holdMs: 500 }],
        expect: { target: { kind: 'value', path: 'jogador.x' }, compare: 'increased' },
      },
    },
  ]
  return draft
}
test('new challenges keep initial and solution independent; optional blank manual lines are not required blocks', () => {
  const draft = valid()
  expect(draft.conteudo.projetoInicial).not.toBe(draft.conteudo.gabarito)
  draft.conteudo.blocosManuais.acrescentar = [' mover ', '']
  const payload = CriarDesafioSchema.parse(challengePayload(draft))
  expect(payload.conteudo.blocosManuais.acrescentar).toEqual(['mover'])
  expect(payload.conteudo.objetivos[0]?.rule.type).toBe('behavior')
})
test('loading a saved challenge validates semantic rules rather than replacing them with defaults', () => {
  const draft = valid()
  const saved = {
    resumo: {
      id,
      slug: 'primeira-cor',
      publico: 'kids' as const,
      ilha: 'sua-ilha' as const,
      tipo: 'quadro-das-cores' as const,
      quadro: 1,
      ordem: 0,
      titulo: 'Primeira cor',
      situacao: 'rascunho' as const,
      revisao: 1,
      revisaoPublicada: null,
      alteradoDepoisDePublicar: false,
      atualizadoEm: new Date().toISOString(),
    },
    ...challengePayload(draft),
    blocosPublicados: null,
  }
  const loaded = challengeDraft(saved)
  expect(loaded.conteudo.objetivos).toEqual(draft.conteudo.objetivos)
  expect(loaded.conteudo.objetivos).not.toBe(saved.conteudo.objetivos)
  saved.conteudo.objetivos[0]!.rule = { type: 'unknown' }
  expect(() => challengeDraft(saved)).toThrow('incompatíveis')
})
test('desafio do dia: trocar o tipo desliga a cor e traz 10 e 5 moedas; a cor nunca sai ligada', () => {
  const draft = challengeType(valid(), 'desafio-do-dia')
  expect(draft.metadados).toMatchObject({ tipo: 'desafio-do-dia', quadro: null })
  expect(draft.conteudo.recompensa).toMatchObject({ cor: false, moedas: 10, moedasExtra: 5 })
  expect(CriarDesafioSchema.safeParse(challengePayload(draft)).success).toBe(true)
  // Um rascunho antigo com a cor ligada sai desligado.
  draft.conteudo.recompensa.cor = true
  expect(CriarDesafioSchema.parse(challengePayload(draft)).conteudo.recompensa.cor).toBe(false)
  const quadro = challengeType(draft, 'quadro-das-cores')
  expect(quadro.metadados.quadro).toBe(1)
  expect(quadro.conteudo.recompensa).toMatchObject({ moedas: 20, moedasExtra: 10 })
})
test('Admin BFF allows only game authoring paths and requires audience in lists', () => {
  expect(
    gameAdminRequest('GET', ['desafios'], new URLSearchParams('publico=adulto'), undefined).query,
  ).toEqual({ publico: 'adulto' })
  expect(() => gameAdminRequest('GET', ['desafios'], new URLSearchParams(), undefined)).toThrow()
  for (const path of [
    ['tempo'],
    ['desafios', '..'],
    ['desafios', id, 'moedas'],
    ['desafios', id, 'publicar', 'extra'],
  ])
    expect(() =>
      gameAdminRequest('POST', path, new URLSearchParams(), { revisaoBase: 1 }),
    ).toThrow()
  expect(() =>
    gameAdminRequest('PUT', ['desafios', id], new URLSearchParams(), challengePayload(valid())),
  ).toThrow()
  expect(() =>
    gameAdminRequest('POST', ['desafios', id, 'publicar'], new URLSearchParams(), {
      revisaoBase: 1,
      publico: 'adulto',
    }),
  ).toThrow()
  expect(
    gameAdminRequest('POST', ['desafios', id, 'publicar'], new URLSearchParams(), {
      revisaoBase: 3,
    }).body,
  ).toEqual({ revisaoBase: 3 })
})
test('Admin BFF: manifesto de um desafio, exportar com filtro opcional e só conferir e aplicar', () => {
  expect(
    gameAdminRequest('GET', ['desafios', id, 'manifesto'], new URLSearchParams(), undefined),
  ).toEqual({
    path: `/arquipelago/admin/desafios/${id}/manifesto`,
    body: undefined,
  })
  expect(
    gameAdminRequest('GET', ['manifestos', 'exportar'], new URLSearchParams(), undefined).query,
  ).toEqual({})
  expect(
    gameAdminRequest(
      'GET',
      ['manifestos', 'exportar'],
      new URLSearchParams('publico=kids&ilha=bosque'),
      undefined,
    ).query,
  ).toEqual({ publico: 'kids', ilha: 'bosque' })
  for (const [method, path, search] of [
    ['GET', ['manifestos', 'exportar'], 'ilha=atlantida'],
    ['GET', ['manifestos', 'exportar'], 'outro=1'],
    ['GET', ['desafios', id, 'manifesto'], 'x=1'],
    ['GET', ['desafios', 'nao-e-id', 'manifesto'], ''],
    ['POST', ['manifestos', 'apagar'], ''],
    ['POST', ['manifestos', 'conferir'], 'x=1'],
  ] as const)
    expect(() =>
      gameAdminRequest(method, [...path], new URLSearchParams(search), { manifesto: {} }),
    ).toThrow()
  expect(() =>
    gameAdminRequest('POST', ['manifestos', 'conferir'], new URLSearchParams(), { manifesto: {} }),
  ).toThrow()
})
