import { expect, test } from 'bun:test'
import { challengeDraftScope, challengeForViewer } from '../src/lib/arquipelago-challenge'

const id = 'db9ca185-3ce4-4eba-a07d-8cdba7a145fd'
const actor = 'cabcfbd0-251b-4236-89aa-4e44fc03204d'
const molde = { tipo: 'desafio' as const, desafioId: id, revisao: 2 }
const response = {
  id,
  jogadorId: actor,
  revisao: 2,
  blocosPermitidos: ['mover'],
  titulo: 'Andar',
  enunciado: 'Ande',
  dicas: [],
  desafioExtra: null,
  objetivos: [],
  projetoInicial: {},
  ultimosResultados: [],
  concluido: false,
}

test('challenge opening binds actor, id and published revision without requiring free Studio', () => {
  expect(challengeForViewer(response, actor, molde).blocosPermitidos).toEqual(['mover'])
  expect(() => challengeForViewer(response, crypto.randomUUID(), molde)).toThrow('mudou')
  expect(() => challengeForViewer(response, actor, { ...molde, revisao: 3 })).toThrow('mudou')
  expect(() =>
    challengeForViewer(response, actor, { ...molde, desafioId: crypto.randomUUID() }),
  ).toThrow('mudou')
  expect(() => challengeForViewer({ ...response, gabarito: {} }, actor, molde)).toThrow()
  expect(() =>
    challengeForViewer({ ...response, blocosPermitidos: undefined }, actor, molde),
  ).toThrow()
})
test('drafts are isolated by account, community, challenge and revision', () => {
  const scopes = [
    challengeDraftScope('kids', actor, id, 2),
    challengeDraftScope('adult', actor, id, 2),
    challengeDraftScope('kids', crypto.randomUUID(), id, 2),
    challengeDraftScope('kids', actor, id, 3),
    challengeDraftScope('kids', actor, crypto.randomUUID(), 2),
  ]
  expect(new Set(scopes.map((s) => `${s.namespace}/${s.projectId}`)).size).toBe(5)
  expect(scopes).toContainEqual(challengeDraftScope('kids', actor, id, 2))
})
