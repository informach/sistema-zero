import { describe, expect, test } from 'bun:test'
import type { Lead } from '../../src/db/repo'
import {
  type FulfillmentDeps,
  FulfillmentRetryError,
  fulfillPaidLead,
  normalizePhone,
  splitName,
} from '../../src/server/fulfillment'
import { createFakeRepo } from '../fakes/fake-db'
import { createFakeGateway } from '../fakes/fake-gateway'

const PAID_AT = new Date('2026-06-01T12:00:00Z')

async function setup(over: Partial<Lead> = {}) {
  const { repo, leads } = createFakeRepo()
  const gw = createFakeGateway()
  const { id } = await repo.createLead()
  await repo.updateLead(id, {
    nome: 'Ana Souza',
    email: 'ana@example.com',
    telefone: '(11) 99999-8888',
    ...over,
  })
  // marca pago direto no fake (sem passar por markPaid p/ controlar paidAt)
  const lead = leads.get(id)!
  lead.paidAt = PAID_AT
  const deps: FulfillmentDeps = {
    repo,
    gateway: gw.gateway,
    genTempPassword: () => 'senha-temporaria-1234',
    now: () => PAID_AT,
  }
  return { repo, leads, gw, id, lead, deps }
}

describe('splitName', () => {
  test('nome completo → first + last', () => {
    expect(splitName('Ana Souza Lima')).toEqual({ firstName: 'Ana', lastName: 'Souza Lima' })
  })
  test('nome único → lastName placeholder', () => {
    expect(splitName('Ana')).toEqual({ firstName: 'Ana', lastName: '—' })
  })
  test('vazio → fallback', () => {
    expect(splitName('')).toEqual({ firstName: 'Cliente', lastName: '—' })
    expect(splitName(null)).toEqual({ firstName: 'Cliente', lastName: '—' })
  })
})

describe('normalizePhone', () => {
  test('remove máscara e limita a 20 dígitos', () => {
    expect(normalizePhone('(11) 99999-8888')).toBe('11999998888')
    expect(normalizePhone(null)).toBeUndefined()
    expect(normalizePhone('')).toBeUndefined()
  })
})

describe('fulfillPaidLead', () => {
  test('201 → grava buyer_user_id + registra; envia o input correto', async () => {
    const { leads, gw, id, lead, deps } = await setup()
    await fulfillPaidLead(lead, deps)

    expect(gw.calls.register).toHaveLength(1)
    const input = gw.calls.register[0]!.input
    expect(input.email).toBe('ana@example.com')
    expect(input.firstName).toBe('Ana')
    expect(input.lastName).toBe('Souza')
    expect(input.phone).toBe('11999998888')
    expect(input.source).toBe('funnel')
    expect(input.password.length).toBeGreaterThanOrEqual(10)

    const after = leads.get(id)!
    expect(after.buyerUserId).toBe('user-1')
    expect(after.buyerRegisteredAt).toEqual(PAID_AT)
  })

  test('409 (e-mail já existe) → registra sem user id (idempotente)', async () => {
    const { leads, gw, id, lead, deps } = await setup()
    gw.setRegisterStatus(409, { error: { code: 'EMAIL_ALREADY_IN_USE' } })
    await fulfillPaidLead(lead, deps)
    expect(leads.get(id)!.buyerRegisteredAt).toEqual(PAID_AT)
    expect(leads.get(id)!.buyerUserId).toBeNull()
  })

  test('5xx → lança FulfillmentRetryError e NÃO registra', async () => {
    const { leads, gw, id, lead, deps } = await setup()
    gw.setRegisterStatus(503, { error: { code: 'UNAVAILABLE' } })
    let thrown: unknown
    try {
      await fulfillPaidLead(lead, deps)
    } catch (e) {
      thrown = e
    }
    expect(thrown).toBeInstanceOf(FulfillmentRetryError)
    expect(leads.get(id)!.buyerRegisteredAt).toBeNull()
  })

  test('já registrado → no-op (sem chamar o gateway)', async () => {
    const { gw, lead, deps } = await setup()
    lead.buyerRegisteredAt = new Date()
    await fulfillPaidLead(lead, deps)
    expect(gw.calls.register).toHaveLength(0)
  })

  test('sem e-mail → no-op', async () => {
    const { gw, lead, deps } = await setup({ email: null })
    lead.email = null
    await fulfillPaidLead(lead, deps)
    expect(gw.calls.register).toHaveLength(0)
  })

  test('não pago → no-op', async () => {
    const { gw, lead, deps } = await setup()
    lead.paidAt = null
    await fulfillPaidLead(lead, deps)
    expect(gw.calls.register).toHaveLength(0)
  })
})
