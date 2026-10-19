import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp } from '../helpers'

const profileId = randomUUID(),
  accountId = randomUUID()
const headers = {
  'x-auth-user-id': profileId,
  'x-auth-account-id': accountId,
  'x-auth-kids-context': 'student',
}

test('Kids gamification exposes the canonical earned floor and policy requirements without consulting the old engine', async () => {
  const ctx = buildApp()
  ctx.kidsJourneySnapshots.earned.set(profileId, {
    level: 'coder',
    capabilities: ['studio', 'pro'],
    courseAccess: { entry: ['avancado-3d'], expanded: [], reward: [] },
  })
  const policy = ctx.kidsJourneySnapshots.policy
  ctx.kidsJourneySnapshots.policy = {
    ...policy,
    steps: policy.steps.map((step) => ({ ...step, capabilities: [] })),
  }
  const response = await ctx.app.handle(
    new Request('http://localhost/members/gamification/me?audience=kids', { headers }),
  )
  expect(response.status).toBe(200)
  const body = await response.json()
  expect(body.level.slug).toBe('coder')
  expect(body.kidsJourney.earned).toMatchObject({ level: 'coder', capabilities: ['studio', 'pro'] })
  expect(body.kidsJourney.policyVersion).toBe(1)
  expect(body).not.toHaveProperty('kidsPreview')
  expect(ctx.gamification.qualifyingJourneySlotReads).toBe(0)
  expect(ctx.kidsJourneySnapshots.snapshotReads).toBe(1)
})

test('missing materialized membership is unavailable instead of a zero-rank child', async () => {
  const ctx = buildApp()
  ctx.kidsJourneySnapshots.unavailableProfiles.add(profileId)
  const response = await ctx.app.handle(
    new Request('http://localhost/members/gamification/me?audience=kids', { headers }),
  )
  expect(response.status).toBe(503)
  const body = await response.json()
  expect(body).not.toHaveProperty('level')
  expect(body).not.toHaveProperty('kidsJourney')
})

test('team metadata has no virtual rank/earned and requires the trusted own-account preview boundary', async () => {
  const ctx = buildApp()
  const own = {
    'x-auth-user-id': accountId,
    'x-auth-user-role': 'staff',
    'x-auth-user-status': 'active',
  }
  for (const context of [undefined, 'parent']) {
    const requestHeaders: Record<string, string> = { ...own }
    if (context) requestHeaders['x-auth-kids-context'] = context
    const response = await ctx.app.handle(
      new Request('http://localhost/members/gamification/me?audience=kids&ranking=true', {
        headers: requestHeaders,
      }),
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.level).toBeNull()
    expect(body.kidsPreview.kind).toBe('staff-preview')
    expect(body).not.toHaveProperty('kidsJourney')
    expect(body.kidsPreview).not.toHaveProperty('earned')
    expect(body).not.toHaveProperty('ranking')
  }
  const deniedHeaders: Record<string, string>[] = [
    { 'x-auth-account-id': accountId },
    { 'x-auth-kids-context': 'student' },
    { 'x-auth-impersonation-mode': 'write' },
  ]
  for (const extra of deniedHeaders) {
    const response = await ctx.app.handle(
      new Request('http://localhost/members/gamification/me?audience=kids', {
        headers: { ...own, ...extra },
      }),
    )
    expect(response.status).toBe(403)
  }
})

test('Admin inspection resolves a zero-XP profile owner from the registry and never fabricates accountId=profileId', async () => {
  const ctx = buildApp()
  ctx.kidsJourneySnapshots.owners.set(profileId, accountId)
  ctx.kidsJourneySnapshots.earned.set(profileId, {
    level: 'hacker',
    capabilities: ['ai', 'pensa'],
    courseAccess: { entry: [], expanded: [], reward: [] },
  })
  const admin = {
    'x-auth-user-id': randomUUID(),
    'x-auth-user-role': 'admin',
    'x-auth-user-status': 'active',
  }
  const response = await ctx.app.handle(
    new Request(`http://localhost/members/admin/members/${profileId}/gamification?audience=kids`, {
      headers: admin,
    }),
  )
  expect(response.status).toBe(200)
  const body = await response.json()
  expect(body.xp).toBe(0)
  expect(body.level.slug).toBe('hacker')
  // Active seed grants studio/pinta at coder and ai/pensa at hacker; the earned hacker floor preserves both steps.
  expect(body.kidsJourney.earned.capabilities).toEqual(['studio', 'pinta', 'ai', 'pensa'])
  expect(body).not.toHaveProperty('ranking')
  const unknown = await ctx.app.handle(
    new Request(
      `http://localhost/members/admin/members/${randomUUID()}/gamification?audience=kids`,
      { headers: admin },
    ),
  )
  expect(unknown.status).toBe(503)
})
