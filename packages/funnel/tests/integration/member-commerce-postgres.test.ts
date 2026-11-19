import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { resolve } from 'node:path'
import type { CommerceCatalogOffer } from '@sistemazero/core/commerce'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { createFunnelRepo } from '../../src/db/repo'
import { schema } from '../../src/db/schema'
import { clearOfferCache } from '../../src/server/catalog'
import { handleMemberCommerce, type MemberCommerceDeps } from '../../src/server/member-commerce'
import { createMemberCommerceStore } from '../../src/server/member-commerce-store'
import { createFakeGateway } from '../fakes/fake-gateway'

// Somente banco isolado explicitamente fornecido, nunca DATABASE_URL da aplicação.
const url = process.env.MEMBER_COMMERCE_TEST_DATABASE_URL
describe.skipIf(!url)('comércio autenticado com PostgreSQL real e pool de uma conexão', () => {
  const sql = postgres(url ?? '', { max: 1 })
  const replicaSql = postgres(url ?? '', { max: 1 })
  const db = drizzle(sql, { schema, casing: 'snake_case' })
  const replicaDb = drizzle(replicaSql, { schema, casing: 'snake_case' })
  beforeAll(async () => {
    await migrate(db, {
      migrationsFolder: resolve(import.meta.dir, '../../src/db/migrations'),
      migrationsTable: 'funil_migrations',
    })
  })
  afterAll(async () => {
    await Promise.all([sql.end(), replicaSql.end()])
  })
  test('commit anterior ao despacho, corpo exato após JSONB, concorrência entre ofertas e recuperação sem Catálogo', async () => {
    clearOfferCache()
    const gw = createFakeGateway()
    const offer: CommerceCatalogOffer = {
      id: crypto.randomUUID(),
      slug: 'pg-mensal',
      name: 'Comunidade',
      status: 'active',
      isAvailable: true,
      priceCents: 3700,
      pricingMode: 'subscription',
      billingIntervalMonths: 1,
      installmentsMax: null,
      accessMode: 'billing_cycle',
      accessDurationValue: null,
      accessDurationUnit: null,
      product: {
        id: crypto.randomUUID(),
        sku: 'COMUNIDADE',
        name: 'Comunidade',
        audience: 'kids',
        status: 'active',
      },
      content: null,
      includes: [],
    }
    const annual = {
      ...offer,
      id: crypto.randomUUID(),
      slug: 'pg-anual',
      billingIntervalMonths: 12,
    }
    gw.gateway.getOffer = async (ref) => ({
      status: 200,
      body: ref === annual.slug ? annual : offer,
    })
    for (const item of [offer, annual])
      gw.setOfferConfig(item.slug, {
        pricingMode: 'subscription',
        billingIntervalMonths: item.billingIntervalMonths,
      })
    const store = createMemberCommerceStore(db)
    const deps: MemberCommerceDeps = {
      internalToken: 'test',
      store,
      repo: createFunnelRepo(db),
      gateway: gw.gateway,
      checkout: {},
      funnelUrl: 'https://example.test',
      termsForOffer: () => ({ url: 'https://example.test/termos', version: 'pg' }),
    }
    const account = {
      userId: crypto.randomUUID(),
      email: 'pg@example.test',
      name: 'Teste Conta',
      audience: 'kids',
    }
    const input = (item: typeof offer) => ({
      account,
      origin: { kind: 'promotion', offerRef: item.slug },
      offerRef: item.slug,
    })
    const replicaDeps = {
      ...deps,
      repo: createFunnelRepo(replicaDb),
      store: createMemberCommerceStore(replicaDb),
    }
    const call = (body: unknown, action: string, instance = deps) =>
      handleMemberCommerce(
        new Request('http://localhost', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-internal-token': 'test' },
          body: JSON.stringify(body),
        }),
        action,
        instance,
      )
    const a = await (await call(input(offer), 'inspect')).json()
    const b = await (await call(input(annual), 'inspect')).json()
    const data = {
      method: 'card',
      acceptedTerms: true,
      termsVersion: 'pg',
      token: 'only-a-test-token',
      brand: 'visa',
      last4: '1111',
      birth: '1985-01-01',
      contact: { cpf: '52998224725', telefone: '11988887777' },
      address: {
        street: 'Rua Teste',
        number: '10',
        neighborhood: 'Centro',
        zipcode: '01001000',
        city: 'São Paulo',
        state: 'SP',
      },
    }
    const sent: { body: unknown; key: string }[] = []
    let lose = true
    gw.gateway.createSubscription = async (body, key) => {
      // Usa o mesmo pool: se a criação mantivesse a transação, este SELECT travaria.
      const rows =
        await sql`select dispatch_plan from funil.member_checkouts where account_id = ${account.userId} and dispatch_plan is not null`
      expect(rows).toHaveLength(1)
      expect(rows[0]?.dispatch_plan.bodyJson).toBe(JSON.stringify(body))
      sent.push({ body, key })
      return lose
        ? { status: 504, body: null }
        : {
            status: 201,
            body: {
              id: 'a0000000-0000-4000-8000-000000000001',
              status: 'PENDING',
              firstPayment: { id: 'b0000000-0000-4000-8000-000000000001', status: 'PENDING' },
            },
          }
    }
    const responses = await Promise.all([
      call({ ...input(offer), checkoutId: a.checkoutId, data }, 'pay'),
      call({ ...input(annual), checkoutId: b.checkoutId, data }, 'pay', replicaDeps),
    ])
    expect(responses.map((r) => r.status).sort()).toEqual([200, 502])
    expect(sent).toHaveLength(1)
    const claim =
      await sql`select * from funil.member_product_claims where account_id = ${account.userId}`
    expect(claim).toHaveLength(1)
    const checkoutId = claim[0]?.checkout_id
    const source = checkoutId === a.checkoutId ? input(offer) : input(annual)
    gw.gateway.getOffer = async () => ({ status: 503, body: null })
    expect(await (await call(source, 'pending')).json()).toEqual({
      items: [{ checkoutId, origin: source.origin, title: offer.name }],
    })
    const recovery = await (await call(source, 'recover')).json()
    expect(recovery).toMatchObject({ checkoutId, status: 'PROCESSING' })
    for (const item of [offer, annual])
      expect(await (await call(input(item), 'recover')).json()).toMatchObject({
        checkoutId,
        status: 'PROCESSING',
      })
    lose = false
    expect((await call({ ...source, checkoutId, data: { resume: true } }, 'pay')).status).toBe(200)
    expect(sent[0]).toEqual(sent[1])
    const rows =
      await sql`select pending_request, dispatch_plan, attempt_phase from funil.member_checkouts where id = ${checkoutId}`
    expect(rows[0]).toMatchObject({
      pending_request: null,
      dispatch_plan: null,
      attempt_phase: 'recorded',
    })
  }, 30_000)
})
