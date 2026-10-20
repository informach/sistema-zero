import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { KIDS_CREATOR_CAPABILITIES } from '@sistemazero/core/journey'
import { buildApp } from '../helpers'

/**
 * The Kids app makes every login (staff included) pick a profile before Pinta, Molda, Pensa and
 * Estúdio. A staff account is therefore always in a profile session of its OWN account there.
 * Headers below are exactly what the gateway injects for that session (`kids.student` + `pfl`).
 */
const staffAccount = randomUUID()
const staffProfile = randomUUID()
const staffProfileSession = {
  'x-auth-user-id': staffProfile,
  'x-auth-account-id': staffAccount,
  'x-auth-profile-name': 'Perfil%20da%20Equipe',
  'x-auth-profile-public': 'false',
  'x-auth-user-role': 'admin',
  'x-auth-user-status': 'active',
  'x-auth-kids-context': 'student',
}

const get = (ctx: ReturnType<typeof buildApp>, path: string, headers: Record<string, string>) =>
  ctx.app.handle(new Request(`http://localhost/members${path}`, { headers }))

test('staff in a profile of its own account reads gamification as the full-capability preview', async () => {
  const ctx = buildApp()
  for (const role of ['staff', 'admin', 'superadmin']) {
    const response = await get(ctx, '/gamification/me?audience=kids&ranking=true', {
      ...staffProfileSession,
      'x-auth-user-role': role,
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.kidsPreview.kind).toBe('staff-preview')
    expect(body.kidsPreview.capabilities).toEqual([...KIDS_CREATOR_CAPABILITIES])
    expect(body).not.toHaveProperty('kidsJourney')
    expect(body).not.toHaveProperty('ranking')
    expect(body.coins.unlimited).toBe(true)
  }
  // The preview never reads (or fabricates) the profile's journey registry.
  expect(ctx.kidsJourneySnapshots.snapshotReads).toBe(3)
})

test('staff in a profile of its own account reads missions with the preview capabilities', async () => {
  const ctx = buildApp()
  const response = await get(ctx, '/gamification/missions/me?audience=kids', staffProfileSession)
  expect(response.status).toBe(200)
  const body = await response.json()
  expect(Array.isArray(body.daily)).toBe(true)
  expect(Array.isArray(body.weekly)).toBe(true)
  expect(Array.isArray(body.monthly)).toBe(true)
})

test('XP writes still land on the staff profile and show up in its preview', async () => {
  const ctx = buildApp()
  const activity = await ctx.app.handle(
    new Request('http://localhost/members/gamification/activity?audience=kids', {
      method: 'POST',
      headers: staffProfileSession,
    }),
  )
  expect(activity.status).toBe(200)
  const events = ctx.gamification.events.filter(
    (event: { userId: string }) => event.userId === staffProfile,
  )
  expect(events.length).toBeGreaterThan(0)
  expect(ctx.gamification.events.some((e: { userId: string }) => e.userId === staffAccount)).toBe(
    false,
  )
  const body = await (await get(ctx, '/gamification/me?audience=kids', staffProfileSession)).json()
  expect(body.xp).toBeGreaterThan(0)
  expect(body.kidsPreview.kind).toBe('staff-preview')
})

test('a support session stays refused, also inside a profile, and never gets the preview', async () => {
  const ctx = buildApp()
  const support: Record<string, string>[] = [
    { ...staffProfileSession, 'x-auth-impersonator-id': randomUUID() },
    { ...staffProfileSession, 'x-auth-impersonation-mode': 'write' },
    { ...staffProfileSession, 'x-auth-impersonation-mode': 'readonly' },
  ]
  for (const headers of support)
    for (const path of [
      '/gamification/me?audience=kids',
      '/gamification/missions/me?audience=kids',
    ]) {
      const response = await get(ctx, path, headers)
      expect(response.status).toBe(403)
      expect(await response.json()).not.toHaveProperty('kidsPreview')
    }
  expect(ctx.kidsJourneySnapshots.snapshotReads).toBe(0)
})

test('a customer profile is unchanged: real journey, never the preview', async () => {
  const ctx = buildApp()
  const customer = { ...staffProfileSession, 'x-auth-user-role': 'customer' }
  ctx.kidsJourneySnapshots.earned.set(staffProfile, {
    level: 'coder',
    capabilities: ['studio'],
    courseAccess: { entry: [], expanded: [], reward: [] },
  })
  const response = await get(ctx, '/gamification/me?audience=kids', customer)
  expect(response.status).toBe(200)
  const body = await response.json()
  expect(body).not.toHaveProperty('kidsPreview')
  expect(body.kidsJourney.earned.level).toBe('coder')
  expect(body.coins).not.toHaveProperty('unlimited')
  // A customer whose profile is not materialized stays unavailable (no preview fallback).
  const other = randomUUID()
  ctx.kidsJourneySnapshots.unavailableProfiles.add(other)
  const missing = await get(ctx, '/gamification/me?audience=kids', {
    ...customer,
    'x-auth-user-id': other,
  })
  expect(missing.status).toBe(503)
})
