import { describe, expect, test } from 'bun:test'
import { safeStudyDestination } from '@sistemazero/member-shell/lib/study-access'
import {
  backToSection,
  MOBILE_NAV_ITEMS,
  NAV_ITEMS,
  visibleNavItems,
} from '../src/components/kids/nav'
import { isFocusRoutePath } from '../src/lib/focus-route'

describe('Oficinas navigation', () => {
  test('desktop follows Explorar and mobile includes the game', () => {
    expect(NAV_ITEMS[NAV_ITEMS.findIndex((item) => item.href === '/cursos') + 1]?.href).toBe(
      '/oficinas',
    )
    expect(MOBILE_NAV_ITEMS).toHaveLength(6)
    expect(MOBILE_NAV_ITEMS.find((item) => item.href === '/arquipelago')?.mobileLabel).toBe('Jogo')
    expect(MOBILE_NAV_ITEMS.some((item) => item.href === '/oficinas')).toBe(false)
    expect(backToSection('/oficinas/aulas/a')).toMatchObject({ href: '/oficinas' })
  })
  test('the game appears on both menus only when the service allows it', () => {
    for (const items of [NAV_ITEMS, MOBILE_NAV_ITEMS]) {
      expect(visibleNavItems(items, false).some((item) => item.href === '/arquipelago')).toBe(false)
      expect(visibleNavItems(items, true).some((item) => item.href === '/arquipelago')).toBe(true)
    }
  })
  test('only the classroom collapses the menu', () => {
    expect(isFocusRoutePath('/oficinas')).toBe(false)
    expect(isFocusRoutePath('/oficinas/aulas/a')).toBe(true)
  })
  test('student entry keeps a classroom destination without allowing parent traversal', () => {
    expect(safeStudyDestination('/oficinas/aulas/a')).toBe('/oficinas/aulas/a')
    expect(safeStudyDestination('/oficinas/../pais')).toBe('/')
  })
})
