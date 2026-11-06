import { describe, expect, test } from 'bun:test'
import { quizDefinition } from '../../src/analytics/quiz-definition'
import { DESAFIO_ADULTO } from '../../src/funnels/desafio-adulto'
import { QUIZ_VERSION as ADULTO_VERSION } from '../../src/funnels/desafio-adulto/quiz/engine'
import { LEAD_COOKIE } from '../../src/lib/lead-session'
import { createLead, patchLead } from '../../src/server/leads'
import { quizFeedback } from '../../src/server/quiz-feedback'
import { quizSessionToken } from '../../src/server/quiz-session'
import { createFakeRepo } from '../fakes/fake-db'

import { kidsQuizApiContract } from '../helpers/kids-quiz-api-contract'

kidsQuizApiContract('desafio')
const request = (
  method: string,
  body: Record<string, unknown>,
  id?: string,
  f: string | null = DESAFIO_ADULTO.key,
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
