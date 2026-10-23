import { describe, expect, test } from 'bun:test'
import {
  conversationPlanSchema,
  conversationResponses,
  conversationUrl,
} from '@sistemazero/marketing-contracts'
import {
  decideIncoming,
  type IncomingEvent,
  keywordMatches,
  withinWindow,
} from '../../src/domain/engagement/policy'
export const plan = conversationPlanSchema.parse({
  schemaVersion: 1,
  keyword: 'FERIAS',
  opening: 'Resposta automática da Helena e do Júlio. Conheça o projeto.',
  offer: 'Conheça o Desafio.',
  destination: 'https://sistemazero.com.br/kids/desafio/oferta',
  campaign: 'instagram_manychat_desafio_14_2026',
  contentKey: 'mc07_ferias',
  offerReference: 'Oferta conferida na página publicada',
  validUntil: '2030-01-01T00:00:00.000Z',
  responses: conversationResponses,
})
const event: IncomingEvent = {
  key: '1',
  accountExternalId: '1',
  recipient: '2',
  at: '2026-10-15T00:00:00.000Z',
  kind: 'message',
  text: 'FERIAS',
  mediaId: null,
  commentId: null,
  postback: null,
  externalId: '1',
}
describe('conversa comercial: decisões explícitas', () => {
  test('normaliza português sem substrings e exige palavra isolada no direct', () => {
    expect(keywordMatches('Quero FÉRIAS!', 'FERIAS', false)).toBe(true)
    expect(keywordMatches('FÉRIAS!', 'ferias', true)).toBe(true)
    expect(keywordMatches('não quero FERIAS', 'FERIAS', true)).toBe(false)
    expect(keywordMatches('AUTONOMIAMENTE', 'AUTONOMIA', false)).toBe(false)
  })
  test('silêncio, supressão e humano não disparam apresentação', () => {
    const base = { event, plan, state: null, blocked: false, human: false, validPostback: false }
    expect(decideIncoming(base)).toBe('opening')
    expect(decideIncoming({ ...base, blocked: true })).toBe('none')
    expect(decideIncoming({ ...base, human: true })).toBe('none')
    expect(
      decideIncoming({
        ...base,
        event: { ...event, kind: 'postback', postback: 'x:offer' },
        state: 'waiting',
      }),
    ).toBe('none')
    expect(
      decideIncoming({
        ...base,
        event: { ...event, kind: 'postback', postback: 'x:offer' },
        state: 'waiting',
        validPostback: true,
      }),
    ).toBe('offer')
    expect(
      decideIncoming({ ...base, event: { ...event, text: 'Tenho uma dúvida' }, state: 'waiting' }),
    ).toBe('human')
    expect(decideIncoming({ ...base, event: { ...event, text: 'parar' }, human: true })).toBe(
      'stop',
    )
    expect(decideIncoming({ ...base, event: { ...event, text: 'PARAR!' } })).toBe('stop')
  })
  test('destino próprio sem dados individuais e sem scripts', () => {
    const url = new URL(conversationUrl(plan))
    expect(url.searchParams.get('utm_content')).toBe('mc07_ferias')
    expect(
      conversationPlanSchema.safeParse({ ...plan, destination: 'https://evil.example/' }).success,
    ).toBe(false)
    expect(
      conversationPlanSchema.safeParse({ ...plan, destination: `${plan.destination}?name=Maria` })
        .success,
    ).toBe(false)
    expect(conversationPlanSchema.safeParse({ ...plan, opening: 'não identificado' }).success).toBe(
      false,
    )
    expect(
      conversationPlanSchema.safeParse({ ...plan, offer: Array(71).fill('palavra').join(' ') })
        .success,
    ).toBe(false)
  })
  test('janela usa instante do evento, não recepção', () => {
    expect(
      withinWindow(new Date('2026-10-14T00:00:00Z'), new Date('2026-10-15T00:00:00Z'), 24),
    ).toBe(false)
    expect(withinWindow(null, new Date(), 24)).toBe(false)
  })
})
