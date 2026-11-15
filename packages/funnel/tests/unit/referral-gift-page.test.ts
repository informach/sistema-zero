import { describe, expect, test } from 'bun:test'
import { giftVariant, resolveReferralGiftPage } from '../../src/server/referral-gift-page'
import { createFakeGateway } from '../fakes/fake-gateway'

describe('resolveReferralGiftPage', () => {
  test('a projeção pública remove sobrenomes em ambos os públicos, inclusive de respostas antigas', async () => {
    const fake = createFakeGateway()
    for (const audience of ['kids', 'adult'] as const) {
      for (const ownerKind of ['ambassador', 'account'] as const) {
        for (const state of ['active', 'scheduled', 'paused', 'ended'] as const) {
          const original = {
            code: 'nome-1234',
            ownerKind,
            audience,
            displayName: '  Érica  Lima Santos ',
            source: { kind: ownerKind, name: '  Érica  Lima Santos ' },
            state,
            startsAt: null,
            endsAt: null,
            giftAvailable: true,
          }
          fake.setReferralCodeResult(200, original)
          const page = await resolveReferralGiftPage(fake.gateway, original.code)
          expect(page).toMatchObject({
            referrerName: 'Érica',
            gift: { displayName: 'Érica', source: { name: 'Érica' } },
          })
          expect(JSON.stringify(page)).not.toContain('Lima')
          expect(original.source.name).toBe('  Érica  Lima Santos ')
        }
      }
    }
    fake.setReferralCodeResult(200, {
      code: 'laopa-1234',
      ownerKind: 'campaign',
      audience: 'kids',
      displayName: 'Um presente da palestra na clínica Laopa',
      source: { kind: 'campaign', name: 'Um presente da palestra na clínica Laopa' },
      state: 'active',
      startsAt: '2026-11-06T03:00:00Z',
      endsAt: '2026-11-09T03:00:00Z',
      giftAvailable: true,
    })
    expect(await resolveReferralGiftPage(fake.gateway, 'laopa-1234')).toMatchObject({
      referrerName: 'Um presente da palestra na clínica Laopa',
    })
  })
  test('link antigo ativo mostra o presente quando o curso está publicado', async () => {
    const fake = createFakeGateway()
    fake.setReferralCodeResult(200, {
      code: 'vo-x7k2',
      ownerKind: 'ambassador',
      displayName: 'Vó Cida',
      giftAvailable: true,
      source: { kind: 'ambassador', name: 'Vó Cida' },
      state: 'active',
      startsAt: null,
      endsAt: null,
    })
    expect(await resolveReferralGiftPage(fake.gateway, 'vo-x7k2')).toMatchObject({
      kind: 'ready',
      referrerName: 'Vó',
    })
  })

  test('curso em rascunho preserva o link, mas oculta o resgate', async () => {
    const fake = createFakeGateway()
    fake.setReferralCodeResult(200, {
      code: 'vo-x7k2',
      ownerKind: 'ambassador',
      displayName: 'Vó Cida',
      giftAvailable: false,
      source: { kind: 'ambassador', name: 'Vó Cida' },
      state: 'active',
      startsAt: null,
      endsAt: null,
    })
    expect(await resolveReferralGiftPage(fake.gateway, 'vo-x7k2')).toMatchObject({
      kind: 'preparing',
      referrerName: 'Vó',
    })
  })

  // O funil pode subir antes do referrals com campanhas: o convite de sempre não pode cair.
  test('resposta do referrals anterior às campanhas mantém o convite de embaixador', async () => {
    const fake = createFakeGateway()
    fake.setReferralCodeResult(200, {
      code: 'vo-x7k2',
      ownerKind: 'ambassador',
      displayName: 'Vó Cida',
      giftAvailable: true,
    })
    expect(await resolveReferralGiftPage(fake.gateway, 'vo-x7k2')).toMatchObject({
      kind: 'ready',
      referrerName: 'Vó',
      gift: { displayName: 'Vó', source: { kind: 'ambassador', name: 'Vó' }, state: 'active' },
    })
    fake.setReferralCodeResult(200, {
      code: 'evento-10',
      ownerKind: 'campaign',
      displayName: 'Evento',
      giftAvailable: true,
    })
    expect(await resolveReferralGiftPage(fake.gateway, 'evento-10')).toEqual({
      kind: 'unavailable',
    })
  })

  test('código inválido ou ausente é 404; gateway fora é falha temporária', async () => {
    const fake = createFakeGateway()
    expect(await resolveReferralGiftPage(fake.gateway, 'x')).toEqual({ kind: 'not_found' })
    expect(fake.calls.resolveCode).toHaveLength(0)

    fake.setReferralCodeResult(404)
    expect(await resolveReferralGiftPage(fake.gateway, 'vo-x7k2')).toEqual({ kind: 'not_found' })

    fake.setReferralCodeResult(502)
    expect(await resolveReferralGiftPage(fake.gateway, 'vo-x7k2')).toEqual({ kind: 'unavailable' })
  })

  test('resposta incompleta falha fechada e não exibe formulário', async () => {
    const fake = createFakeGateway()
    fake.setReferralCodeResult(200, { displayName: 'Vó Cida' })
    expect(await resolveReferralGiftPage(fake.gateway, 'vo-x7k2')).toEqual({ kind: 'unavailable' })
  })
  test('código divergente, origem incoerente e período inválido não abrem cadastro', async () => {
    const fake = createFakeGateway()
    const valid = {
      code: 'evento-10',
      displayName: 'Evento',
      source: { kind: 'campaign', name: 'Evento' },
      ownerKind: 'campaign',
      state: 'active',
      giftAvailable: true,
      startsAt: '2026-10-02T10:00:00Z',
      endsAt: '2026-10-03T10:00:00Z',
    }
    for (const override of [
      { code: undefined },
      { code: 'outro-10' },
      { ownerKind: 'ambassador' },
      { source: { kind: 'campaign', name: '  ' } },
      { endsAt: valid.startsAt },
      { startsAt: {} },
    ]) {
      fake.setReferralCodeResult(200, { ...valid, ...override })
      expect(await resolveReferralGiftPage(fake.gateway, 'evento-10')).toEqual({
        kind: 'unavailable',
      })
    }
  })
  test('campanha distingue abertura futura, pausa e encerramento de curso em preparação', async () => {
    const fake = createFakeGateway()
    for (const state of ['scheduled', 'paused', 'ended'] as const) {
      fake.setReferralCodeResult(200, {
        code: 'evento-10',
        displayName: 'Evento',
        source: { kind: 'campaign', name: 'Evento' },
        ownerKind: 'campaign',
        state,
        startsAt: '2026-10-02T10:00:00Z',
        endsAt: '2026-10-03T10:00:00Z',
        giftAvailable: false,
      })
      expect(await resolveReferralGiftPage(fake.gateway, 'evento-10')).toMatchObject({
        kind: state,
        referrerName: 'Evento',
      })
    }
  })

  test('o público vem do código: ausente é Kids, adult abre a página adulta, outro falha fechado', async () => {
    const fake = createFakeGateway()
    const base = {
      code: 'vo-a9x4',
      ownerKind: 'ambassador',
      displayName: 'Marta',
      giftAvailable: true,
      source: { kind: 'ambassador', name: 'Marta' },
      state: 'active',
      startsAt: null,
      endsAt: null,
    }
    fake.setReferralCodeResult(200, base)
    expect(await resolveReferralGiftPage(fake.gateway, 'vo-a9x4')).toMatchObject({
      kind: 'ready',
      audience: 'kids',
      gift: { audience: 'kids' },
    })
    fake.setReferralCodeResult(200, { ...base, audience: 'adult' })
    expect(await resolveReferralGiftPage(fake.gateway, 'vo-a9x4')).toMatchObject({
      kind: 'ready',
      audience: 'adult',
      gift: { audience: 'adult', source: { name: 'Marta' } },
    })
    fake.setReferralCodeResult(200, { ...base, audience: 'adult', giftAvailable: false })
    expect(await resolveReferralGiftPage(fake.gateway, 'vo-a9x4')).toMatchObject({
      kind: 'preparing',
      audience: 'adult',
    })
    for (const audience of ['teen', 'ADULT', 1]) {
      fake.setReferralCodeResult(200, { ...base, audience })
      expect(await resolveReferralGiftPage(fake.gateway, 'vo-a9x4')).toEqual({
        kind: 'unavailable',
      })
    }
  })

  test('a rota escolhe o layout pelo público e a prévia aceita ?audience', async () => {
    const page = await Bun.file(
      new URL('../../src/pages/bolsa/[codigo].astro', import.meta.url),
    ).text()
    expect(page).toMatch(
      /page\.audience === 'adult' \?[\s\S]*PresenteAdultoLayout[\s\S]*PresenteAdultoOferta[\s\S]*env\.COMMUNITY_URL/,
    )
    expect(page).toMatch(/PresenteLayout[\s\S]*PresenteOferta[\s\S]*env\.KIDS_COMMUNITY_URL/)
    const previa = await Bun.file(
      new URL('../../src/pages/bolsa/previa.astro', import.meta.url),
    ).text()
    expect(previa).toContain("params.get('audience')")
    expect(previa).toContain("isGiftAudience(audienceParam) ? audienceParam : 'kids'")
    expect(previa).toContain('PresenteAdultoOferta')
  })

  /** A oferta do presente na leitura pública (15/11/2026). */
  const campanha = {
    code: 'pais-1234',
    ownerKind: 'campaign',
    audience: 'kids',
    displayName: 'Encontro de pais na escola',
    source: { kind: 'campaign', name: 'Encontro de pais na escola', context: 'event' },
    state: 'active',
    startsAt: '2026-11-06T03:00:00Z',
    endsAt: '2026-11-30T03:00:00Z',
    giftAvailable: true,
  }
  const oferta = {
    offerId: '44444444-4444-4444-8444-444444444444',
    offerTitle: 'Vilão em aliado',
    courseSlug: 'transformando-o-vilao-em-aliado',
    courseTitle: ' Transformando o vilão em aliado ',
    learner: 'parents',
    accessDays: null,
    includesMural: false,
  }

  test('o gift da oferta chega normalizado à página; sem gift segue a leitura antiga', async () => {
    const fake = createFakeGateway()
    fake.setReferralCodeResult(200, { ...campanha, gift: oferta })
    const page = await resolveReferralGiftPage(fake.gateway, 'pais-1234')
    expect(page).toMatchObject({
      kind: 'ready',
      gift: { gift: { ...oferta, courseTitle: 'Transformando o vilão em aliado' } },
    })
    fake.setReferralCodeResult(200, campanha)
    const antiga = await resolveReferralGiftPage(fake.gateway, 'pais-1234')
    expect(antiga.kind).toBe('ready')
    expect('gift' in antiga && antiga.gift.gift).toBeUndefined()
  })

  test('gift torto falha fechado: a página não promete um curso que não sabe qual é', async () => {
    const fake = createFakeGateway()
    for (const gift of [
      null,
      'cade',
      { ...oferta, offerId: '' },
      { ...oferta, offerTitle: '  ' },
      { ...oferta, learner: 'teen' },
      { ...oferta, accessDays: 0 },
      { ...oferta, accessDays: 7.5 },
      { ...oferta, accessDays: '7' },
      { ...oferta, includesMural: 'sim' },
      { ...oferta, courseSlug: 3 },
    ]) {
      fake.setReferralCodeResult(200, { ...campanha, gift })
      expect([gift, await resolveReferralGiftPage(fake.gateway, 'pais-1234')]).toEqual([
        gift,
        { kind: 'unavailable' },
      ])
    }
  })

  test('a variante vem do curso: Cadê é a página editorial, pais e outro curso a enxuta', () => {
    const base = { ...oferta, learner: 'child' as const, accessDays: 7, includesMural: true }
    expect(giftVariant(undefined)).toBe('cade')
    expect(giftVariant({ ...base, courseSlug: 'cade-todo-mundo' })).toBe('cade')
    expect(giftVariant({ ...base, courseSlug: 'cade-todo-mundo-adulto', learner: null })).toBe(
      'cade',
    )
    expect(giftVariant({ ...base, learner: 'parents' })).toBe('pais')
    expect(giftVariant({ ...base, courseSlug: 'a-chave-do-farol' })).toBe('curso')
    expect(giftVariant({ ...base, courseSlug: null, learner: null })).toBe('curso')
  })

  test('a rota usa o corpo enxuto para curso de pais e outro curso, nos dois públicos', async () => {
    const page = await Bun.file(
      new URL('../../src/pages/bolsa/[codigo].astro', import.meta.url),
    ).text()
    expect(page).toContain('giftVariant(oferta)')
    expect(page.match(/<PresenteCursoOferta /g)).toHaveLength(2)
    expect(page).toContain('presenteKidsDaOferta(oferta)')
    expect(page).toContain('presenteAdultoDaOferta(oferta)')
  })
})
