import { expect, test } from 'bun:test'
import {
  activeHref,
  canAccessSection,
  hrefForPlatform,
  pathIsPlatformScoped,
  visibleGroups,
} from '../src/components/admin/nav'

const path = '/admin/professor/jornada-kids'

test('one Jornada entry reaches the Kids policy and the Adult journey, readable by staff', () => {
  for (const role of ['superadmin', 'admin', 'staff']) {
    const items = visibleGroups(role).flatMap((group) => group.items)
    const jornada = items.find((item) => item.href === path)
    expect(jornada?.label).toBe('Jornada')
    expect(jornada && hrefForPlatform(jornada, 'kids')).toBe(path)
    expect(jornada && hrefForPlatform(jornada, 'adult')).toBe('/admin/professor/jornada-adulta')
    expect(canAccessSection(role, path)).toBe(true)
    expect(canAccessSection(role, '/admin/professor/jornada-adulta')).toBe(true)
  }
})

test('Kids policy keeps its own active navigation and platform scope while resuming a preparation', () => {
  expect(activeHref(path)).toBe(path)
  expect(pathIsPlatformScoped(path)).toBe(true)
})
