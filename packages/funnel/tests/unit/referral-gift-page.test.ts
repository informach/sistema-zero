import { describe, expect, test } from 'bun:test'
import { resolveReferralGiftPage } from '../../src/server/referral-gift-page'
import { createFakeGateway } from '../fakes/fake-gateway'

describe('resolveReferralGiftPage', () => {
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
      referrerName: 'Vó Cida',
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
      referrerName: 'Vó Cida',
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
      referrerName: 'Vó Cida',
      gift: { source: { kind: 'ambassador', name: 'Vó Cida' }, state: 'active' },
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
})
