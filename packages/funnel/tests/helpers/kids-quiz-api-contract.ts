import { describe, expect, test } from 'bun:test'
import { quizDefinition } from '../../src/analytics/quiz-definition'
import { KIDS_ENGINES } from '../../src/funnels/kids-vida/engine'
import type { KidsMode } from '../../src/funnels/kids-vida/types'
import { getFunnelByKey } from '../../src/funnels/registry'
import { LEAD_COOKIE } from '../../src/lib/lead-session'
import type { QuizAnswers } from '../../src/lib/quiz-types'
import { createLead, patchLead } from '../../src/server/leads'
import { quizFeedback } from '../../src/server/quiz-feedback'
import { quizSessionToken } from '../../src/server/quiz-session'
import { createFakeRepo } from '../fakes/fake-db'
import { kidsJourney } from './kids-vida'

export function kidsQuizApiContract(mode: KidsMode) {
  const engine = KIDS_ENGINES[mode]
  const funnel = `kids/${mode === 'desafio' ? 'desafio-primeiro-jogo' : 'comunidade-dos-criadores'}`
  const definition = quizDefinition(getFunnelByKey(funnel)!)!
  const req = (method: string, body: Record<string, unknown>, id?: string) =>
    new Request('http://localhost/api/leads', {
      method,
      headers: {
        'content-type': 'application/json',
        ...(id ? { cookie: `${LEAD_COOKIE}=${id}` } : {}),
      },
      body: JSON.stringify({
        ...(method === 'PATCH' || !('feedback' in body) ? { funnel } : {}),
        ...(id ? { sessionToken: quizSessionToken(id) } : {}),
        ...body,
      }),
    })
  async function setup(answers: QuizAnswers = {}) {
    const fake = createFakeRepo(),
      deps = { repo: fake.repo, secureCookie: false }
    const { id } = await fake.repo.createLead(funnel, null, definition.id)
    await fake.repo.updateLead(id, {
      quizAnswers: answers,
      perfilResultado: engine.computePerfil(answers),
    })
    return { ...fake, deps, id }
  }
  describe(`API ${engine.version}`, () => {
    test.each([
      'm9',
      '9a12',
      '13a17',
    ])('%s salva dez respostas mais entrada, variante correta e marcos únicos', async (idade) => {
      const fake = createFakeRepo(),
        savedDefinitions: unknown[] = [],
        deps = {
          repo: fake.repo,
          secureCookie: false,
          saveQuizDefinition: async (d: unknown) => {
            savedDefinitions.push(d)
          },
        }
      const created = await createLead(
        req('POST', {
          quizDefinitionId: definition.id,
          attribution: {
            landingPath: `/${funnel}/quiz`,
            quizHeadline: 'habilidades',
            utmSource: 'palestra',
            eventCode: 'LAOPA',
            initialCouponCode: 'LAOPA13112650',
          },
        }),
        deps,
      )
      expect(created.status).toBe(201)
      const { id } = await created.json(),
        journey = kidsJourney(mode, {
          idade,
          genero: 'filha',
          cena: 'erro',
          prioridade: 'expressar',
        })
      expect(savedDefinitions).toContainEqual(definition)
      for (const [index, { key, value }] of journey.responses.entries()) {
        const response = await patchLead(
          req('PATCH', { key, value, revision: index, quizDefinitionId: definition.id }, id),
          deps,
        )
        expect([key, response.status]).toEqual([key, 200])
        const body = await response.json()
        expect(body.answers._quiz_revision).toBe(index + 1)
        expect(body.complete).toBe(index === 10)
      }
      const lead = await fake.repo.getLead(id)
      expect(lead?.quizAnswers).toEqual(journey.answers)
      expect(lead?.perfilResultado).toBe(`vida-${idade}-expressar`)
      expect(lead?.attribution?.quizHeadline).toBe('habilidades')
      expect(lead?.attribution?.eventCode).toBe('LAOPA')
      expect(lead?.attribution?.initialCouponCode).toBe('LAOPA13112650')
      const saved = fake.events.filter((e) => e.eventName === 'quiz_answer_saved')
      expect(saved).toHaveLength(11)
      saved.forEach((event, i) => {
        expect(event.metadata).toMatchObject({
          question_id: journey.responses[i]!.key,
          question_position: i + 1,
          quiz_definition_id: definition.id,
        })
      })
      expect(fake.events.filter((e) => e.eventName === 'complete_quiz')).toHaveLength(1)
      expect(fake.events.filter((e) => e.eventName === 'start_quiz')).toHaveLength(1)
      expect(fake.events.filter((e) => e.eventName === `entrou_ramo_${idade}`)).toHaveLength(1)
    })
    test.each([
      'desafio-farol-v5',
      'comunidade-orientacao-v6',
    ])('versão antiga %s permanece intacta e cria outra sessão', async (oldVersion) => {
      const old = { _quiz_version: oldVersion, _quiz_revision: 9, cena: 'B', genero: 'filha' }
      const { deps, id, repo } = await setup(old)
      const patch = await patchLead(
        req('PATCH', { key: 'genero', value: 'filho', revision: 9 }, id),
        deps,
      )
      expect(patch.status).toBe(409)
      const retiredQuestion = await patchLead(
        req('PATCH', { key: 'm9_cena', value: 'B', revision: 9 }, id),
        deps,
      )
      expect(retiredQuestion.status).toBe(409)
      const response = await createLead(req('POST', {}, id), deps)
      expect(response.status).toBe(201)
      expect((await response.json()).id).not.toBe(id)
      expect((await repo.getLead(id))?.quizAnswers).toEqual(old)
    })
    test('retoma a versão vigente e reinicia para outra criança sem sobrescrever a primeira', async () => {
      const fixture = kidsJourney(mode).answers,
        { deps, id, repo } = await setup(fixture)
      const resumed = await createLead(req('POST', {}, id), deps)
      expect(resumed.status).toBe(200)
      expect((await resumed.json()).id).toBe(id)
      const restarted = await createLead(req('POST', { restartQuiz: true }, id), deps)
      expect(restarted.status).toBe(201)
      expect((await restarted.json()).id).not.toBe(id)
      expect((await repo.getLead(id))?.quizAnswers).toEqual(fixture)
    })
    test('recusa token de outra criança, revisão antiga, falta de cookie, funil trocado e salto de pergunta', async () => {
      const { deps, id, repo } = await setup()
      const request = { key: 'genero', value: 'filho', revision: 0 }
      expect((await patchLead(req('PATCH', request), deps)).status).toBe(401)
      expect(
        (
          await patchLead(
            req('PATCH', { ...request, sessionToken: quizSessionToken('another') }, id),
            deps,
          )
        ).status,
      ).toBe(409)
      expect((await patchLead(req('PATCH', { ...request, revision: 2 }, id), deps)).status).toBe(
        409,
      )
      expect(
        (
          await patchLead(
            req('PATCH', { ...request, funnel: 'pro/desafio-primeiro-jogo' }, id),
            deps,
          )
        ).status,
      ).toBe(409)
      expect(
        (await patchLead(req('PATCH', { key: 'idade', value: '9_12', revision: 0 }, id), deps))
          .status,
      ).toBe(400)
      expect((await repo.getLead(id))?.quizAnswers).toEqual({})
    })
    test('salvamento concorrente aceita uma revisão e não perde resposta', async () => {
      const { deps, id, repo } = await setup()
      const responses = await Promise.all(
        ['filho', 'filha'].map((value) =>
          patchLead(req('PATCH', { key: 'genero', value, revision: 0 }, id), deps),
        ),
      )
      expect(responses.map((r) => r.status).sort()).toEqual([200, 409])
      expect((await repo.getLead(id))?.quizAnswers?._quiz_revision).toBe(1)
    })
    test('trocar prioridade limpa benefício, invalida resultado e permite completar novamente', async () => {
      const complete = kidsJourney(mode).answers,
        { deps, id, repo, events } = await setup(complete)
      const changed = await patchLead(
        req('PATCH', { key: 'vida_9a12_prioridade', value: 'expressar', revision: 11 }, id),
        deps,
      )
      expect(changed.status).toBe(200)
      expect((await changed.json()).complete).toBe(false)
      expect((await repo.getLead(id))?.perfilResultado).toBeNull()
      expect((await repo.getLead(id))?.quizAnswers?.vida_9a12_beneficio_planejar).toBeUndefined()
      const final = await patchLead(
        req('PATCH', { key: 'vida_9a12_beneficio_expressar', value: 'filho', revision: 12 }, id),
        deps,
      )
      expect(final.status).toBe(200)
      expect((await final.json()).complete).toBe(true)
      expect((await repo.getLead(id))?.perfilResultado).toBe('vida-9a12-expressar')
      expect(events.filter((e) => e.eventName === 'complete_quiz')).toHaveLength(1)
    })
    test('idade limpa contexto, marca ramos uma vez e 18+ sai sem resultado', async () => {
      const { deps, id, repo, events } = await setup(kidsJourney(mode).answers)
      for (const value of ['menos_9', '13_17', 'menos_9', '18_mais']) {
        const revision = (await repo.getLead(id))!.quizAnswers!._quiz_revision
        const r = await patchLead(req('PATCH', { key: 'idade', value, revision }, id), deps)
        expect(r.status).toBe(200)
        expect((await r.json()).complete).toBe(false)
      }
      expect(events.filter((e) => e.eventName === 'entrou_ramo_m9')).toHaveLength(1)
      expect(events.map((e) => e.eventName)).toContain('entrou_ramo_13a17')
      expect(events.map((e) => e.eventName)).toContain('entrou_ramo_adulto')
      expect((await repo.getLead(id))?.perfilResultado).toBeNull()
      expect(
        Object.keys((await repo.getLead(id))!.quizAnswers!).filter((k) => k.startsWith('vida_')),
      ).toEqual([])
    })
    test('feedback corresponde à revisão e ao novo perfil, sem aceitar resultado incompleto', async () => {
      const { deps, id, events, repo } = await setup(kidsJourney(mode).answers)
      expect(
        (await quizFeedback(req('POST', { feedback: 'sim', revision: 10 }, id), deps)).status,
      ).toBe(409)
      expect(
        (await quizFeedback(req('POST', { feedback: 'sim', revision: 11 }, id), deps)).status,
      ).toBe(201)
      expect(events.find((e) => e.eventName === 'quiz_feedback')?.metadata).toMatchObject({
        quiz_version: engine.version,
        perfil: 'vida-9a12-planejar',
        ramo: '9a12',
      })
      await repo.updateLead(id, { quizAnswers: {} })
      expect(
        (await quizFeedback(req('POST', { feedback: 'sim', revision: 0 }, id), deps)).status,
      ).toBe(409)
    })
    test('definição de aba desatualizada não grava nem abre sessão na revisão nova', async () => {
      const { deps, id, repo } = await setup()
      expect(
        (
          await patchLead(
            req(
              'PATCH',
              { key: 'genero', value: 'filho', revision: 0, quizDefinitionId: '0'.repeat(64) },
              id,
            ),
            deps,
          )
        ).status,
      ).toBe(409)
      expect(
        (await createLead(req('POST', { quizDefinitionId: '0'.repeat(64) }, id), deps)).status,
      ).toBe(409)
      expect((await repo.getLead(id))?.quizAnswers).toEqual({})
    })
  })
}
