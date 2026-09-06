import { beforeEach, describe, expect, test } from 'bun:test'
import {
  type RecordConversionConfig,
  RecordConversionService,
} from '../../src/application/conversions/record-conversion.service'
import { SweepConversionsService } from '../../src/application/conversions/sweep-conversions.service'
import type {
  CatalogClient,
  OfferSnapshot,
  PaymentSnapshot,
  PaymentsClient,
} from '../../src/domain/ports/clients.port'
import type { SendEmailInput } from '../../src/domain/ports/gateway.port'
import { FakeReferralsGateway, InMemoryReferralRepository, silentLogger } from '../fakes/in-memory'

const CONFIG: RecordConversionConfig = {
  conversionOfferSlugs: ['comunidade-dos-criadores-mensal', 'comunidade-dos-criadores-anual'],
  bonusAmountCents: 3000,
  matureHours: 180,
}

class FakePaymentsClient implements PaymentsClient {
  byId = new Map<string, PaymentSnapshot>()
  fail = false
  async getPayment(paymentId: string): Promise<PaymentSnapshot | null> {
    if (this.fail) throw new Error('ECONNREFUSED')
    return this.byId.get(paymentId) ?? null
  }
}

class FakeCatalogClient implements CatalogClient {
  byId = new Map<string, OfferSnapshot>()
  fail = false
  async getOfferById(offerId: string): Promise<OfferSnapshot | null> {
    if (this.fail) throw new Error('ECONNREFUSED')
    return this.byId.get(offerId) ?? null
  }
}

const PAID_AT = new Date('2026-09-01T12:00:00.000Z')

function paymentSnapshot(overrides: Partial<PaymentSnapshot> = {}): PaymentSnapshot {
  return {
    id: 'pay-1',
    status: 'PAID',
    amountInCents: 9700n,
    paidAt: PAID_AT,
    customer: { name: 'Paula Prado', email: 'Paula@Example.com' },
    metadata: { offerId: 'offer-uuid-1' },
    subscriptionId: 'sub-1',
    ...overrides,
  }
}

