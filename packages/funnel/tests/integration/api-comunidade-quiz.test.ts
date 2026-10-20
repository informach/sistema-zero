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
  genero: 'filho',
  idade: '9_12',
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
  await fake.repo.updateLead(id, { quizAnswers: answers, perfilResultado: '9a17-jogos' })
  return { ...fake, id, deps: { repo: fake.repo, secureCookie: false } }
}

describe('API do quiz da Comunidade', () => {
  test.each([
    'comunidade-orientacao-v3',
    'comunidade-orientacao-v4',
    'comunidade-orientacao-v5',
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
    ['genero', 'filha'],
    ['quando_trava', 'tenta'],
  ])('a aba antiga não grava em lead v5 (%s): pede para retomar', async (key, value) => {
    const oldAnswers = { ...fixture(), _quiz_version: 'comunidade-orientacao-v5' }
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
    const body = { key: 'genero', value: 'filha', funnel, revision: 0 }
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
    expect(lead?.perfilResultado).toBe('9a17-programacao')
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
    expect((await repo.getLead(id))?.perfilResultado).toBe('9a17-escola')
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
      perfil: '9a17-jogos',
      ramo: '9a17',
    })
    expect((await repo.getLead(id))?.perfilResultado).toBe('9a17-jogos')
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
  test('a idade abre o ramo: o servidor grava a entrada no ramo uma vez por lead', async () => {
    const { deps, id, events, repo } = await setup()
    const salvar = async (key: string, value: string) => {
      const revision = Number((await repo.getLead(id))?.quizAnswers?._quiz_revision ?? 0)
      return patchLead(request('PATCH', { key, value, funnel, revision }, id), deps)
    }
    expect((await salvar('genero', 'filha')).status).toBe(200)
    expect(events.some((e) => e.eventName.startsWith('entrou_ramo_'))).toBe(false)
    expect((await salvar('idade', 'menos_9')).status).toBe(200)
    expect((await salvar('idade', '9_12')).status).toBe(200)
    expect((await salvar('idade', 'menos_9')).status).toBe(200)
    const ramos = events.filter((e) => e.eventName.startsWith('entrou_ramo_'))
    expect(ramos.map((e) => e.eventName)).toEqual(['entrou_ramo_m9', 'entrou_ramo_9a17'])
    // A posição gravada é a da lista ativa do percurso, e a pergunta do ramo leva o ramo.
    expect((await salvar('m9_leitura', 'nao_le')).status).toBe(200)
    const resposta = events.filter((e) => e.eventName === 'respondeu_comunidade_v6_m9_leitura')
    expect(resposta.at(-1)?.metadata).toMatchObject({ revision: expect.any(Number) })
  })
  test('18 ou mais: a entrada no ramo de saída é gravada e o quiz não completa', async () => {
    const { deps, id, events, repo } = await setup()
    await patchLead(
      request('PATCH', { key: 'genero', value: 'filho', funnel, revision: 0 }, id),
      deps,
    )
    const res = await patchLead(
      request('PATCH', { key: 'idade', value: '18_mais', funnel, revision: 1 }, id),
      deps,
    )
    expect((await res.json()).complete).toBe(false)
    expect(events.map((e) => e.eventName)).toContain('entrou_ramo_adulto')
    expect((await repo.getLead(id))?.perfilResultado).toBeNull()
  })
})
