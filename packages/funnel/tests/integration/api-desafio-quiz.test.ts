import { describe, expect, test } from 'bun:test'
import { quizDefinition } from '../../src/analytics/quiz-definition'
import type { QuizDefinition } from '../../src/analytics/types'
import { DESAFIO_ADULTO } from '../../src/funnels/desafio-adulto'
import { QUIZ_VERSION as ADULTO_VERSION } from '../../src/funnels/desafio-adulto/quiz/engine'
import { DESAFIO_PRIMEIRO_JOGO } from '../../src/funnels/desafio-primeiro-jogo'
import { QUIZ_VERSION } from '../../src/funnels/desafio-primeiro-jogo/quiz/engine'
import { LEAD_COOKIE } from '../../src/lib/lead-session'
import type { QuizAnswers } from '../../src/lib/quiz-types'
import { createLead, patchLead } from '../../src/server/leads'
import { quizFeedback } from '../../src/server/quiz-feedback'
import { quizSessionToken } from '../../src/server/quiz-session'
import { createFakeRepo } from '../fakes/fake-db'

const funnel = DESAFIO_PRIMEIRO_JOGO.key
const definition = quizDefinition(DESAFIO_PRIMEIRO_JOGO)!
/** O 9 a 17 inteiro, na ordem das telas (perfil B). */
const respostas917: [string, string][] = [
  ['genero', 'filho'],
  ['idade', '13_17'],
  ['tempo_tela', '2_4'],
  ['computador', 'dividido'],
  ['cena', 'B'],
  ['trava', 'chama'],
  ['cena_desejada', 'B'],
  ['garantia', 'ajuda'],
  ['sintese', 'B'],
]
const fixture = (): QuizAnswers => ({
  ...Object.fromEntries(respostas917),
  _quiz_version: QUIZ_VERSION,
  _quiz_revision: 9,
})
/** `f: null` manda o corpo sem o funil (o feedback é estrito e não o aceita). */
const request = (
  method: string,
  body: Record<string, unknown>,
  id?: string,
  f: string | null = funnel,
) =>
  new Request('http://localhost/api/leads', {
    method,
    headers: {
      'content-type': 'application/json',
      ...(id ? { cookie: `${LEAD_COOKIE}=${id}` } : {}),
    },
    body: JSON.stringify({
      ...(f ? { funnel: f } : {}),
      ...(id ? { sessionToken: quizSessionToken(id) } : {}),
      ...body,
    }),
  })
async function setup(answers: QuizAnswers = {}, perfilResultado: string | null = null) {
  const fake = createFakeRepo()
  const { id } = await fake.repo.createLead(funnel)
  await fake.repo.updateLead(id, { quizAnswers: answers, perfilResultado })
  return { ...fake, id, deps: { repo: fake.repo, secureCookie: false } }
}

