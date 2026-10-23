import { expect, test } from 'bun:test'
import {
  activeHref,
  canAccessSection,
  pathIsPlatformScoped,
  visibleGroups,
} from '../src/components/admin/nav'

const path = '/admin/professor/jornada-kids'

test('canonical Kids policy has its own staff-readable navigation entry without replacing Adult', () => {
  for (const role of ['superadmin', 'admin', 'staff']) {
    const items = visibleGroups(role).flatMap((group) => group.items)
    expect(items.find((item) => item.href === path)?.label).toBe('Jornada Kids')
    expect(items.some((item) => item.href === '/admin/professor/jornada-adulta')).toBe(true)
    expect(canAccessSection(role, path)).toBe(true)
  }
})

test('Kids policy keeps its own active navigation and platform scope while resuming a preparation', () => {
  expect(activeHref(path)).toBe(path)
  expect(pathIsPlatformScoped(path)).toBe(true)
})
