import { expect, test } from 'bun:test'
import { IdentityUuidSchema, IDENTITY_UUID_PATTERN } from '../src/identity'

test('identity UUID preserves the existing hex-format contract and canonical lowercase', () => {
  for (const id of ['AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA',
    '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
    'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF', '01234567-89AB-4DEF-8123-456789ABCDEF']) {
    expect(new RegExp(IDENTITY_UUID_PATTERN).test(id)).toBe(true)
    expect(IdentityUuidSchema.parse(id)).toBe(id.toLowerCase())
  }
  for (const invalid of ['', ' aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaag', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\n'])
    expect(IdentityUuidSchema.safeParse(invalid).success).toBe(false)
})
