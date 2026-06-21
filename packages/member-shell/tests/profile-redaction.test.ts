import { describe, expect, test } from 'bun:test'
import { redactProfilesForProfileSession } from '../src/lib/profile-redaction'
import type { ProfileView } from '../src/lib/types'

const profiles: ProfileView[] = [
  {
    id: 'profile-active',
    name: 'Sofia',
    avatarUrl: null,
    whatsapp: '+5531999999999',
    birthDate: '2015-04-10',
    sortOrder: 0,
  },
  {
    id: 'profile-sibling',
    name: 'Theo',
    avatarUrl: null,
    whatsapp: '+5531888888888',
    birthDate: '2017-02-03',
    sortOrder: 1,
  },
]

describe('redactProfilesForProfileSession', () => {
  test('sessao da conta preserva todos os perfis como vieram', () => {
    expect(redactProfilesForProfileSession(profiles, null)).toBe(profiles)
  })

  test('sessao de perfil preserva o ativo e redige PII dos irmaos', () => {
    const active = profiles[0]!
    const sibling = profiles[1]!
    expect(redactProfilesForProfileSession(profiles, 'profile-active')).toEqual([
      active,
      { ...sibling, whatsapp: null, birthDate: null },
    ])
  })
})
