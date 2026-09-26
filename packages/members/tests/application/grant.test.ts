import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { AccessCheckService } from '../../src/application/access-check/access-check.service'
import {
  computeFixedExpiry,
  computeSubscriptionExpiry,
  GrantEntitlementService,
} from '../../src/application/grant-entitlement/grant-entitlement.service'
import {
  MURAL_VISITOR_PRODUCT_ID,
  MURAL_VISITOR_REF,
} from '../../src/application/grant-manual-entitlement/grant-manual-entitlement.service'
import { RevokeEntitlementService } from '../../src/application/revoke-entitlement/revoke-entitlement.service'
import { FakeCatalogGateway, InMemoryEntitlementRepository, silentLogger } from '../fakes/in-memory'
import { offerWithCourse } from '../helpers'

const T = (s: string) => new Date(s)
const DESAFIO_30_DIAS = 'desafio-primeiro-jogo-30-dias'
const MURAL_FULL_REF = 'mural-dos-criadores'

function offerWithMural(offerSlug: string) {
  const offer = offerWithCourse(offerSlug, 'desafio-primeiro-jogo')
  offer.items.push({
    productId: randomUUID(),
    sku: MURAL_FULL_REF,
    name: 'Mural dos Criadores',
    kind: 'community',
    isPrimary: false,
    fulfillment: { accessType: 'community', courseRef: MURAL_FULL_REF },
  })
  return offer
}

function setup() {
  const catalog = new FakeCatalogGateway()
  const entitlements = new InMemoryEntitlementRepository()
  const grant = new GrantEntitlementService({
    catalog,
    entitlements,
    graceDays: 3,
    newId: () => randomUUID(),
    logger: silentLogger,
  })
  return { catalog, entitlements, grant }
}

