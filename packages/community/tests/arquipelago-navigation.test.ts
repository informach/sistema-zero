import { expect, test } from 'bun:test'
import { NAV_ITEMS, visibleCommunityNav } from '../src/components/community/nav'

test('Arquipélago só aparece quando o serviço libera a comunidade adulta', () => {
  expect(visibleCommunityNav(NAV_ITEMS, false).some((item) => item.href === '/arquipelago')).toBe(
    false,
  )
  expect(visibleCommunityNav(NAV_ITEMS, true).some((item) => item.href === '/arquipelago')).toBe(
    true,
  )
})
