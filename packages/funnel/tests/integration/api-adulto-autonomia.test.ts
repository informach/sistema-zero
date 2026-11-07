import { describe, expect, test } from 'bun:test'
import { quizDefinition } from '../../src/analytics/quiz-definition'
import { ADULT_ENGINES } from '../../src/funnels/adulto-autonomia/engine'
import type { AdultMode } from '../../src/funnels/adulto-autonomia/types'
import { getFunnelByKey } from '../../src/funnels/registry'
import { LEAD_COOKIE } from '../../src/lib/lead-session'
import type { QuizAnswers } from '../../src/lib/quiz-types'
import { createLead, patchLead } from '../../src/server/leads'
import { quizFeedback } from '../../src/server/quiz-feedback'
import { quizSessionToken } from '../../src/server/quiz-session'
import { createFakeRepo } from '../fakes/fake-db'
import samples from '../fixtures/adulto-autonomia-approved.json'
import { adultJourney } from '../helpers/adulto-autonomia'

for (const mode of ['desafio', 'comunidade'] as AdultMode[])
  describe(`API adulto ${mode} autonomia`, () => {
    const engine = ADULT_ENGINES[mode]
    const funnel = `pro/${mode === 'desafio' ? 'desafio-primeiro-jogo' : 'comunidade-dos-criadores'}`
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
    test('as 16 situações aprovadas salvam dez etapas, condições, atribuição e resultado no servidor', async () => {
      for (const sample of samples.filter((s) => s.mode === mode)) {
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
              quizHeadline: 'autonomia-v2',
              utmSource: 'qa-adulto',
              eventCode: 'QA_ADULTO',
              initialCouponCode: 'QA50',
            },
          }),
          deps,
        )
        expect(created.status).toBe(201)
        const { id } = await created.json(),
          journey = adultJourney(mode, sample.answers)
        expect(savedDefinitions).toContainEqual(definition)
        for (const [revision, { key, value }] of journey.responses.entries()) {
          const response = await patchLead(
            req('PATCH', { key, value, revision, quizDefinitionId: definition.id }, id),
            deps,
          )
          expect([sample.id, key, response.status]).toEqual([sample.id, key, 200])
          const body = await response.json()
          expect(body.answers._quiz_revision).toBe(revision + 1)
          expect(body.complete).toBe(revision === 9)
        }
        const lead = await fake.repo.getLead(id)
        expect(lead?.quizAnswers).toEqual(journey.answers)
        expect(lead?.perfilResultado).toBe(`autonomia-${sample.answers.conquista}`)
        expect(lead?.attribution).toMatchObject({
          quizHeadline: 'autonomia-v2',
          eventCode: 'QA_ADULTO',
          initialCouponCode: 'QA50',
        })
        const saved = fake.events.filter((e) => e.eventName === 'quiz_answer_saved')
        expect(saved).toHaveLength(10)
        saved.forEach((e, i) => {
          expect(e.metadata).toMatchObject({
            question_id: journey.responses[i]!.key,
            question_position: i + 1,
            quiz_definition_id: definition.id,
          })
        })
        for (const event of ['start_quiz', 'complete_quiz'])
          expect(fake.events.filter((e) => e.eventName === event)).toHaveLength(1)
        expect(
          (await quizFeedback(req('POST', { feedback: 'sim', revision: 10 }, id), deps)).status,
        ).toBe(201)
      }
    })
    test('versão antiga e aba desatualizada são preservadas, e retomada cria outra sessão', async () => {
      const old = { _quiz_version: `${mode}-adulto-v1`, _quiz_revision: 8, cena: 'B' },
        { repo, deps, id } = await setup(old)
      expect(
        (await patchLead(req('PATCH', { key: 'cena', value: 'D', revision: 8 }, id), deps)).status,
      ).toBe(409)
      const response = await createLead(req('POST', {}, id), deps)
      expect(response.status).toBe(201)
      expect((await response.json()).id).not.toBe(id)
      expect((await repo.getLead(id))?.quizAnswers).toEqual(old)
      const current = await setup()
      expect(
        (
          await patchLead(
            req(
              'PATCH',
              {
                key: 'autonomia_interesse',
                value: 'ideia',
                revision: 0,
                quizDefinitionId: 'a'.repeat(64),
              },
              current.id,
            ),
            current.deps,
          )
        ).status,
      ).toBe(409)
    })
    test('condições incompatíveis, salto de pergunta e duas abas não corrompem respostas', async () => {
      const { repo, deps, id } = await setup()
      expect(
        (
          await patchLead(
            req('PATCH', { key: 'autonomia_condicao', value: ['apoio'], revision: 0 }, id),
            deps,
          )
        ).status,
      ).toBe(400)
      expect(
        (
          await patchLead(
            req(
              'PATCH',
              {
                key: 'autonomia_interesse',
                value: 'ideia',
                revision: 0,
                sessionToken: quizSessionToken('other'),
              },
              id,
            ),
            deps,
          )
        ).status,
      ).toBe(409)
      const responses = await Promise.all(
        ['ideia', 'prazer'].map((value) =>
          patchLead(req('PATCH', { key: 'autonomia_interesse', value, revision: 0 }, id), deps),
        ),
      )
      expect(responses.map((r) => r.status).sort()).toEqual([200, 409])
      expect((await repo.getLead(id))?.quizAnswers?._quiz_revision).toBe(1)
      const complete = adultJourney(mode).answers,
        second = await setup(complete)
      for (const value of [[], ['nenhuma', 'apoio'], ['apoio', 'apoio'], ['invalida'], 'apoio']) {
        expect(
          (
            await patchLead(
              req('PATCH', { key: 'autonomia_condicao', value, revision: 10 }, second.id),
              second.deps,
            )
          ).status,
        ).toBe(400)
        expect((await second.repo.getLead(second.id))?.quizAnswers).toEqual(complete)
      }
    })
    test('editar conquista invalida perfil até confirmar benefício e mantém condições múltiplas', async () => {
      const { id, deps, repo, events } = await setup(
        adultJourney(mode, { condicao: ['ao_vivo', 'livre'] }).answers,
      )
      const edited = await patchLead(
        req('PATCH', { key: 'autonomia_conquista', value: 'concluir', revision: 10 }, id),
        deps,
      )
      expect(edited.status).toBe(200)
      expect((await edited.json()).complete).toBe(false)
      const lead = await repo.getLead(id)
      expect(lead?.perfilResultado).toBeNull()
      expect(lead?.quizAnswers?.autonomia_beneficio_compreender).toBeUndefined()
      expect(lead?.quizAnswers?.autonomia_condicao).toEqual(['ao_vivo', 'livre'])
      const final = await patchLead(
        req(
          'PATCH',
          { key: 'autonomia_beneficio_concluir', value: 'capacidade', revision: 11 },
          id,
        ),
        deps,
      )
      expect(final.status).toBe(200)
      expect((await final.json()).complete).toBe(true)
      expect((await repo.getLead(id))?.perfilResultado).toBe('autonomia-concluir')
      expect(events.filter((e) => e.eventName === 'complete_quiz')).toHaveLength(1)
    })
  })