describe('RecordConversionService', () => {
  let repo: InMemoryReferralRepository
  let payments: FakePaymentsClient
  let catalog: FakeCatalogClient
  let service: RecordConversionService

  /** Semeia embaixador + código + resgate COMPLETED de paula@example.com. */
  async function seedRedeemedScholarship() {
    const created = await repo.createAmbassadorWithCode({
      name: 'Vó Cida',
      email: 'cida@example.com',
      pageToken: 't'.repeat(43),
      code: 'cida-x7k2',
    })
    if (created.kind !== 'created') throw new Error('seed falhou')
    const { redemption } = await repo.insertRedemption({
      codeId: created.code.id,
      email: 'paula@example.com',
      name: 'Paula Prado',
      phone: null,
    })
    await repo.markRedemptionGranted(redemption.id, PAID_AT)
    return { code: created.code, ambassador: created.ambassador, redemption }
  }

  beforeEach(async () => {
    repo = new InMemoryReferralRepository()
    payments = new FakePaymentsClient()
    catalog = new FakeCatalogClient()
    catalog.byId.set('offer-uuid-1', {
      id: 'offer-uuid-1',
      slug: 'comunidade-dos-criadores-mensal',
      name: 'Comunidade (mensal)',
    })
    payments.byId.set('pay-1', paymentSnapshot())
    service = new RecordConversionService(repo, payments, catalog, CONFIG, silentLogger)
  })

  const paidDelivery = (paymentId = 'pay-1') => ({
    deliveryId: `d-${paymentId}`,
    eventName: 'payment.paid',
    payload: { paymentId },
  })

  test('bolsista completed + oferta da Comunidade → conversão pending com bônus fixo', async () => {
    await seedRedeemedScholarship()
    const result = await service.execute(paidDelivery())
    expect(result.kind).toBe('ok')
    expect(repo.conversions).toHaveLength(1)
    const c = repo.conversions[0]!
    expect(c.status).toBe('pending')
    expect(c.bonusCents).toBe(3000)
    expect(c.amountCents).toBe(9700n)
    expect(c.offerSlug).toBe('comunidade-dos-criadores-mensal')
    expect(c.maturesAt.getTime()).toBe(PAID_AT.getTime() + 180 * 3600_000)
    expect(c.ambassadorId).not.toBeNull()
  })

  test('anual à vista (SEM subscriptionId) também converte', async () => {
    await seedRedeemedScholarship()
    catalog.byId.set('offer-uuid-2', {
      id: 'offer-uuid-2',
      slug: 'comunidade-dos-criadores-anual',
      name: 'Comunidade (anual)',
    })
    payments.byId.set('pay-2', {
      ...paymentSnapshot({ id: 'pay-2', subscriptionId: null }),
      metadata: { offerId: 'offer-uuid-2' },
      amountInCents: 79700n,
    })
    expect((await service.execute(paidDelivery('pay-2'))).kind).toBe('ok')
    expect(repo.conversions).toHaveLength(1)
    expect(repo.conversions[0]!.offerSlug).toBe('comunidade-dos-criadores-anual')
    expect(repo.conversions[0]!.bonusCents).toBe(3000) // fixo, qualquer plano
  })

  test('oferta fora da allowlist (ex.: Desafio avulso) → skip sem conversão', async () => {
    await seedRedeemedScholarship()
    catalog.byId.set('offer-uuid-1', {
      id: 'offer-uuid-1',
      slug: 'desafio-primeiro-jogo',
      name: 'Desafio',
    })
    expect((await service.execute(paidDelivery())).kind).toBe('ok')
    expect(repo.conversions).toHaveLength(0)
  })

  test('comprador sem bolsa (veio direto da oferta) → skip', async () => {
    expect((await service.execute(paidDelivery())).kind).toBe('ok')
    expect(repo.conversions).toHaveLength(0)
  })

  test('resgate ainda pending (não completed) → skip', async () => {
    const seeded = await seedRedeemedScholarship()
    const r = repo.redemptions.find((x) => x.id === seeded.redemption.id)!
    r.status = 'pending'
    expect((await service.execute(paidDelivery())).kind).toBe('ok')
    expect(repo.conversions).toHaveLength(0)
  })

  test('autoindicação (dono do código assina com o mesmo e-mail) → self_blocked, bônus 0', async () => {
    const created = await repo.createAmbassadorWithCode({
      name: 'Paula Prado',
      email: 'paula@example.com',
      pageToken: 't'.repeat(43),
      code: 'paula-x7k2',
    })
    if (created.kind !== 'created') throw new Error('seed falhou')
    const { redemption } = await repo.insertRedemption({
      codeId: created.code.id,
      email: 'paula@example.com',
      name: 'Paula Prado',
      phone: null,
    })
    await repo.markRedemptionGranted(redemption.id, PAID_AT)

    expect((await service.execute(paidDelivery())).kind).toBe('ok')
    expect(repo.conversions).toHaveLength(1)
    expect(repo.conversions[0]!.status).toBe('self_blocked')
    expect(repo.conversions[0]!.bonusCents).toBe(0)
  })

  test('ciclo de renovação (payment novo, mesma redemption) NÃO duplica', async () => {
    await seedRedeemedScholarship()
    await service.execute(paidDelivery())
    payments.byId.set('pay-ciclo', paymentSnapshot({ id: 'pay-ciclo' }))
    expect((await service.execute(paidDelivery('pay-ciclo'))).kind).toBe('ok')
    expect(repo.conversions).toHaveLength(1) // "só a primeira" por construção
  })

  test('payments/catalog indisponíveis ou oferta 404 → retryable (502 re-entrega)', async () => {
    await seedRedeemedScholarship()
    payments.fail = true
    expect((await service.execute(paidDelivery())).kind).toBe('retryable')
    payments.fail = false
    catalog.fail = true
    expect((await service.execute(paidDelivery())).kind).toBe('retryable')
    catalog.fail = false
    catalog.byId.delete('offer-uuid-1')
    expect((await service.execute(paidDelivery())).kind).toBe('retryable')
    expect(repo.conversions).toHaveLength(0)
  })

  test('estorno na garantia cancela a pending; depois de elegível NÃO reverte', async () => {
    await seedRedeemedScholarship()
    await service.execute(paidDelivery())
    const refund = {
      deliveryId: 'd-r',
      eventName: 'payment.refunded',
      payload: { paymentId: 'pay-1' },
    }
    expect((await service.execute(refund)).kind).toBe('ok')
    expect(repo.conversions[0]!.status).toBe('canceled')

    // Reconstrói elegível e estorna de novo: fica como está (aflora no log).
    repo.conversions[0]!.status = 'eligible'
    expect((await service.execute(refund)).kind).toBe('ok')
    expect(repo.conversions[0]!.status).toBe('eligible')
  })

  test('alerta de "estorno após bônus" SÓ para eligible/paid — self_blocked e re-entrega são mudos', async () => {
    const errors: string[] = []
    const capturing = {
      ...silentLogger,
      error: (msg: string) => {
        errors.push(msg)
      },
    }
    const svc = new RecordConversionService(repo, payments, catalog, CONFIG, capturing)
    await seedRedeemedScholarship()
    await svc.execute(paidDelivery())
    repo.conversions[0]!.status = 'self_blocked'
    const refund = {
      deliveryId: 'd-r',
      eventName: 'payment.refunded',
      payload: { paymentId: 'pay-1' },
    }
    // Autoindicação estornada: bônus nunca existiu — alerta seria falso.
    expect((await svc.execute(refund)).kind).toBe('ok')
    expect(errors).toHaveLength(0)

    // Re-entrega de um estorno já aplicado (canceled): também muda.
    repo.conversions[0]!.status = 'canceled'
    expect((await svc.execute(refund)).kind).toBe('ok')
    expect(errors).toHaveLength(0)

    // Bônus já prometido: aí sim aflora ao humano.
    repo.conversions[0]!.status = 'eligible'
    expect((await svc.execute(refund)).kind).toBe('ok')
    expect(errors).toEqual(['referrals.refund_after_bonus_eligible'])
  })

  test('estornou na garantia e assinou DE NOVO meses depois → converte de novo (canceled não ocupa a vaga)', async () => {
    await seedRedeemedScholarship()
    await service.execute(paidDelivery())
    const refund = {
      deliveryId: 'd-r',
      eventName: 'payment.refunded',
      payload: { paymentId: 'pay-1' },
    }
    await service.execute(refund)
    expect(repo.conversions[0]!.status).toBe('canceled')

    payments.byId.set('pay-volta', paymentSnapshot({ id: 'pay-volta' }))
    expect((await service.execute(paidDelivery('pay-volta'))).kind).toBe('ok')
    expect(repo.conversions).toHaveLength(2)
    expect(repo.conversions[1]!.status).toBe('pending')
    expect(repo.conversions[1]!.paymentId).toBe('pay-volta')
  })

  test('não-bolsista com catalog FORA → skip barato (sem retry storm)', async () => {
    // O filtro local (redemption por e-mail) roda ANTES do catalog: entrega de
    // quem nunca resgatou bolsa consome sem depender do catálogo de pé.
    catalog.fail = true
    expect((await service.execute(paidDelivery())).kind).toBe('ok')
    expect(repo.conversions).toHaveLength(0)
  })
})