describe('API do quiz Kids do Desafio (v5)', () => {
  test('registra a definição v5, grava cada resposta com revisão e os marcos uma vez', async () => {
    const fake = createFakeRepo()
    const definitions: QuizDefinition[] = []
    const deps = {
      repo: fake.repo,
      secureCookie: false,
      saveQuizDefinition: async (d: QuizDefinition) => {
        definitions.push(structuredClone(d))
      },
    }
    const created = await createLead(request('POST', { quizDefinitionId: definition.id }), deps)
    const { id } = await created.json()
    expect(definitions[0]?.version).toBe(QUIZ_VERSION)
    expect(definitions[0]?.questions).toHaveLength(16)
    let revision = 0
    for (const [key, value] of respostas917) {
      const response = await patchLead(
        request('PATCH', { key, value, revision, quizDefinitionId: definition.id }, id),
        deps,
      )
      expect([key, response.status]).toEqual([key, 200])
      const body = await response.json()
      expect(body.answers._quiz_revision).toBe(++revision)
      expect(body.complete).toBe(revision === respostas917.length)
    }
    const lead = await fake.repo.getLead(id)
    expect(lead?.perfilResultado).toBe('criacao-de-jogos')
    expect(lead?.quizDefinitionId).toBe(definition.id)
    const names = fake.events.map((e) => e.eventName)
    expect(names.filter((n) => n === 'start_quiz')).toHaveLength(1)
    expect(names.filter((n) => n === 'complete_quiz')).toHaveLength(1)
    expect(names.filter((n) => n === 'entrou_ramo_9a17')).toHaveLength(1)
    expect(names).toContain('respondeu_desafio_v5_sintese')
    const saved = fake.events.filter((e) => e.eventName === 'quiz_answer_saved')
    expect(saved).toHaveLength(respostas917.length)
    expect(saved.at(-1)?.metadata).toMatchObject({
      quiz_definition_id: definition.id,
      question_id: 'sintese',
    })
  })

  test('a v4 inicia novo lead sem apagar respostas; a aba antiga não grava no lead v4', async () => {
    const old = { idade: '9_11', motivos: ['B'], _quiz_version: 'desafio-farol-v4' }
    const { deps, id, repo } = await setup(old)
    const response = await createLead(request('POST', {}, id), deps)
    expect(response.status).toBe(201)
    expect((await response.json()).id).not.toBe(id)
    expect((await repo.getLead(id))?.quizAnswers).toEqual(old)
    const patch = await patchLead(
      request('PATCH', { key: 'genero', value: 'filha', revision: 0 }, id),
      deps,
    )
    expect(patch.status).toBe(409)
    expect((await patch.json()).error.code).toBe('QUIZ_CONFLICT')
    expect((await repo.getLead(id))?.quizAnswers).toEqual(old)
  })

  test('trocar a idade grava cada ramo uma vez e apaga as respostas do ramo anterior', async () => {
    const { deps, id, events, repo } = await setup(fixture(), 'criacao-de-jogos')
    const salvar = async (key: string, value: string) => {
      const revision = Number((await repo.getLead(id))?.quizAnswers?._quiz_revision ?? 0)
      return patchLead(request('PATCH', { key, value, revision }, id), deps)
    }
    expect((await salvar('idade', 'menos_9')).status).toBe(200)
    const lead = await repo.getLead(id)
    expect(lead?.quizAnswers?.tempo_tela).toBeUndefined()
    expect(lead?.quizAnswers?.genero).toBe('filho')
    expect(lead?.perfilResultado).toBeNull()
    expect((await salvar('m9_leitura', 'nao')).status).toBe(200)
    expect((await salvar('tempo_tela', '2_4')).status).toBe(400)
    expect(events.map((e) => e.eventName)).toContain('entrou_ramo_m9')
  })

  test('18 ou mais: grava a saída e o quiz não completa', async () => {
    const { deps, id, events, repo } = await setup()
    await patchLead(request('PATCH', { key: 'genero', value: 'filha', revision: 0 }, id), deps)
    const res = await patchLead(
      request('PATCH', { key: 'idade', value: '18_mais', revision: 1 }, id),
      deps,
    )
    expect((await res.json()).complete).toBe(false)
    expect(events.map((e) => e.eventName)).toContain('entrou_ramo_adulto')
    expect((await repo.getLead(id))?.perfilResultado).toBeNull()
  })

  test('feedback do resultado em carta, com o ramo e o perfil, só na revisão atual', async () => {
    const { deps, id, events } = await setup(fixture(), 'criacao-de-jogos')
    expect(
      (await quizFeedback(request('POST', { feedback: 'sim', revision: 8 }, id, null), deps))
        .status,
    ).toBe(409)
    expect(
      (await quizFeedback(request('POST', { feedback: 'em_parte', revision: 9 }, id, null), deps))
        .status,
    ).toBe(201)
    expect(events.find((e) => e.eventName === 'quiz_feedback')?.metadata).toMatchObject({
      feedback: 'em_parte',
      revision: 9,
      perfil: 'criacao-de-jogos',
      ramo: '9a17',
    })
  })

  test('outra criança recebe nova sessão sem apagar a anterior', async () => {
    const { deps, id, repo } = await setup(fixture())
    const res = await createLead(request('POST', { restartQuiz: true }, id), deps)
    expect(res.status).toBe(201)
    const next = await res.json()
    expect(next.id).not.toBe(id)
    expect(next.answers).toEqual({})
    expect((await repo.getLead(id))?.quizAnswers).toEqual(fixture())
  })

  test('a manchete `tela` vai na atribuição do lead', async () => {
    const fake = createFakeRepo()
    const res = await createLead(
      request('POST', {
        attribution: { landingPath: '/kids/desafio-primeiro-jogo/quiz', quizHeadline: 'tela' },
      }),
      { repo: fake.repo, secureCookie: false },
    )
    expect((await fake.repo.getLead((await res.json()).id))?.attribution?.quizHeadline).toBe('tela')
  })
})

describe('API do quiz adulto do Desafio (v1)', () => {
  const adulto = DESAFIO_ADULTO.key
  const respostas: [string, string][] = [
    ['computador', 'meu'],
    ['programacao', 'nunca'],
    ['tempo_livre', '1_3'],
    ['cena', 'D'],
    ['tentativa', 'tutorial'],
    ['cena_desejada', 'D'],
    ['garantia', 'zero'],
    ['sintese', 'D'],
  ]

  test('oito respostas completam o quiz, com perfil, definição e feedback', async () => {
    const fake = createFakeRepo()
    const deps = { repo: fake.repo, secureCookie: false }
    const definitionAdulto = quizDefinition(DESAFIO_ADULTO)!
    const created = await createLead(
      request('POST', { quizDefinitionId: definitionAdulto.id }, undefined, adulto),
      deps,
    )
    expect(created.status).toBe(201)
    const { id } = await created.json()
    let revision = 0
    for (const [key, value] of respostas) {
      const response = await patchLead(request('PATCH', { key, value, revision }, id, adulto), deps)
      expect([key, response.status]).toEqual([key, 200])
      const body = await response.json()
      expect(body.answers._quiz_version).toBe(ADULTO_VERSION)
      expect(body.complete).toBe(++revision === respostas.length)
    }
    expect((await fake.repo.getLead(id))?.perfilResultado).toBe('desafio-adulto-por-dentro')
    expect(fake.events.map((e) => e.eventName)).toContain('respondeu_desafio_adulto_v1_sintese')
    expect(fake.events.some((e) => e.eventName.startsWith('entrou_ramo_'))).toBe(false)
    expect(
      (
        await quizFeedback(
          request('POST', { feedback: 'sim', revision: respostas.length }, id, null),
          deps,
        )
      ).status,
    ).toBe(201)
  })

  test('uma resposta do Kids não entra no quiz adulto', async () => {
    const fake = createFakeRepo()
    const { id } = await fake.repo.createLead(adulto)
    const deps = { repo: fake.repo, secureCookie: false }
    expect(
      (
        await patchLead(
          request('PATCH', { key: 'genero', value: 'filho', revision: 0 }, id, adulto),
          deps,
        )
      ).status,
    ).toBe(400)
  })
})
