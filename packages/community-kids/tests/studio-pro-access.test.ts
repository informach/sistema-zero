import { describe, expect, test } from 'bun:test'
import { resolveStudioProAccess } from '@/server/studio-pro-access'

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
        levelSlug: 'god',
      }),
    ).toEqual({ allowed: false, code: 'PROFILE_SESSION_REQUIRED' })
  })

  test('recusa acesso sem o produto ou sem a capacidade Pro', () => {
    expect(
      resolveStudioProAccess({ session: profileSession, studioAccess: false, levelSlug: 'god' }),
    ).toEqual({ allowed: false, code: 'STUDIO_ACCESS_REQUIRED' })

    expect(
      resolveStudioProAccess({ session: profileSession, studioAccess: true, levelSlug: 'noob' }),
    ).toEqual({ allowed: false, code: 'STUDIO_PRO_TIER_REQUIRED' })
  })

  test('libera somente o perfil com produto e tier Pro', () => {
    expect(
      resolveStudioProAccess({ session: profileSession, studioAccess: true, levelSlug: 'god' }),
    ).toEqual({ allowed: true })
  })
})
