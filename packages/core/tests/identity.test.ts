import { expect, test } from 'bun:test'
import {
  DEFAULT_USER_ROLE,
  IDENTITY_UUID_PATTERN,
  IdentityUuidSchema,
  isTeamRole,
  isUserRole,
  SUPERADMIN_ONLY,
  TEAM_ADMIN_ROLES,
  TEAM_ROLES,
  USER_ROLES,
} from '../src/identity'

test('identity UUID preserves the existing hex-format contract and canonical lowercase', () => {
  for (const id of [
    'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA',
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
    '01234567-89AB-4DEF-8123-456789ABCDEF',
  ]) {
    expect(new RegExp(IDENTITY_UUID_PATTERN).test(id)).toBe(true)
    expect(IdentityUuidSchema.parse(id)).toBe(id.toLowerCase())
  }
  for (const invalid of [
    '',
    ' aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaag',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\n',
  ])
    expect(IdentityUuidSchema.safeParse(invalid).success).toBe(false)
})

test('a lista única de papéis e os grupos da equipe', () => {
  expect([...USER_ROLES]).toEqual(['superadmin', 'admin', 'staff', 'customer'])
  expect(DEFAULT_USER_ROLE).toBe('customer')
  expect([...TEAM_ROLES]).toEqual(['superadmin', 'admin', 'staff'])
  expect([...TEAM_ADMIN_ROLES]).toEqual(['superadmin', 'admin'])
  expect([...SUPERADMIN_ONLY]).toEqual(['superadmin'])
  for (const role of USER_ROLES) expect(isUserRole(role)).toBe(true)
  for (const valor of ['Admin', 'gestao', 'professor', '', null, 1])
    expect(isUserRole(valor)).toBe(false)
  expect(TEAM_ROLES.every((role) => isTeamRole(role))).toBe(true)
  expect(isTeamRole('customer')).toBe(false)
})
