import { describe, expect, test } from 'bun:test'
import { QUIZ_VERSION } from '../../src/funnels/comunidade-dos-criadores/quiz/engine'
import { LEAD_COOKIE } from '../../src/lib/lead-session'
import type { QuizAnswers } from '../../src/lib/quiz-types'
import { communityQuizFeedback } from '../../src/server/community-quiz-feedback'
import { createLead, patchLead } from '../../src/server/leads'
import { quizSessionToken } from '../../src/server/quiz-session'
import { createFakeRepo } from '../fakes/fake-db'

const funnel = 'kids/comunidade-dos-criadores'
const fixture = (): QuizAnswers => ({
  _quiz_version: QUIZ_VERSION,
  _quiz_revision: 9,
  q1: '9_a_11',
  q2: 'jogar',
  q3: ['jogo'],
  q4: ['B'],
  q5: 'ajuda',
  q6: 'pessoa',
  q7: 'pode_funcionar',
  q8: 'disponivel',
  qb: 'flexivel',
})
const request = (method: string, body: Record<string, unknown>, id?: string) =>
  new Request('http://localhost/api/leads', {
    method,
    headers: {
      'content-type': 'application/json',
      ...(id ? { cookie: `${LEAD_COOKIE}=${id}` } : {}),
    },
    body: JSON.stringify({ ...(id ? { sessionToken: quizSessionToken(id) } : {}), ...body }),
  })
async function setup(answers: QuizAnswers = {}) {
  const fake = createFakeRepo()
  const { id } = await fake.repo.createLead(funnel)
  await fake.repo.updateLead(id, { quizAnswers: answers, perfilResultado: 'criacao-de-jogos' })
  return { ...fake, id, deps: { repo: fake.repo, secureCookie: false } }
}

