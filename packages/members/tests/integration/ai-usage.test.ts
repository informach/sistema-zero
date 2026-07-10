import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp } from '../helpers'

const TOKEN = 'internal-token-16-chars!!'

function consume(feature: string, headers: Record<string, string> = {}): Request {
  return new Request('http://local/members/ai-usage/consume', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal-token': TOKEN, ...headers },
    body: JSON.stringify({ feature }),
  })
}

function studentHeaders(userId: string, accountId?: string): Record<string, string> {
  return {
    'x-auth-user-id': userId,
    ...(accountId ? { 'x-auth-account-id': accountId } : {}),
  }
}

describe('POST /members/ai-usage/consume — quota de IA por conta', () => {
  test('consome até o teto diário e recusa com scope day', async () => {
    const { app } = buildApp({ internalToken: TOKEN, aiLimits: { daily: 2, monthly: 100 } })
    const user = randomUUID()

    for (const expected of [1, 2]) {
      const res = await app.handle(consume('pensa-chat', studentHeaders(user)))
      expect(res.status).toBe(200)
      const body = (await res.json()) as { allowed: boolean; usedDay: number }
      expect(body.allowed).toBe(true)
      expect(body.usedDay).toBe(expected)
    }

    const res = await app.handle(consume('pensa-chat', studentHeaders(user)))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { allowed: boolean; scope?: string; usedDay: number }
    expect(body.allowed).toBe(false)
    expect(body.scope).toBe('day')
    expect(body.usedDay).toBe(2)
  })

  test('teto MENSAL soma os dias do mês e recusa com scope month', async () => {
    const { app, clockRef } = buildApp({
      internalToken: TOKEN,
      aiLimits: { daily: 10, monthly: 3 },
    })
    const user = randomUUID()

    // 2 consumos num dia, 1 no dia seguinte → mês = 3 = teto.
    clockRef.now = new Date('2026-06-02T12:00:00.000Z')
    await app.handle(consume('pensa-chat', studentHeaders(user)))
    await app.handle(consume('studio-describe', studentHeaders(user)))
    clockRef.now = new Date('2026-06-03T12:00:00.000Z')
    await app.handle(consume('pensa-chat', studentHeaders(user)))

    const res = await app.handle(consume('pensa-chat', studentHeaders(user)))
    const body = (await res.json()) as { allowed: boolean; scope?: string; usedMonth: number }
    expect(body.allowed).toBe(false)
    expect(body.scope).toBe('month')
    expect(body.usedMonth).toBe(3)

    // Mês NOVO zera (o dia 1º de julho é outro balde mensal).
    clockRef.now = new Date('2026-07-02T12:00:00.000Z')
    const fresh = await app.handle(consume('pensa-chat', studentHeaders(user)))
    const freshBody = (await fresh.json()) as { allowed: boolean; usedMonth: number }
    expect(freshBody.allowed).toBe(true)
    expect(freshBody.usedMonth).toBe(1)
  })

  test('a quota é da CONTA: perfis-irmãos dividem o teto', async () => {
    const { app } = buildApp({ internalToken: TOKEN, aiLimits: { daily: 2, monthly: 100 } })
    const account = randomUUID()
    const kidA = randomUUID()
    const kidB = randomUUID()

    await app.handle(consume('pensa-chat', studentHeaders(kidA, account)))
    await app.handle(consume('pensa-chat', studentHeaders(kidB, account)))

    const res = await app.handle(consume('pensa-chat', studentHeaders(kidA, account)))
    const body = (await res.json()) as { allowed: boolean; scope?: string }
    expect(body.allowed).toBe(false)
    expect(body.scope).toBe('day')
  })

  test('equipe (privileged) nunca é recusada, mas o uso é GRAVADO', async () => {
    const { app, aiUsage } = buildApp({
      internalToken: TOKEN,
      aiLimits: { daily: 1, monthly: 1 },
    })
    const staff = randomUUID()
    const headers = { ...studentHeaders(staff), 'x-auth-user-role': 'staff' }

    for (let i = 0; i < 3; i++) {
      const res = await app.handle(consume('pensa-chat', headers))
      const body = (await res.json()) as { allowed: boolean; unlimited?: boolean }
      expect(body.allowed).toBe(true)
      expect(body.unlimited).toBe(true)
    }
    const row = aiUsage.rows.find((r) => r.accountId === staff)
    expect(row?.used).toBe(3)
    expect(row?.privileged).toBe(true)
  })

  test('feature com formato inválido → 400; sem identidade → 401', async () => {
    const { app } = buildApp({ internalToken: TOKEN })
    const bad = await app.handle(consume('Pensa Chat!', studentHeaders(randomUUID())))
    expect(bad.status).toBe(400)
    const anon = await app.handle(consume('pensa-chat'))
    expect(anon.status).toBe(401)
  })
})

describe('GET /members/admin/ai-usage — agregados p/ o painel', () => {
  const adminHeaders = {
    'x-internal-token': TOKEN,
    'x-auth-user-id': randomUUID(),
    'x-auth-user-role': 'admin',
    'x-auth-user-status': 'active',
  }

  test('totais do mês + breakdown por feature + top contas', async () => {
    const { app } = buildApp({ internalToken: TOKEN, requireAdmin: true })
    const heavy = randomUUID()
    const light = randomUUID()
    await app.handle(consume('pensa-chat', studentHeaders(heavy)))
    await app.handle(consume('pensa-chat', studentHeaders(heavy)))
    await app.handle(consume('studio-describe', studentHeaders(light)))

    const res = await app.handle(
      new Request('http://local/members/admin/ai-usage', { headers: adminHeaders }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      monthUsed: number
      todayUsed: number
      accounts: number
      byFeature: { feature: string; used: number }[]
      topAccounts: { accountId: string; used: number }[]
    }
    expect(body.monthUsed).toBe(3)
    expect(body.todayUsed).toBe(3)
    expect(body.accounts).toBe(2)
    expect(body.byFeature).toEqual([
      { feature: 'pensa-chat', used: 2 },
      { feature: 'studio-describe', used: 1 },
    ])
    expect(body.topAccounts[0]).toMatchObject({ accountId: heavy, used: 2 })
  })

  test('mês inválido → 400; sem role admin → 403', async () => {
    const { app } = buildApp({ internalToken: TOKEN, requireAdmin: true })
    const bad = await app.handle(
      new Request('http://local/members/admin/ai-usage?month=2026-13', { headers: adminHeaders }),
    )
    expect(bad.status).toBe(400)
    // Sem role/status de admin (não passou pelo RBAC do gateway) → recusado
    // fail-closed (status AUSENTE = chamada que não veio da borda → 401).
    const student = await app.handle(
      new Request('http://local/members/admin/ai-usage', {
        headers: { 'x-internal-token': TOKEN, 'x-auth-user-id': randomUUID() },
      }),
    )
    expect(student.status).toBe(401)
  })
})
