import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  computeExpiry,
  GrantEntitlementService,
} from '../../src/application/grant-entitlement/grant-entitlement.service'
import { RevokeEntitlementService } from '../../src/application/revoke-entitlement/revoke-entitlement.service'
import { FakeCatalogGateway, InMemoryEntitlementRepository, silentLogger } from '../fakes/in-memory'
import { offerWithCourse } from '../helpers'

const T = (s: string) => new Date(s)

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
    const expected1 = computeExpiry(T('2026-06-01T00:00:00Z'), 1, 3)
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
    const expected2 = computeExpiry(T('2026-07-01T00:00:00Z'), 1, 3)
    list = await entitlements.listActiveByUser('u1', T('2026-07-15'))
    expect(list).toHaveLength(1)
    expect(list[0]?.expiresAt?.getTime()).toBe(expected2.getTime())
    expect(expected2.getTime()).toBeGreaterThan(expected1.getTime())
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