describe('GrantEntitlementService', () => {
  test('Desafio de 30 dias mantém Mural visitante após o vencimento do acesso pleno', async () => {
    const { catalog, entitlements, grant } = setup()
    catalog.set(DESAFIO_30_DIAS, offerWithMural(DESAFIO_30_DIAS))
    const grantedAt = T('2026-09-16T15:00:00Z')
    const cmd = {
      userId: 'u1',
      offerRef: DESAFIO_30_DIAS,
      paymentId: 'pay1',
      grantedAt,
      accessPolicy: { mode: 'fixed', durationValue: 30, durationUnit: 'days' } as const,
    }
    const result = await grant.execute(cmd)
    expect(result).toEqual({ offerFound: true, granted: 3, itemsResolved: 2 })

    const all = await entitlements.listByUserId('u1')
    expect(all).toHaveLength(3)
    const visitor = all.find((e) => e.toSnapshot().productId === MURAL_VISITOR_PRODUCT_ID)
    expect(visitor?.toSnapshot().sourceKind).toBe('payment')
    expect(visitor?.toSnapshot().sourceId).toBe('pay1')
    expect(visitor?.expiresAt).toBeNull()
    expect(visitor?.snapshot.accessPolicy).toEqual({
      mode: 'lifetime',
      durationValue: null,
      durationUnit: null,
    })
    expect(visitor?.snapshot.offerSlug).toBe(DESAFIO_30_DIAS)
    expect(
      all
        .filter((e) => e.toSnapshot().productId !== MURAL_VISITOR_PRODUCT_ID)
        .map((e) => e.expiresAt?.toISOString()),
    ).toEqual(['2026-10-16T15:00:00.000Z', '2026-10-16T15:00:00.000Z'])

    let now = T('2026-10-16T14:59:59Z')
    const access = new AccessCheckService(entitlements, () => now)
    expect((await access.execute('u1', ['desafio-primeiro-jogo'])).communities).toEqual(
      expect.arrayContaining([MURAL_FULL_REF, MURAL_VISITOR_REF]),
    )
    now = T('2026-10-16T15:00:00Z')
    expect(await access.execute('u1', ['desafio-primeiro-jogo'])).toMatchObject({
      grants: [],
      communities: [MURAL_VISITOR_REF],
    })
    expect(await grant.execute(cmd)).toEqual({ offerFound: true, granted: 0, itemsResolved: 2 })
    expect(entitlements.byId.size).toBe(3)
  })

  test('o visitante permanente não é concedido a ofertas históricas ou a outras ofertas fixas', async () => {
    const { catalog, entitlements, grant } = setup()
    catalog.set('desafio-primeiro-jogo', offerWithMural('desafio-primeiro-jogo'))
    catalog.set('outra-oferta', offerWithMural('outra-oferta'))
    catalog.set(DESAFIO_30_DIAS, offerWithCourse(DESAFIO_30_DIAS, 'desafio-primeiro-jogo'))
    const fixed = { mode: 'fixed', durationValue: 30, durationUnit: 'days' } as const
    const at = T('2026-09-16T15:00:00Z')

    await grant.execute({
      userId: 'legacy',
      offerRef: 'desafio-primeiro-jogo',
      paymentId: 'p1',
      grantedAt: at,
    })
    await grant.execute({
      userId: 'other',
      offerRef: 'outra-oferta',
      paymentId: 'p2',
      grantedAt: at,
      accessPolicy: fixed,
    })
    await grant.execute({
      userId: 'no-mural',
      offerRef: DESAFIO_30_DIAS,
      paymentId: 'p3',
      grantedAt: at,
      accessPolicy: fixed,
    })
    catalog.set(DESAFIO_30_DIAS, offerWithMural(DESAFIO_30_DIAS))
    await grant.execute({
      userId: 'legacy-event',
      offerRef: DESAFIO_30_DIAS,
      paymentId: 'p4',
      grantedAt: at,
    })
    await grant.execute({
      userId: 'wrong-duration',
      offerRef: DESAFIO_30_DIAS,
      paymentId: 'p5',
      grantedAt: at,
      accessPolicy: { mode: 'fixed', durationValue: 31, durationUnit: 'days' },
    })
    for (const userId of ['legacy', 'other', 'no-mural', 'legacy-event', 'wrong-duration']) {
      expect(
        (await entitlements.listByUserId(userId)).some(
          (e) => e.toSnapshot().productId === MURAL_VISITOR_PRODUCT_ID,
        ),
      ).toBe(false)
    }
  })

  test('reentrega completa o visitante quando o primeiro grant falha depois dos itens da oferta', async () => {
    const { catalog, entitlements, grant } = setup()
    catalog.set(DESAFIO_30_DIAS, offerWithMural(DESAFIO_30_DIAS))
    const originalSave = entitlements.save.bind(entitlements)
    let failVisitorOnce = true
    entitlements.save = async (entitlement) => {
      if (entitlement.toSnapshot().productId === MURAL_VISITOR_PRODUCT_ID && failVisitorOnce) {
        failVisitorOnce = false
        throw new Error('falha transitória')
      }
      return originalSave(entitlement)
    }
    const cmd = {
      userId: 'u1',
      offerRef: DESAFIO_30_DIAS,
      paymentId: 'pay1',
      grantedAt: T('2026-09-16T15:00:00Z'),
      accessPolicy: { mode: 'fixed', durationValue: 30, durationUnit: 'days' } as const,
    }
    await expect(grant.execute(cmd)).rejects.toThrow('falha transitória')
    expect(entitlements.byId.size).toBe(2)
    expect((await grant.execute(cmd)).granted).toBe(1)
    expect(entitlements.byId.size).toBe(3)
  })

  test('compra única → matrícula vitalícia com snapshot do catálogo', async () => {
    const { catalog, entitlements, grant } = setup()
    catalog.set('offer-x', offerWithCourse('offer-x', 'curso-demo'))
    const result = await grant.execute({
      userId: 'u1',
      offerRef: 'offer-x',
      paymentId: 'pay1',
      grantedAt: T('2026-06-01'),
    })
    expect(result.granted).toBe(1)
    const list = await entitlements.listActiveByUser('u1', T('2030-01-01'))
    expect(list).toHaveLength(1)
    expect(list[0]?.expiresAt).toBeNull()
    expect(list[0]?.courseRef).toBe('curso-demo')
    expect(list[0]?.snapshot.accessPolicy).toEqual({
      mode: 'lifetime',
      durationValue: null,
      durationUnit: null,
    })
  })

  test('prazo fixo de 30 dias preserva o instante UTC e não recebe carência', async () => {
    const { catalog, entitlements, grant } = setup()
    catalog.set('offer-30-dias', offerWithCourse('offer-30-dias', 'curso-demo'))
    await grant.execute({
      userId: 'u1',
      offerRef: 'offer-30-dias',
      paymentId: 'pay1',
      grantedAt: T('2026-09-16T15:00:00Z'),
      accessPolicy: { mode: 'fixed', durationValue: 30, durationUnit: 'days' },
    })
    const replay = await grant.execute({
      userId: 'u1',
      offerRef: 'offer-30-dias',
      paymentId: 'pay1',
      grantedAt: T('2026-09-20T15:00:00Z'),
      accessPolicy: { mode: 'fixed', durationValue: 30, durationUnit: 'days' },
    })

    const [entitlement] = await entitlements.listActiveByUser('u1', T('2026-10-01T00:00:00Z'))
    expect(replay.granted).toBe(0)
    expect(entitlements.byId.size).toBe(1)
    expect(entitlement?.expiresAt?.toISOString()).toBe('2026-10-16T15:00:00.000Z')
    expect(entitlement?.snapshot.accessPolicy).toEqual({
      mode: 'fixed',
      durationValue: 30,
      durationUnit: 'days',
    })
  })

  test('dias fixos atravessam mudança sazonal sem alterar as 24 horas UTC', () => {
    const start = T('2026-10-17T15:00:00Z')
    const end = computeFixedExpiry(start, 30, 'days')
    expect(end.getTime() - start.getTime()).toBe(30 * 86_400_000)
  })

  test('mês fixo limita 31 de janeiro ao fim de fevereiro', () => {
    expect(computeFixedExpiry(T('2027-01-31T15:00:00Z'), 1, 'months').toISOString()).toBe(
      '2027-02-28T15:00:00.000Z',
    )
  })

  test('idempotente: mesmo pagamento duas vezes → 1 matrícula', async () => {
    const { catalog, entitlements, grant } = setup()
    catalog.set('offer-x', offerWithCourse('offer-x', 'curso-demo'))
    const cmd = { userId: 'u1', offerRef: 'offer-x', paymentId: 'pay1', grantedAt: T('2026-06-01') }
    await grant.execute(cmd)
    const second = await grant.execute(cmd)
    expect(second.granted).toBe(0)
    expect(entitlements.byId.size).toBe(1)
  })

  test('compra por PERÍODO legada: expiresAt = grant + 12 meses, sem carência nem assinatura', async () => {
    const { catalog, entitlements, grant } = setup()
    catalog.set('offer-anual', offerWithCourse('offer-anual', 'curso-demo'))
    const result = await grant.execute({
      userId: 'u1',
      offerRef: 'offer-anual',
      paymentId: 'pay1',
      grantedAt: T('2026-06-01T00:00:00Z'),
      accessPeriodMonths: 12,
    })
    expect(result.granted).toBe(1)
    const list = await entitlements.listActiveByUser('u1', T('2026-12-01'))
    expect(list).toHaveLength(1)
    expect(list[0]?.expiresAt?.getTime()).toBe(
      computeFixedExpiry(T('2026-06-01T00:00:00Z'), 12, 'months').getTime(),
    )
    // SEM assinatura sintética: revogação por subscriptionId nunca a alcança.
    expect(list[0]?.toSnapshot().subscriptionId).toBeNull()
    // Expira sozinha depois da validade + carência.
    expect(await entitlements.listActiveByUser('u1', T('2027-06-10'))).toHaveLength(0)
  })

  test('compra por período é idempotente pelo pagamento; renovar = compra nova = linha nova', async () => {
    const { catalog, entitlements, grant } = setup()
    catalog.set('offer-anual', offerWithCourse('offer-anual', 'curso-demo'))
    const cmd = {
      userId: 'u1',
      offerRef: 'offer-anual',
      paymentId: 'pay1',
      grantedAt: T('2026-06-01T00:00:00Z'),
      accessPeriodMonths: 12,
    }
    await grant.execute(cmd)
    expect((await grant.execute(cmd)).granted).toBe(0) // replay do webhook
    expect(entitlements.byId.size).toBe(1)

    // Renovação manual (nova compra, paymentId novo) → nova matrícula; o acesso
    // efetivo é o mais forte entre as duas (validade mais distante).
    await grant.execute({ ...cmd, paymentId: 'pay2', grantedAt: T('2027-05-20T00:00:00Z') })
    expect(entitlements.byId.size).toBe(2)
    const list = await entitlements.listActiveByUser('u1', T('2027-06-10'))
    expect(list).toHaveLength(1)
    expect(list[0]?.expiresAt?.getTime()).toBe(
      computeFixedExpiry(T('2027-05-20T00:00:00Z'), 12, 'months').getTime(),
    )
  })

  test('subscription presente vence accessPeriodMonths (nunca chegam juntos do funil)', async () => {
    const { catalog, entitlements, grant } = setup()
    catalog.set('offer-sub', offerWithCourse('offer-sub', 'curso-demo'))
    await grant.execute({
      userId: 'u1',
      offerRef: 'offer-sub',
      paymentId: 'pay1',
      grantedAt: T('2026-06-01T00:00:00Z'),
      subscription: { subscriptionId: 'sub1', intervalMonths: 1 },
      accessPeriodMonths: 12,
    })
    const [ent] = await entitlements.listActiveByUser('u1', T('2026-06-15'))
    // Validade do CICLO (1 mês), não do período — e ligada à assinatura.
    expect(ent?.expiresAt?.getTime()).toBe(
      computeSubscriptionExpiry(T('2026-06-01T00:00:00Z'), 1, 3).getTime(),
    )
    expect(ent?.toSnapshot().subscriptionId).toBe('sub1')
  })

  test('política explícita vence o campo legado', async () => {
    const { catalog, entitlements, grant } = setup()
    catalog.set('offer-x', offerWithCourse('offer-x', 'curso-demo'))
    await grant.execute({
      userId: 'u1',
      offerRef: 'offer-x',
      paymentId: 'pay1',
      grantedAt: T('2026-09-16T15:00:00Z'),
      accessPeriodMonths: 12,
      accessPolicy: { mode: 'fixed', durationValue: 30, durationUnit: 'days' },
    })

    const [entitlement] = await entitlements.listActiveByUser('u1', T('2026-10-01T00:00:00Z'))
    expect(entitlement?.expiresAt?.toISOString()).toBe('2026-10-16T15:00:00.000Z')
  })

  test('política billing_cycle exige assinatura coerente antes de qualquer escrita', async () => {
    const { catalog, entitlements, grant } = setup()
    catalog.set('offer-sub', offerWithCourse('offer-sub', 'curso-demo'))

    await expect(
      grant.execute({
        userId: 'u1',
        offerRef: 'offer-sub',
        paymentId: 'pay1',
        grantedAt: T('2026-09-16T15:00:00Z'),
        accessPolicy: { mode: 'billing_cycle', durationValue: null, durationUnit: null },
      }),
    ).rejects.toMatchObject({ code: 'PURCHASE_ACCESS_POLICY_INVALID' })
    expect(entitlements.byId.size).toBe(0)
  })

  test('uma compra temporária não encurta o acesso vitalício já existente', async () => {
    const { catalog, entitlements, grant } = setup()
    catalog.set('offer-x', offerWithCourse('offer-x', 'curso-demo'))
    await grant.execute({
      userId: 'u1',
      offerRef: 'offer-x',
      paymentId: 'pay-lifetime',
      grantedAt: T('2026-09-01T15:00:00Z'),
      accessPolicy: { mode: 'lifetime', durationValue: null, durationUnit: null },
    })
    await grant.execute({
      userId: 'u1',
      offerRef: 'offer-x',
      paymentId: 'pay-fixed',
      grantedAt: T('2026-09-16T15:00:00Z'),
      accessPolicy: { mode: 'fixed', durationValue: 30, durationUnit: 'days' },
    })

    const activeAfterTemporaryExpiry = await entitlements.listActiveByUser(
      'u1',
      T('2030-01-01T00:00:00Z'),
    )
    expect(activeAfterTemporaryExpiry).toHaveLength(1)
    expect(activeAfterTemporaryExpiry[0]?.expiresAt).toBeNull()
  })

  test('assinatura: expiresAt = grant + intervalo + carência; 2º ciclo estende', async () => {
    const { catalog, entitlements, grant } = setup()
    catalog.set('offer-sub', offerWithCourse('offer-sub', 'curso-demo'))

    await grant.execute({
      userId: 'u1',
      offerRef: 'offer-sub',
      paymentId: 'pay1',
      grantedAt: T('2026-06-01T00:00:00Z'),
      subscription: { subscriptionId: 'sub1', intervalMonths: 1 },
    })
    const expected1 = computeSubscriptionExpiry(T('2026-06-01T00:00:00Z'), 1, 3)
    let list = await entitlements.listActiveByUser('u1', T('2026-06-15'))
    expect(list).toHaveLength(1)
    expect(list[0]?.expiresAt?.getTime()).toBe(expected1.getTime())

    await grant.execute({
      userId: 'u1',
      offerRef: 'offer-sub',
      paymentId: 'pay2',
      grantedAt: T('2026-07-01T00:00:00Z'),
      subscription: { subscriptionId: 'sub1', intervalMonths: 1 },
    })
    const expected2 = computeSubscriptionExpiry(T('2026-07-01T00:00:00Z'), 1, 3)
    list = await entitlements.listActiveByUser('u1', T('2026-07-15'))
    expect(list).toHaveLength(1)
    expect(list[0]?.expiresAt?.getTime()).toBe(expected2.getTime())
    expect(expected2.getTime()).toBeGreaterThan(expected1.getTime())
  })

  test('assinatura legada sem intervalo continua reprocessável', async () => {
    const { catalog, entitlements, grant } = setup()
    catalog.set('offer-sub-legada', offerWithCourse('offer-sub-legada', 'curso-demo'))

    const result = await grant.execute({
      userId: 'u1',
      offerRef: 'offer-sub-legada',
      paymentId: 'pay1',
      grantedAt: T('2026-06-01T00:00:00Z'),
      subscription: { subscriptionId: 'sub-legada', intervalMonths: null },
    })

    expect(result.granted).toBe(1)
    const [entitlement] = await entitlements.listActiveByUser('u1', T('2030-01-01T00:00:00Z'))
    expect(entitlement?.expiresAt).toBeNull()
    expect(entitlement?.subscriptionId).toBe('sub-legada')
  })

  test('renovação re-tenta sob conflito otimista e NÃO perde a extensão', async () => {
    const { catalog, entitlements, grant } = setup()
    catalog.set('offer-sub', offerWithCourse('offer-sub', 'curso-demo'))
    await grant.execute({
      userId: 'u1',
      offerRef: 'offer-sub',
      paymentId: 'pay1',
      grantedAt: T('2026-06-01T00:00:00Z'),
      subscription: { subscriptionId: 'sub1', intervalMonths: 1 },
    })

    // O 1º update do 2º ciclo PERDE a corrida (simula cancel/admin concorrente
    // bumpando a version); o retry recarrega e aplica.
    const originalUpdate = entitlements.update.bind(entitlements)
    let failures = 1
    entitlements.update = async (e) => {
      if (failures > 0) {
        failures -= 1
        return false
      }
      return originalUpdate(e)
    }

    const result = await grant.execute({
      userId: 'u1',
      offerRef: 'offer-sub',
      paymentId: 'pay2',
      grantedAt: T('2026-07-01T00:00:00Z'),
      subscription: { subscriptionId: 'sub1', intervalMonths: 1 },
    })
    expect(result.granted).toBe(1)
    const [ent] = await entitlements.listActiveByUser('u1', T('2026-07-15'))
    expect(ent?.expiresAt?.getTime()).toBe(
      computeSubscriptionExpiry(T('2026-07-01T00:00:00Z'), 1, 3).getTime(),
    )
  })

  test('conflito PERSISTENTE na extensão → lança (webhook 5xx → re-entrega)', async () => {
    const { catalog, entitlements, grant } = setup()
    catalog.set('offer-sub', offerWithCourse('offer-sub', 'curso-demo'))
    await grant.execute({
      userId: 'u1',
      offerRef: 'offer-sub',
      paymentId: 'pay1',
      grantedAt: T('2026-06-01T00:00:00Z'),
      subscription: { subscriptionId: 'sub1', intervalMonths: 1 },
    })

    entitlements.update = async () => false // sempre perde
    let thrown: unknown = null
    try {
      await grant.execute({
        userId: 'u1',
        offerRef: 'offer-sub',
        paymentId: 'pay2',
        grantedAt: T('2026-07-01T00:00:00Z'),
        subscription: { subscriptionId: 'sub1', intervalMonths: 1 },
      })
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(Error)
  })

  test('reentrega do MESMO ciclo é no-op (validade já cobre o alvo → granted 0)', async () => {
    const { catalog, entitlements, grant } = setup()
    catalog.set('offer-sub', offerWithCourse('offer-sub', 'curso-demo'))
    const cycle = {
      userId: 'u1',
      offerRef: 'offer-sub',
      paymentId: 'pay1',
      grantedAt: T('2026-06-01T00:00:00Z'),
      subscription: { subscriptionId: 'sub1', intervalMonths: 1 },
    }
    await grant.execute(cycle)
    const replay = await grant.execute(cycle)
    expect(replay.granted).toBe(0)
    expect(entitlements.byId.size).toBe(1)
  })

  test('snapshot congelado: alterar a oferta depois não muda a matrícula', async () => {
    const { catalog, entitlements, grant } = setup()
    const offer = offerWithCourse('offer-x', 'curso-demo')
    offer.items[0]!.name = 'Nome Original'
    catalog.set('offer-x', offer)
    await grant.execute({
      userId: 'u1',
      offerRef: 'offer-x',
      paymentId: 'pay1',
      grantedAt: T('2026-06-01'),
    })

    offer.items[0]!.name = 'Nome Novo' // muta a oferta no catálogo depois do grant
    const list = await entitlements.listActiveByUser('u1', T('2030-01-01'))
    expect(list[0]?.toSnapshot().snapshot.name).toBe('Nome Original')
  })

  test('oferta inexistente → offerFound false, granted 0 (sem lançar)', async () => {
    const { grant } = setup()
    const result = await grant.execute({
      userId: 'u1',
      offerRef: 'nope',
      paymentId: 'pay1',
      grantedAt: T('2026-06-01'),
    })
    expect(result.offerFound).toBe(false)
    expect(result.granted).toBe(0)
  })

  test('cancelamento revoga as matrículas da assinatura', async () => {
    const { catalog, entitlements, grant } = setup()
    catalog.set('offer-sub', offerWithCourse('offer-sub', 'curso-demo'))
    await grant.execute({
      userId: 'u1',
      offerRef: 'offer-sub',
      paymentId: 'pay1',
      grantedAt: T('2026-06-01'),
      subscription: { subscriptionId: 'sub1', intervalMonths: 1 },
    })
    const revoke = new RevokeEntitlementService({
      entitlements,
      clock: () => T('2026-06-10'),
      logger: silentLogger,
    })
    const result = await revoke.cancel('sub1')
    expect(result.affected).toBe(1)
    expect(await entitlements.listActiveByUser('u1', T('2026-06-10'))).toHaveLength(0)
    // Idempotente: re-cancelar não afeta linhas já revogadas.
    expect((await revoke.cancel('sub1')).affected).toBe(0)
  })

  test('expiração natural marca expired (idempotente; não rebaixa revoked)', async () => {
    const { catalog, entitlements, grant } = setup()
    catalog.set('offer-sub', offerWithCourse('offer-sub', 'curso-demo'))
    await grant.execute({
      userId: 'u1',
      offerRef: 'offer-sub',
      paymentId: 'pay1',
      grantedAt: T('2026-06-01'),
      subscription: { subscriptionId: 'sub1', intervalMonths: 1 },
    })
    const revoke = new RevokeEntitlementService({
      entitlements,
      clock: () => T('2026-08-01'),
      logger: silentLogger,
    })
    expect((await revoke.expire('sub1')).affected).toBe(1)
    expect((await revoke.expire('sub1')).affected).toBe(0)
    // Já expirada: um cancelamento ainda a revoga (transição válida).
    expect((await revoke.cancel('sub1')).affected).toBe(1)
  })
})
