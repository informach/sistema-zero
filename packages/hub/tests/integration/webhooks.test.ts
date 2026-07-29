import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import type { AccessConfig } from '../../src/domain/access/access-config'
import type { SpaceFields } from '../../src/domain/ports/community-admin-repository.port'
import { buildApp, studentHeaders, TEST_WEBHOOK_SECRET } from '../helpers'

const GATED: AccessConfig = { visibility: 'course_gated', courses: ['curso-x'], roles: [] }

const spaceFields = (over: Partial<SpaceFields> & { slug: string }): SpaceFields => ({
  name: over.slug,
  description: null,
  iconUrl: null,
  audience: 'adult',
  accessConfig: GATED,
  requiresApproval: false,
  teaserWhenLocked: false,
  status: 'active',
  ...over,
})
const WEBHOOK_PATH = '/hub/webhooks/grant'

function webhookRequest(
  bodyStr: string,
  opts: { secret?: string; deliveryId?: string; nowSeconds?: number } = {},
): Request {
  const ts = opts.nowSeconds ?? Math.floor(Date.now() / 1000)
  const sig = signHmac(
    opts.secret ?? TEST_WEBHOOK_SECRET,
    canonicalHmacMessage({
      method: 'POST',
      path: WEBHOOK_PATH,
      deliveryId: opts.deliveryId,
      body: bodyStr,
    }),
    ts,
  )
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-signature': `t=${ts},v1=${sig}`,
  }
  if (opts.deliveryId) headers['x-delivery-id'] = opts.deliveryId
  return new Request(`http://local${WEBHOOK_PATH}`, { method: 'POST', headers, body: bodyStr })
}

describe('webhook de concessão (cache-bust de acesso)', () => {
  test('assinatura válida invalida o cache → acesso re-resolve', async () => {
    const ctx = buildApp({ accessCacheTtlMs: 60_000 })
    await ctx.repo.createSpace(spaceFields({ slug: 'curso-x' }))
    const user = randomUUID()
    const headers = studentHeaders(user)

    // Sem matrícula: space gated não aparece (1ª resolução vai ao members).
    const first = await ctx.app.handle(new Request('http://local/hub/spaces', { headers }))
    expect(((await first.json()) as { items: unknown[] }).items).toHaveLength(0)
    const callsAfterFirst = ctx.members.calls

    // Concede no members, mas o cache (TTL 60s) ainda devolve "sem acesso".
    ctx.members.grantsByUser.set(user, new Set(['curso-x']))
    const cached = await ctx.app.handle(new Request('http://local/hub/spaces', { headers }))
    expect(((await cached.json()) as { items: unknown[] }).items).toHaveLength(0)
    expect(ctx.members.calls).toBe(callsAfterFirst) // bateu no cache

    // Webhook de grant → invalida o cache do usuário.
    const body = JSON.stringify({ userId: user, event: 'grant' })
    const res = await ctx.app.handle(webhookRequest(body, { deliveryId: 'd-1' }))
    expect(res.status).toBe(200)

    // Próxima leitura re-resolve no members → agora o space aparece.
    const after = await ctx.app.handle(new Request('http://local/hub/spaces', { headers }))
    expect(((await after.json()) as { items: Array<{ slug: string }> }).items).toHaveLength(1)
    expect(ctx.members.calls).toBe(callsAfterFirst + 1)
  })

  test('assinatura inválida → 401', async () => {
    const ctx = buildApp()
    const body = JSON.stringify({ userId: randomUUID() })
    const res = await ctx.app.handle(webhookRequest(body, { secret: 'segredo-errado-aqui-1234' }))
    expect(res.status).toBe(401)
  })

  test('dedupe por x-delivery-id (entrega repetida)', async () => {
    const ctx = buildApp()
    const body = JSON.stringify({ userId: randomUUID() })
    const a = await ctx.app.handle(webhookRequest(body, { deliveryId: 'dup-1' }))
    expect(a.status).toBe(200)
    expect((await a.json()) as { deduped?: boolean }).not.toHaveProperty('deduped')

    const b = await ctx.app.handle(webhookRequest(body, { deliveryId: 'dup-1' }))
    expect(b.status).toBe(200)
    expect(((await b.json()) as { deduped?: boolean }).deduped).toBe(true)
  })
})