describe('API do quiz da Comunidade', () => {
  test.each([
    'comunidade-orientacao-v2',
    'comunidade-orientacao-v3',
  ])('%s inicia novo lead sem reinterpretar nem apagar respostas', async (version) => {
    const oldAnswers = { ...fixture(), _quiz_version: version }
    const { deps, id, repo } = await setup(oldAnswers)
    const response = await createLead(request('POST', { funnel }, id), deps)
    expect(response.status).toBe(201)
    const next = await response.json()
    expect(next.id).not.toBe(id)
    expect(next.answers).toEqual({})
    expect((await repo.getLead(id))?.quizAnswers).toEqual(oldAnswers)
  })
  // Uma aba aberta antes do deploy grava num lead de outra versão: o `applyAnswer` tomaria as
  // respostas antigas por vazias e apagaria o lead (com q1) ou travaria o pai (com o resto).
  test.each([
    ['q1', '9_a_11'],
    ['q6', 'rever'],
  ])('a aba antiga não grava em lead v3 (%s): pede para retomar', async (key, value) => {
    const oldAnswers = { ...fixture(), _quiz_version: 'comunidade-orientacao-v3' }
    const { deps, id, repo } = await setup(oldAnswers)
    const response = await patchLead(
      request('PATCH', { key, value, funnel, revision: 9 }, id),
      deps,
    )
    expect(response.status).toBe(409)
    expect((await response.json()).error.code).toBe('QUIZ_CONFLICT')
    expect((await repo.getLead(id))?.quizAnswers).toEqual(oldAnswers)
  })
  test('versão vigente continua na mesma sessão', async () => {
    const { deps, id } = await setup(fixture())
    const response = await createLead(request('POST', { funnel }, id), deps)
    expect(response.status).toBe(200)
    expect((await response.json()).id).toBe(id)
  })
  test('uma aba do primeiro filho não escreve no segundo, mesmo com revisão igual', async () => {
    const { deps, id, repo } = await setup(fixture())
    const { id: nextId } = await repo.createLead(funnel)
    await repo.updateLead(nextId, { quizAnswers: fixture() })
    const sessionToken = quizSessionToken(id)
    expect(
      (
        await patchLead(
          request(
            'PATCH',
            { key: 'q6', value: 'rever', funnel, revision: 9, sessionToken },
            nextId,
          ),
          deps,
        )
      ).status,
    ).toBe(409)
    expect(
      (
        await communityQuizFeedback(
          request('POST', { feedback: 'sim', revision: 9, sessionToken }, nextId),
          deps,
        )
      ).status,
    ).toBe(409)
    expect((await repo.getLead(nextId))?.quizAnswers).toEqual(fixture())
  })
  test('exige cookie, funil, revisão e pergunta ativa', async () => {
    const { deps, id } = await setup()
    const body = { key: 'q1', value: '9_a_11', funnel, revision: 0 }
    expect((await patchLead(request('PATCH', body), deps)).status).toBe(401)
    expect(
      (
        await patchLead(
          request('PATCH', { ...body, funnel: 'kids/desafio-primeiro-jogo' }, id),
          deps,
        )
      ).status,
    ).toBe(409)
    expect((await patchLead(request('PATCH', { ...body, revision: 1 }, id), deps)).status).toBe(409)
    expect(
      (await patchLead(request('PATCH', { ...body, key: 'qb', value: 'roblox' }, id), deps)).status,
    ).toBe(400)
    expect((await patchLead(request('PATCH', body, id), deps)).status).toBe(200)
  })
  test('limpa qualificações, recalcula perfil e não apaga outras respostas ao editar', async () => {
    const { deps, id, repo } = await setup(fixture())
    const a = await patchLead(
      request('PATCH', { key: 'q3', value: ['nao_sei'], funnel, revision: 9 }, id),
      deps,
    )
    expect(a.status).toBe(200)
    const b = await patchLead(
      request('PATCH', { key: 'q4', value: ['D'], funnel, revision: 10 }, id),
      deps,
    )
    expect(b.status).toBe(200)
    const lead = await repo.getLead(id)
    expect(lead?.quizAnswers?.qb).toBeUndefined()
    expect(lead?.quizAnswers?.q5).toBe('ajuda')
    expect(lead?.perfilResultado).toBe('formacao-tecnologica')
  })
  test('ramo novo fica incompleto e remove perfil antigo', async () => {
    const { deps, id, repo } = await setup(fixture())
    const res = await patchLead(
      request('PATCH', { key: 'q4', value: ['B', 'C'], funnel, revision: 9 }, id),
      deps,
    )
    expect((await res.json()).complete).toBe(false)
    expect((await repo.getLead(id))?.perfilResultado).toBeNull()
  })
  test('duas gravações concorrentes: somente uma revisão vence', async () => {
    const { deps, id, repo } = await setup(fixture())
    const responses = await Promise.all(
      ['rever', 'experimentar'].map((value) =>
        patchLead(request('PATCH', { key: 'q6', value, funnel, revision: 9 }, id), deps),
      ),
    )
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409])
    expect((await repo.getLead(id))?.quizAnswers?._quiz_revision).toBe(10)
  })
  test('feedback só é gravado para resultado completo na revisão atual', async () => {
    const { deps, id, events, repo } = await setup(fixture())
    expect(
      (
        await communityQuizFeedback(
          request('POST', { feedback: 'nao_representa', revision: 8 }, id),
          deps,
        )
      ).status,
    ).toBe(409)
    expect(
      (
        await communityQuizFeedback(
          request('POST', { feedback: 'nao_representa', revision: 9 }, id),
          deps,
        )
      ).status,
    ).toBe(201)
    expect(events.filter((e) => e.eventName === 'quiz_feedback')).toHaveLength(1)
    expect((await repo.getLead(id))?.perfilResultado).toBe('criacao-de-jogos')
    await repo.updateLead(id, { quizAnswers: {} })
    expect(
      (await communityQuizFeedback(request('POST', { feedback: 'sim', revision: 0 }, id), deps))
        .status,
    ).toBe(409)
  })
  test('outro filho recebe nova sessão sem apagar a anterior', async () => {
    const { deps, id, repo } = await setup(fixture())
    const res = await createLead(request('POST', { funnel, restartQuiz: true }, id), deps)
    expect(res.status).toBe(201)
    const next = await res.json()
    expect(next.id).not.toBe(id)
    expect(next.answers).toEqual({})
    expect(res.headers.get('set-cookie')).toContain(`${LEAD_COOKIE}=${next.id}`)
    expect((await repo.getLead(id))?.quizAnswers).toEqual(fixture())
  })
})
