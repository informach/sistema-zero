import { describe, expect, test } from 'bun:test'
import { type Env, offerEnvKey } from '../../src/lib/env'
import { makeResolveOffer, resolveOfferSlug } from '../../src/server/offer'

// A oferta vem 100% das envs (mapa `funilKey → offerSlug` montado em lib/env.ts).
const env = {
  offerByFunnel: {
    'pro/comunidade-dos-criadores': 'oferta-comunidade-adulta',
    'kids/desafio-primeiro-jogo': 'oferta-kids-julho',
    'kids/comunidade-dos-criadores': 'oferta-comunidade-mensal',
  },
} as unknown as Env

describe('resolução de oferta (100% por env, com compat de lead legado)', () => {
  test('resolveOfferSlug devolve a oferta da env do funil', () => {
    expect(resolveOfferSlug(env, 'pro/comunidade-dos-criadores')).toBe('oferta-comunidade-adulta')
    expect(resolveOfferSlug(env, 'kids/desafio-primeiro-jogo')).toBe('oferta-kids-julho')
    expect(resolveOfferSlug(env, 'kids/comunidade-dos-criadores')).toBe('oferta-comunidade-mensal')
  })

  test('makeResolveOffer usa a env do funil do lead', () => {
    const resolve = makeResolveOffer(env)
    expect(resolve('kids/desafio-primeiro-jogo').offerSlug).toBe('oferta-kids-julho')
    expect(resolve('pro/comunidade-dos-criadores').offerSlug).toBe('oferta-comunidade-adulta')
    expect(resolve('kids/comunidade-dos-criadores').offerSlug).toBe('oferta-comunidade-mensal')
  })

  test('a cobrança da Comunidade adulta leva "(adultos)": é o que separa adulto de Kids em Compras', () => {
    const resolve = makeResolveOffer({
      offerByFunnel: {
        'pro/comunidade-dos-criadores': 'comunidade-dos-criadores-adulto-mensal',
        'kids/comunidade-dos-criadores': 'oferta-comunidade-mensal',
      },
    } as unknown as Env)
    expect(resolve('pro/comunidade-dos-criadores').productName).toBe(
      'Comunidade dos Criadores (adultos)',
    )
    expect(resolve('kids/comunidade-dos-criadores').productName).toBe('Comunidade dos Criadores')
  })

  test('funil nulo é legado e cai no default; funil desconhecido → lança', () => {
    const resolve = makeResolveOffer(env)
    expect(resolve(null).offerSlug).toBe('oferta-comunidade-adulta')
    expect(() => resolve('pro/inexistente')).toThrow()
  })

  test('funil conhecido mas SEM env de oferta → lança', () => {
    const semKids = { offerByFunnel: { 'pro/comunidade-dos-criadores': 'x' } } as unknown as Env
    expect(() => resolveOfferSlug(semKids, 'kids/desafio-primeiro-jogo')).toThrow()
    expect(() => resolveOfferSlug(semKids, 'kids/comunidade-dos-criadores')).toThrow()
  })

  test('offerEnvKey mapeia a chave do funil pra env FUNNEL_OFFER_<KEY>', () => {
    expect(offerEnvKey('pro/comunidade-dos-criadores')).toBe(
      'FUNNEL_OFFER_PRO_COMUNIDADE_DOS_CRIADORES',
    )
    expect(offerEnvKey('kids/comunidade-dos-criadores')).toBe(
      'FUNNEL_OFFER_KIDS_COMUNIDADE_DOS_CRIADORES',
    )
  })
})
