import { describe, expect, test } from 'bun:test'
import { resolveStudioProAccess } from '@/server/studio-pro-access'
import { kidsView, kidsStaffPreview } from './kids-journey-fixtures'

const profileSession = {
  id: 'profile-1',
  role: 'student',
  activeProfile: { accountId: 'account-1', name: 'Ana' },
}

describe('resolveStudioProAccess', () => {
  test('recusa a sessão da conta sem perfil ativo', () => {
    expect(
      resolveStudioProAccess({
        session: { role: 'student' },
        studioAccess: true,
        journey: kidsView(['studio', 'pro']),
      }),
    ).toEqual({ allowed: false, code: 'PROFILE_SESSION_REQUIRED' })
  })

  test('recusa acesso sem o produto ou sem a capacidade Pro', () => {
    expect(
      resolveStudioProAccess({ session: profileSession, studioAccess: false, journey: kidsView(['studio', 'pro']) }),
    ).toEqual({ allowed: false, code: 'STUDIO_ACCESS_REQUIRED' })

    expect(
      resolveStudioProAccess({ session: profileSession, studioAccess: true, journey: kidsView([], 'god') }),
    ).toEqual({ allowed: false, code: 'STUDIO_PRO_TIER_REQUIRED' })
  })

  test('libera somente o perfil com produto e tier Pro', () => {
    expect(
      resolveStudioProAccess({ session: profileSession, studioAccess: true, journey: kidsView(['studio', 'pro']) }),
    ).toEqual({ allowed: true })
  })
})


test('Pro policy unavailable is explicit even for a previously capable child', () => {
  expect(resolveStudioProAccess({ session: profileSession, studioAccess: true, journey: null }))
    .toEqual({ allowed: false, code: 'JOURNEY_UNAVAILABLE' })
})

test('own-account team preview opens Pro without simulating a student; a profile cannot use that preview', () => {
  expect(resolveStudioProAccess({ session: { role: 'staff' }, studioAccess: true, journey: kidsStaffPreview }))
    .toEqual({ allowed: true })
  expect(resolveStudioProAccess({ session: profileSession, studioAccess: true, journey: kidsStaffPreview }))
    .toEqual({ allowed: false, code: 'PROFILE_SESSION_REQUIRED' })
  expect(resolveStudioProAccess({ session: { role: 'staff' }, studioAccess: true, journey: null }))
    .toEqual({ allowed: false, code: 'PROFILE_SESSION_REQUIRED' })
})