describe('SweepConversionsService', () => {
  test('matura as vencidas e avisa o embaixador com o valor formatado', async () => {
    const repo = new InMemoryReferralRepository()
    const gateway = new FakeReferralsGateway()
    const sweep = new SweepConversionsService(
      repo,
      gateway,
      { funnelPublicUrl: 'https://sistemazero.com.br', batchSize: 50 },
      silentLogger,
    )
    const created = await repo.createAmbassadorWithCode({
      name: 'Vó Cida',
      email: 'cida@example.com',
      pageToken: 'T'.repeat(43),
      code: 'cida-x7k2',
    })
    if (created.kind !== 'created') throw new Error('seed falhou')
    const { redemption } = await repo.insertRedemption({
      codeId: created.code.id,
      email: 'paula@example.com',
      name: 'Paula',
      phone: null,
    })
    await repo.insertConversion({
      redemptionId: redemption.id,
      codeId: created.code.id,
      ambassadorId: created.ambassador.id,
      paymentId: 'pay-1',
      subscriptionId: null,
      offerSlug: 'comunidade-dos-criadores-mensal',
      amountCents: 9700n,
      bonusCents: 3000,
      status: 'pending',
      paidAt: new Date(Date.now() - 200 * 3600_000),
      maturesAt: new Date(Date.now() - 20 * 3600_000), // já madura
    })

    expect(await sweep.mature()).toBe(1)
    expect(repo.conversions[0]!.status).toBe('eligible')

    expect(await sweep.notify()).toBe(1)
    expect(repo.conversions[0]!.notifiedAt).not.toBeNull()
    const send = gateway.callsOf('sendEmail')[0]!
    const email = send.input as SendEmailInput
    expect(email.templateKey).toBe('referrals-bonus-eligible')
    expect(email.variables.valor).toBe('R$ 30,00')
    expect(email.variables.link).toBe(`https://sistemazero.com.br/embaixador/${'T'.repeat(43)}`)
    expect(send.idempotencyKey).toBe(`bonus-eligible:${repo.conversions[0]!.id}`)

    // 2ª volta: nada a maturar nem avisar.
    expect(await sweep.mature()).toBe(0)
    expect(await sweep.notify()).toBe(0)
  })

  test('falha no envio NÃO marca notificado (retoma no próximo ciclo)', async () => {
    const repo = new InMemoryReferralRepository()
    const gateway = new FakeReferralsGateway()
    gateway.sendEmailResult = { status: 502, body: {} }
    const sweep = new SweepConversionsService(
      repo,
      gateway,
      { funnelPublicUrl: 'https://x.com', batchSize: 50 },
      silentLogger,
    )
    const created = await repo.createAmbassadorWithCode({
      name: 'Vó Cida',
      email: 'cida@example.com',
      pageToken: 't'.repeat(43),
      code: 'cida-x7k2',
    })
    if (created.kind !== 'created') throw new Error('seed falhou')
    const { redemption } = await repo.insertRedemption({
      codeId: created.code.id,
      email: 'p@x.com',
      name: 'P',
      phone: null,
    })
    await repo.insertConversion({
      redemptionId: redemption.id,
      codeId: created.code.id,
      ambassadorId: created.ambassador.id,
      paymentId: 'pay-1',
      subscriptionId: null,
      offerSlug: 'comunidade-dos-criadores-mensal',
      amountCents: 9700n,
      bonusCents: 3000,
      status: 'pending',
      paidAt: new Date(),
      maturesAt: new Date(Date.now() - 1000),
    })
    await sweep.mature()
    expect(await sweep.notify()).toBe(0)
    expect(repo.conversions[0]!.notifiedAt).toBeNull()

    gateway.sendEmailResult = { status: 202, body: {} }
    expect(await sweep.notify()).toBe(1)
  })

  test('embaixador DESATIVADO não recebe o aviso (a página 404aria); reativado → próximo ciclo envia', async () => {
    const repo = new InMemoryReferralRepository()
    const gateway = new FakeReferralsGateway()
    const sweep = new SweepConversionsService(
      repo,
      gateway,
      { funnelPublicUrl: 'https://x.com', batchSize: 50 },
      silentLogger,
    )
    const created = await repo.createAmbassadorWithCode({
      name: 'Vó Cida',
      email: 'cida@example.com',
      pageToken: 't'.repeat(43),
      code: 'cida-x7k2',
    })
    if (created.kind !== 'created') throw new Error('seed falhou')
    const { redemption } = await repo.insertRedemption({
      codeId: created.code.id,
      email: 'p@x.com',
      name: 'P',
      phone: null,
    })
    await repo.insertConversion({
      redemptionId: redemption.id,
      codeId: created.code.id,
      ambassadorId: created.ambassador.id,
      paymentId: 'pay-1',
      subscriptionId: null,
      offerSlug: 'comunidade-dos-criadores-mensal',
      amountCents: 9700n,
      bonusCents: 3000,
      status: 'pending',
      paidAt: new Date(),
      maturesAt: new Date(Date.now() - 1000),
    })
    await repo.setAmbassadorStatus(created.ambassador.id, 'disabled')
    await sweep.mature()
    // Desativado: nada sai e a notificação NÃO é queimada (mark-after-send).
    expect(await sweep.notify()).toBe(0)
    expect(gateway.callsOf('sendEmail')).toHaveLength(0)
    expect(repo.conversions[0]!.notifiedAt).toBeNull()

    await repo.setAmbassadorStatus(created.ambassador.id, 'active')
    expect(await sweep.notify()).toBe(1)
    expect(repo.conversions[0]!.notifiedAt).not.toBeNull()
  })
})
