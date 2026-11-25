import { beforeEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { clearOfferCache } from '../../src/server/catalog'
import { makeResolveOffer } from '../../src/server/offer'
import {
  clearPrimaryOfferCache,
  isPageOffer,
  pageForOffer,
  primaryOfferSlug,
  resolvePageOffer,
} from '../../src/server/page-offer'
import { createFakeGateway } from '../fakes/fake-gateway'

const ROOT = join(import.meta.dir, '..', '..')
const CADE = { productSku: 'cade-todo-mundo', offerContract: undefined }

beforeEach(() => {
  clearOfferCache()
  clearPrimaryOfferCache()
})

describe('oferta da página: a principal do produto no catálogo (sem env, 25/11/2026)', () => {
  test('makeResolveOffer lê a principal do produto do funil do lead', async () => {
    const gw = createFakeGateway()
    gw.setProductPrimary('desafio-primeiro-jogo', 'oferta-kids-julho')
    gw.setProductPrimary(
      'comunidade-dos-criadores-adulto',
      'comunidade-dos-criadores-adulto-mensal',
    )
    const resolve = makeResolveOffer(gw.gateway)
    expect((await resolve('kids/desafio-primeiro-jogo'))?.offerSlug).toBe('oferta-kids-julho')
    // A cobrança da Comunidade adulta leva "(adultos)": é o que separa adulto de Kids em Compras.
    expect((await resolve('pro/comunidade-dos-criadores'))?.productName).toBe(
      'Comunidade dos Criadores (adultos)',
    )
    // Funil nulo é legado e cai no default (a Comunidade adulta).
    expect((await resolve(null))?.offerSlug).toBe('comunidade-dos-criadores-adulto-mensal')
  })

  test('sem oferta principal marcada: null (página indisponível); funil desconhecido lança', async () => {
    const gw = createFakeGateway()
    gw.setProductPrimary('desafio-primeiro-jogo', null)
    const resolve = makeResolveOffer(gw.gateway)
    expect(await resolve('kids/desafio-primeiro-jogo')).toBeNull()
    expect(await resolve('kids/comunidade-dos-criadores')).toBeNull()
    await expect(resolve('pro/inexistente')).rejects.toThrow()
  })

  test('a principal fica em cache curto (uma ida ao catálogo por minuto)', async () => {
    const gw = createFakeGateway()
    gw.setProductPrimary('cade-todo-mundo', 'cade-1-ano')
    expect(await primaryOfferSlug(gw.gateway, 'cade-todo-mundo', { now: 1000 })).toBe('cade-1-ano')
    expect(await primaryOfferSlug(gw.gateway, 'cade-todo-mundo', { now: 2000 })).toBe('cade-1-ano')
    expect(gw.calls.products).toEqual(['cade-todo-mundo'])
  })

  test('?oferta= só vale para outra oferta do MESMO produto dentro do contrato', async () => {
    const gw = createFakeGateway()
    gw.setProductPrimary('cade-todo-mundo', 'cade-1-ano')
    gw.setOfferConfig('cade-1-ano', { productSku: 'cade-todo-mundo' })
    gw.setOfferConfig('cade-6-meses', { productSku: 'cade-todo-mundo' })
    gw.setOfferConfig('outra-oferta', { productSku: 'outro-produto' })
    expect((await resolvePageOffer(gw.gateway, CADE, 'cade-6-meses'))?.slug).toBe('cade-6-meses')
    // Oferta de outro produto, slug lixo ou ausente: a principal.
    expect((await resolvePageOffer(gw.gateway, CADE, 'outra-oferta'))?.slug).toBe('cade-1-ano')
    expect((await resolvePageOffer(gw.gateway, CADE, '<x>'))?.slug).toBe('cade-1-ano')
    expect(await isPageOffer(gw.gateway, CADE, 'outra-oferta')).toBe(false)
    expect(await isPageOffer(gw.gateway, CADE, 'cade-6-meses')).toBe(true)
  })

  test('o contrato da página barra a oferta de presente (15 dias) no Cadê vendido (1 ano)', async () => {
    const gw = createFakeGateway()
    const contrato = {
      pricingMode: 'one_time' as const,
      accessMode: 'fixed' as const,
      accessDurationValue: null,
      accessDurationUnit: 'months' as const,
      guaranteeDays: null,
      anyDuration: true,
      anyGuarantee: true,
    }
    gw.setProductPrimary('cade-todo-mundo', 'cade-1-ano')
    gw.setOfferConfig('cade-1-ano', {
      productSku: 'cade-todo-mundo',
      accessMode: 'fixed',
      accessDurationValue: 12,
      accessDurationUnit: 'months',
    })
    gw.setOfferConfig('cade-15-dias', {
      productSku: 'cade-todo-mundo',
      accessMode: 'fixed',
      accessDurationValue: 15,
      accessDurationUnit: 'days',
    })
    const page = { productSku: 'cade-todo-mundo', offerContract: contrato }
    expect((await resolvePageOffer(gw.gateway, page, 'cade-15-dias'))?.slug).toBe('cade-1-ano')
    expect(await isPageOffer(gw.gateway, page, 'cade-15-dias')).toBe(false)
  })

  test('pageForOffer acha a página pelo produto da oferta', async () => {
    const gw = createFakeGateway()
    gw.setProductPrimary('desafio-primeiro-jogo', 'desafio-primeiro-jogo-30-dias')
    gw.setOfferConfig('desafio-primeiro-jogo-30-dias', {
      productSku: 'desafio-primeiro-jogo',
      accessMode: 'fixed',
      accessDurationValue: 30,
      accessDurationUnit: 'days',
    })
    const page = await pageForOffer(gw.gateway, 'desafio-primeiro-jogo-30-dias', 'kids')
    expect(page).toMatchObject({ primary: true, alt: false })
    expect(page?.funnel.key).toBe('kids/desafio-primeiro-jogo')
    expect(await pageForOffer(gw.gateway, 'desafio-primeiro-jogo-30-dias', 'adult')).toBeNull()
  })

  test('nenhuma env FUNNEL_OFFER_* sobra no código, no exemplo nem no Railway', () => {
    for (const file of [
      join(ROOT, 'src', 'lib', 'env.ts'),
      join(ROOT, '.env.example'),
      join(ROOT, '..', '..', '.railway', 'variables.ts'),
    ])
      expect(readFileSync(file, 'utf8')).not.toMatch(/FUNNEL_OFFER_[A-Z]/)
  })
})
