import { describe, expect, test } from 'bun:test'
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../src/lib/cookies'

describe('nomes dos cookies DESTE app', () => {
  test('kids usa sz_kids_* (≠ sz_member_* do community — jar dividido em dev)', () => {
    // NODE_ENV=test → sem prefixo __Host- (helpers testados no member-shell).
    expect(ACCESS_COOKIE).toBe('sz_kids_access')
    expect(REFRESH_COOKIE).toBe('sz_kids_refresh')
  })
})
