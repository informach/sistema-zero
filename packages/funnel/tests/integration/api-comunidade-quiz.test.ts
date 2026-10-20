import { describe, expect, test } from 'bun:test'
import { QUIZ_VERSION } from '../../src/funnels/comunidade-dos-criadores/quiz/engine'
import { LEAD_COOKIE } from '../../src/lib/lead-session'
import type { QuizAnswers } from '../../src/lib/quiz-types'
import { createLead, patchLead } from '../../src/server/leads'
import { quizFeedback } from '../../src/server/quiz-feedback'
import { quizSessionToken } from '../../src/server/quiz-session'
import { createFakeRepo } from '../fakes/fake-db'

const funnel = 'kids/comunidade-dos-criadores'
const fixture = (): QuizAnswers => ({
  _quiz_version: QUIZ_VERSION,
  _quiz_revision: 9,
  crianca: 'filho_9_11',
  tempo_tela: '2_4h',
  computador: 'sim',
  cena: 'B',
  quando_trava: 'chama',
  tempo_criacao: 'um_pouco',
  preocupacao: 'B',
  cena_desejada: 'B',
  garantia: 'recorrer',
  sintese: 'B',
  ferramenta: 'pode_outra',
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
    'comunidade-orientacao-v3',
    'comunidade-orientacao-v4',
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
  // respostas antigas por vazias e apagaria o lead (com a 1ª pergunta) ou travaria o pai.
  test.each([
    ['crianca', 'filho_9_11'],
    ['quando_trava', 'tenta'],
  ])('a aba antiga não grava em lead v4 (%s): pede para retomar', async (key, value) => {
    const oldAnswers = { ...fixture(), _quiz_version: 'comunidade-orientacao-v4' }
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
            { key: 'quando_trava', value: 'tenta', funnel, revision: 9, sessionToken },
            nextId,
          ),
          deps,
        )
      ).status,
    ).toBe(409)
    expect(
      (
        await quizFeedback(
          request('POST', { feedback: 'sim', revision: 9, sessionToken }, nextId),
          deps,
        )
      ).status,
    ).toBe(409)
    expect((await repo.getLead(nextId))?.quizAnswers).toEqual(fixture())
  })
  test('exige cookie, funil, revisão e pergunta ativa', async () => {
    const { deps, id } = await setup()
    const body = { key: 'crianca', value: 'filha_12_14', funnel, revision: 0 }
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
      (await patchLead(request('PATCH', { ...body, key: 'ferramenta', value: 'roblox' }, id), deps))
        .status,
    ).toBe(400)
    expect((await patchLead(request('PATCH', body, id), deps)).status).toBe(200)
  })
  test('trocar o perfil apaga a pergunta extra antiga, recalcula e não mexe no resto', async () => {
    const { deps, id, repo } = await setup(fixture())
    let revision = 9
    // B 10 → D: a soma muda e a pergunta extra do B (ferramenta) sai.
    for (const key of ['sintese', 'cena', 'preocupacao']) {
      const res = await patchLead(
        request('PATCH', { key, value: 'D', funnel, revision: revision++ }, id),
        deps,
      )
      expect(res.status).toBe(200)
    }
    const lead = await repo.getLead(id)
    expect(lead?.quizAnswers?.ferramenta).toBeUndefined()
    expect(lead?.quizAnswers?.garantia).toBe('recorrer')
    expect(lead?.perfilResultado).toBe('formacao-tecnologica')
  })
  test('perfil novo com pergunta extra fica incompleto até ela ser respondida', async () => {
    const { deps, id, repo } = await setup(fixture())
    let revision = 9
    for (const key of ['sintese', 'cena', 'preocupacao']) {
      const res = await patchLead(
        request('PATCH', { key, value: 'F', funnel, revision: revision++ }, id),
        deps,
      )
      expect(res.status).toBe(200)
    }
    expect((await repo.getLead(id))?.perfilResultado).toBeNull()
    const done = await patchLead(
      request('PATCH', { key: 'escola', value: 'leitura', funnel, revision }, id),
      deps,
    )
    expect((await done.json()).complete).toBe(true)
    expect((await repo.getLead(id))?.perfilResultado).toBe('habilidades-escolares')
  })
  test('a manchete exibida vai na atribuição do lead (teste A/B)', async () => {
    const fake = createFakeRepo()
    const deps = { repo: fake.repo, secureCookie: false }
    const make = async (quizHeadline: unknown) => {
      const res = await createLead(
        request('POST', {
          funnel,
          attribution: { landingPath: '/kids/comunidade-dos-criadores/quiz', quizHeadline },
        }),
        deps,
      )
      return (await fake.repo.getLead((await res.json()).id))?.attribution
    }
    expect((await make('tela'))?.quizHeadline).toBe('tela')
    expect((await make('padrao'))?.quizHeadline).toBe('padrao')
    expect((await make('<script>'))?.quizHeadline).toBeUndefined()
  })
  test('duas gravações concorrentes: somente uma revisão vence', async () => {
    const { deps, id, repo } = await setup(fixture())
    const responses = await Promise.all(
      ['tenta', 'procura'].map((value) =>
        patchLead(request('PATCH', { key: 'quando_trava', value, funnel, revision: 9 }, id), deps),
      ),
    )
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409])
    expect((await repo.getLead(id))?.quizAnswers?._quiz_revision).toBe(10)
  })
  test('feedback só é gravado para resultado completo na revisão atual', async () => {
    const { deps, id, events, repo } = await setup(fixture())
    expect(
      (await quizFeedback(request('POST', { feedback: 'nao_representa', revision: 8 }, id), deps))
        .status,
    ).toBe(409)
    expect(
      (await quizFeedback(request('POST', { feedback: 'nao_representa', revision: 9 }, id), deps))
        .status,
    ).toBe(201)
    expect(events.filter((e) => e.eventName === 'quiz_feedback')).toHaveLength(1)
    expect(events.find((e) => e.eventName === 'quiz_feedback')?.metadata).toMatchObject({
      feedback: 'nao_representa',
      revision: 9,
      perfil: 'criacao-de-jogos',
    })
    expect((await repo.getLead(id))?.perfilResultado).toBe('criacao-de-jogos')
    await repo.updateLead(id, { quizAnswers: {} })
    expect(
      (await quizFeedback(request('POST', { feedback: 'sim', revision: 0 }, id), deps)).status,
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
