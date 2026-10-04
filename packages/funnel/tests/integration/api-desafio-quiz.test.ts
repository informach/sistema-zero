import { describe, expect, test } from 'bun:test'
import { quizDefinition } from '../../src/analytics/quiz-definition'
import type { QuizDefinition } from '../../src/analytics/types'
import { DESAFIO_PRIMEIRO_JOGO } from '../../src/funnels/desafio-primeiro-jogo'
import { DESAFIO_QUIZ_VERSION } from '../../src/funnels/desafio-primeiro-jogo/quiz/engine'
import { LEAD_COOKIE } from '../../src/lib/lead-session'
import type { QuizAnswers } from '../../src/lib/quiz-types'
import { createLead, patchLead } from '../../src/server/leads'
import { quizSessionToken } from '../../src/server/quiz-session'
import { createFakeRepo } from '../fakes/fake-db'

const funnel = DESAFIO_PRIMEIRO_JOGO.key
const definition = quizDefinition(DESAFIO_PRIMEIRO_JOGO)!
const fixture = (): QuizAnswers => ({
  _quiz_version: DESAFIO_QUIZ_VERSION,
  _quiz_revision: 8,
  idade: '9_11',
  equipamento: 'disponivel',
  interesses: ['joga'],
  experiencia: 'primeira_vez',
  motivos: ['B'],
  duvida: 'ajuda',
  formato: 'gravado',
  abertura_criacao: 'conhecer',
})
const request = (method: string, body: Record<string, unknown>, id?: string) =>
  new Request('http://localhost/api/leads', {
    method,
    headers: {
      'content-type': 'application/json',
      ...(id ? { cookie: `${LEAD_COOKIE}=${id}` } : {}),
    },
    body: JSON.stringify({
      funnel,
      quizDefinitionId: definition.id,
      ...(id ? { sessionToken: quizSessionToken(id) } : {}),
      ...body,
    }),
  })
async function setup(answers: QuizAnswers = {}) {
  const fake = createFakeRepo()
  const definitions: QuizDefinition[] = []
  const deps = {
    repo: fake.repo,
    secureCookie: false,
    saveQuizDefinition: async (d: QuizDefinition) => {
      definitions.push(structuredClone(d))
    },
  }
  const response = await createLead(request('POST', {}), deps)
  const { id } = await response.json()
  if (Object.keys(answers).length) await fake.repo.updateLead(id, { quizAnswers: answers })
  return { ...fake, deps, id: id as string, definitions }
}

