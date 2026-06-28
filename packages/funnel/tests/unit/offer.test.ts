import { describe, expect, test } from 'bun:test'
import type { Env } from '../../src/lib/env'
import { makeResolveOffer, resolveOfferSlug } from '../../src/server/offer'

// A oferta vem 100% das envs (mapa `funilKey → offerSlug` montado em lib/env.ts).
const env = {
  offerByFunnel: {
    'pro/no-comando-da-ia': 'oferta-nci',
    'kids/desafio-primeiro-jogo': 'oferta-kids-julho',
  },
} as unknown as Env

describe('resolução de oferta (100% por env, sem fallback)', () => {
  test('resolveOfferSlug devolve a oferta da env do funil', () => {
    expect(resolveOfferSlug(env, 'pro/no-comando-da-ia')).toBe('oferta-nci')
    expect(resolveOfferSlug(env, 'kids/desafio-primeiro-jogo')).toBe('oferta-kids-julho')
  })

  test('makeResolveOffer usa a env do funil do lead', () => {
    const resolve = makeResolveOffer(env)
    expect(resolve('kids/desafio-primeiro-jogo').offerSlug).toBe('oferta-kids-julho')
    expect(resolve('pro/no-comando-da-ia').offerSlug).toBe('oferta-nci')
  })

  test('SEM fallback: funil nulo/desconhecido → lança', () => {
    const resolve = makeResolveOffer(env)
    expect(() => resolve(null)).toThrow()
    expect(() => resolve('pro/inexistente')).toThrow()
  })

  test('funil conhecido mas SEM env de oferta → lança', () => {
    const semKids = { offerByFunnel: { 'pro/no-comando-da-ia': 'x' } } as unknown as Env
    expect(() => resolveOfferSlug(semKids, 'kids/desafio-primeiro-jogo')).toThrow()
  })
})
