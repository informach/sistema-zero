import { describe, expect, test } from 'bun:test'
import { safeStudyDestination } from '@sistemazero/member-shell/lib/study-access'
import { backToSection, MOBILE_NAV_ITEMS, NAV_ITEMS } from '../src/components/kids/nav'
import { isFocusRoutePath } from '../src/lib/focus-route'

describe('Oficinas navigation', () => {
  test('desktop follows Explorar and mobile keeps five tabs', () => {
    expect(NAV_ITEMS[NAV_ITEMS.findIndex((item) => item.href === '/cursos') + 1]?.href).toBe(
      '/oficinas',
    )
    expect(MOBILE_NAV_ITEMS).toHaveLength(5)
    expect(MOBILE_NAV_ITEMS.some((item) => item.href === '/oficinas')).toBe(false)
    expect(backToSection('/oficinas/aulas/a')).toMatchObject({ href: '/oficinas' })
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