describe('API do Desafio Farol', () => {
  test('registra definição, confirma respostas e emite marcos na revisão salva', async () => {
    const { deps, id, repo, events, definitions } = await setup()
    expect(definitions[0]?.version).toBe(DESAFIO_QUIZ_VERSION)
    expect(definitions[0]?.questions).toHaveLength(10)
    let revision = 0
    for (const [key, value] of Object.entries(fixture()).filter(([k]) => !k.startsWith('_'))) {
      const response = await patchLead(request('PATCH', { key, value, revision }, id), deps)
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.answers._quiz_revision).toBe(++revision)
      expect(body.complete).toBe(revision === 8)
    }
    const lead = await repo.getLead(id)
    expect(lead?.perfilResultado).toBe('criacao-de-jogos')
    expect(lead?.quizDefinitionId).toBe(definition.id)
    expect(events.filter((e) => e.eventName === 'start_quiz')).toHaveLength(1)
    expect(events.filter((e) => e.eventName === 'complete_quiz')).toHaveLength(1)
    const saved = events.filter((e) => e.eventName === 'quiz_answer_saved')
    expect(saved).toHaveLength(8)
    expect(saved.at(-1)?.metadata).toMatchObject({
      quiz_definition_id: definition.id,
      question_id: 'abertura_criacao',
    })
    expect(new Set(saved.map((e) => e.eventKey)).size).toBe(8)
  })
  test('abre desempate, recusa escolha fora do ramo e mantém empate sem perfil forçado', async () => {
    const { deps, id, repo } = await setup(fixture())
    const update = await patchLead(
      request('PATCH', { key: 'motivos', value: ['A', 'C'], revision: 8 }, id),
      deps,
    )
    expect((await update.json()).complete).toBe(false)
    expect((await repo.getLead(id))?.perfilResultado).toBeNull()
    expect(
      (await patchLead(request('PATCH', { key: 'prioridade', value: 'D', revision: 9 }, id), deps))
        .status,
    ).toBe(400)
    const tie = await patchLead(
      request('PATCH', { key: 'prioridade', value: 'iguais', revision: 9 }, id),
      deps,
    )
    expect((await tie.json()).complete).toBe(true)
    expect((await repo.getLead(id))?.perfilResultado).toBeNull()
    await patchLead(request('PATCH', { key: 'motivos', value: ['C'], revision: 10 }, id), deps)
    const lead = await repo.getLead(id)
    expect(lead?.perfilResultado).toBe('expressao-visual')
    expect(lead?.quizAnswers?.prioridade).toBeUndefined()
    expect(lead?.quizAnswers?.duvida).toBe('ajuda')
  })
  test('outra atividade exige esclarecimento, que sai ao considerar a iniciação', async () => {
    const { deps, id, repo } = await setup(fixture())
    const response = await patchLead(
      request('PATCH', { key: 'abertura_criacao', value: 'outra_atividade', revision: 8 }, id),
      deps,
    )
    expect((await response.json()).complete).toBe(false)
    await patchLead(
      request('PATCH', { key: 'desencontro', value: 'desenho', revision: 9 }, id),
      deps,
    )
    await patchLead(
      request('PATCH', { key: 'abertura_criacao', value: 'conhecer', revision: 10 }, id),
      deps,
    )
    expect((await repo.getLead(id))?.quizAnswers?.desencontro).toBeUndefined()
    expect(
      (
        await patchLead(
          request('PATCH', { key: 'desencontro', value: 'desenho', revision: 11 }, id),
          deps,
        )
      ).status,
    ).toBe(400)
  })
  test('novo quiz não reinterpreta nem apaga as respostas da tipologia antiga', async () => {
    const { deps, repo } = await setup()
    const { id } = await repo.createLead(funnel)
    const old = { perfil: 'criador', tempo_tela: 'muito' }
    await repo.updateLead(id, { quizAnswers: old, perfilResultado: 'criador' })
    const response = await createLead(request('POST', {}, id), deps)
    expect(response.status).toBe(201)
    const next = await response.json()
    expect(next.id).not.toBe(id)
    expect(next.answers).toEqual({})
    expect((await repo.getLead(id))?.quizAnswers).toEqual(old)
  })
  test('a exposição ao produto na v2 não vira abertura espontânea na v3', async () => {
    const { deps, repo, id } = await setup()
    const { abertura_criacao: _, ...otherAnswers } = fixture()
    const old = {
      ...otherAnswers,
      _quiz_version: 'desafio-farol-v2',
      interesse_no_projeto: 'conhecer',
    }
    await repo.updateLead(id, { quizAnswers: old })
    const response = await createLead(request('POST', {}, id), deps)
    expect(response.status).toBe(201)
    const next = await response.json()
    expect(next.id).not.toBe(id)
    expect(next.answers).toEqual({})
    expect((await repo.getLead(id))?.quizAnswers).toEqual(old)
    const invalid = await patchLead(
      request('PATCH', { key: 'interesse_no_projeto', value: 'conhecer', revision: 0 }, next.id),
      deps,
    )
    expect(invalid.status).toBe(400)
  })
  test('outro filho tem sessão própria, e uma aba anterior não pode sobrescrevê-la', async () => {
    const { deps, id, repo } = await setup(fixture())
    const next = await (await createLead(request('POST', { restartQuiz: true }, id), deps)).json()
    expect(next.id).not.toBe(id)
    expect(next.answers).toEqual({})
    const response = await patchLead(
      request(
        'PATCH',
        { key: 'idade', value: '12_14', revision: 0, sessionToken: quizSessionToken(id) },
        next.id,
      ),
      deps,
    )
    expect(response.status).toBe(409)
    expect((await repo.getLead(id))?.quizAnswers).toEqual(fixture())
    expect((await repo.getLead(next.id))?.quizAnswers).toBeNull()
  })
  test('duas abas não gravam a mesma revisão duas vezes', async () => {
    const { deps, id, events } = await setup(fixture())
    const responses = await Promise.all(
      ['rotina', 'companhia'].map((value) =>
        patchLead(request('PATCH', { key: 'duvida', value, revision: 8 }, id), deps),
      ),
    )
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409])
    expect(events.filter((e) => e.eventName === 'quiz_answer_saved')).toHaveLength(1)
  })
  test('definição antiga, outro funil e pagamento confirmado impedem mutação', async () => {
    const { deps, id, repo } = await setup(fixture())
    const body = { key: 'duvida', value: 'rotina', revision: 8 }
    for (const extra of [
      { quizDefinitionId: '0'.repeat(64) },
      { funnel: 'kids/comunidade-dos-criadores' },
    ]) {
      expect((await patchLead(request('PATCH', { ...body, ...extra }, id), deps)).status).toBe(409)
    }
    await repo.updateLead(id, { paidAt: new Date() })
    expect((await patchLead(request('PATCH', body, id), deps)).status).toBe(409)
    expect((await repo.getLead(id))?.quizAnswers).toEqual(fixture())
  })
})
