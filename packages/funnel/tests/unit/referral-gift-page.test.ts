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
    })
    expect(await resolveReferralGiftPage(fake.gateway, 'vo-x7k2')).toEqual({
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
    })
    expect(await resolveReferralGiftPage(fake.gateway, 'vo-x7k2')).toEqual({
      kind: 'preparing',
      referrerName: 'Vó Cida',
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
})
