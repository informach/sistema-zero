import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { ADULT_CREATOR_CAPABILITIES } from '@sistemazero/core/journey'
import { AccessCheckService } from '../../src/application/access-check/access-check.service'
import { assertAdultCreativeAccess } from '../../src/application/adult-journey/adult-creative-access'
import { resolveAdultLearnerId, resolveStudioFreeActor } from '../../src/interfaces/http/auth'
import { buildApp } from '../helpers'

/**
 * The adult community (member-shell `audience: 'adult'`) has no profile gate: a staff member uses
 * the account session itself. `getCreativeToolsState` needs 200 from `/members/access` (creative
 * refs), `/members/gamification/me` with `journey` and `/members/studio/unlocks`. Staging case:
 * no `adult_journey_policy` row yet (empty policy, version 0) and no adult license.
 */
const account = randomUUID()
const adultAdmin = (role = 'admin') => ({
  'x-auth-user-id': account,
  'x-auth-user-role': role,
  'x-auth-user-status': 'active',
  'x-auth-user-email': 'equipe@example.test',
  'x-auth-user-name': 'Equipe',
})
const get = (ctx: ReturnType<typeof buildApp>, path: string, headers: Record<string, string>) =>
  ctx.app.handle(new Request(`http://localhost/members${path}`, { headers }))

test('privileged adult account opens the creative tools gate with an empty policy and no license', async () => {
  for (const role of ['staff', 'admin', 'superadmin']) {
    const ctx = buildApp()
    expect(ctx.adultJourneyRepository.record).toBeNull()
    const access = await get(
      ctx,
      '/access?refs=estudio-completo,pinta,molda,pensa&audience=adult',
      adultAdmin(role),
    )
    expect(access.status).toBe(200)
    expect((await access.json()).access).toEqual({
      'estudio-completo': true,
      pinta: true,
      molda: true,
      pensa: true,
    })
    const gamification = await get(
      ctx,
      '/gamification/me?audience=adult&ranking=true',
      adultAdmin(role),
    )
    expect(gamification.status).toBe(200)
    const body = await gamification.json()
    expect(body.journey.capabilities).toEqual([...ADULT_CREATOR_CAPABILITIES])
    expect(body).not.toHaveProperty('kidsPreview')
    expect(body).not.toHaveProperty('ranking')
    const unlocks = await get(ctx, '/studio/unlocks?audience=adult', adultAdmin(role))
    expect(unlocks.status).toBe(200)
    expect(Array.isArray((await unlocks.json()).blocks)).toBe(true)
  }
})

test('the same calls for a customer with an empty policy stay locked (no regression)', async () => {
  const ctx = buildApp()
  const customer = { ...adultAdmin(), 'x-auth-user-role': 'customer' }
  const access = await get(ctx, '/access?refs=estudio-completo&audience=adult', customer)
  expect((await access.json()).access).toEqual({ 'estudio-completo': false })
  const body = await (await get(ctx, '/gamification/me?audience=adult', customer)).json()
  expect(body.journey.capabilities).toEqual([])
})

test('adult creative access lets privileged staff in without license or policy; customers are refused', async () => {
  const ctx = buildApp()
  const deps = {
    adultJourney: ctx.adultJourney,
    accessCheck: new AccessCheckService(ctx.entitlements, () => new Date()),
  }
  const actor = { userId: account, accountId: account, privileged: true }
  for (const tool of ['studio', 'pensa'] as const)
    await expect(assertAdultCreativeAccess(deps, actor, tool, true, true)).resolves.toBeUndefined()
  await expect(
    assertAdultCreativeAccess(deps, { ...actor, privileged: false }, 'studio'),
  ).rejects.toThrow()
})

test('a normal adult admin session passes the adult actor resolvers; Kids/support headers do not', () => {
  const headers = adultAdmin()
  expect(resolveAdultLearnerId(headers)).toBe(account)
  expect(resolveStudioFreeActor(headers, 'adult')).toEqual({
    userId: account,
    accountId: account,
    audience: 'adult',
    privileged: true,
    readOnly: false,
  })
  expect(() => resolveAdultLearnerId({ ...headers, 'x-auth-kids-context': 'parent' })).toThrow()
  expect(() => resolveAdultLearnerId({ ...headers, 'x-auth-account-id': randomUUID() })).toThrow()
  // Support keeps reading but never executes the free Studio (readOnly → service refusal).
  expect(
    resolveStudioFreeActor({ ...headers, 'x-auth-impersonator-id': randomUUID() }, 'adult')
      .readOnly,
  ).toBe(true)
})
