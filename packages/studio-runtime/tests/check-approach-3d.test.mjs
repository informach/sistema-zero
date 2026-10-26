import { expect, test } from 'bun:test'
import { planApproach3d } from '../runtime/check-approach-3d.mjs'

const floor = [
  { minX: -11, maxX: 0.6, minZ: -5, maxZ: 5 },
  { minX: 0.6, maxX: 4, minZ: 0.4, maxZ: 1.1 },
  { minX: 4, maxX: 6.1, minZ: -0.5, maxZ: 1.7 },
]
const actor = { x: -6.5, y: 0.8, z: 0.75, hw: 0.4, hh: 0.8, hd: 0.35 }
test('3D route follows the bridge and the actual position; height cannot be faked by the image', () => {
  const farol = { x: 5.2, y: 2, z: 0.1, hw: 0.6, hh: 2, hd: 0.6 }
  const key = { x: -3, y: 1, z: -2, hw: 0.5, hh: 0.5, hd: 0.3 }
  for (const target of [farol, key, { ...key, x: -7, z: 3 }]) {
    const route = planApproach3d(actor, target, floor)
    expect(route.length).toBeGreaterThan(1)
    for (const p of route)
      expect(
        floor.some((r) => p.x >= r.minX && p.x <= r.maxX && p.z >= r.minZ && p.z <= r.maxZ),
      ).toBe(true)
  }
  expect(() => planApproach3d(actor, { ...key, y: 4 }, floor)).toThrow('altura')
  expect(() => planApproach3d(actor, { ...key, x: 50 }, floor)).toThrow('caminho')
  expect(planApproach3d(actor, farol, floor, [key]).length).toBeGreaterThan(1)
})

test('route from the key crosses the narrow bridge away from its edges', () => {
  const farol = { x: 5.2, y: 2, z: 0.1, hw: 0.6, hh: 2, hd: 0.6 }
  const route = planApproach3d({ ...actor, x: -3.75, z: -1.5 }, farol, floor)
  // Sample segments, not just turns: the union must keep its junctions connected.
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1],
      b = route[i]
    for (let t = 0; t <= 1; t += 0.05) {
      const x = a.x + (b.x - a.x) * t,
        z = a.z + (b.z - a.z) * t
      for (const dx of [-0.22, 0.22])
        for (const dz of [-0.22, 0.22])
          expect(
            floor.some(
              (r) => x + dx >= r.minX && x + dx <= r.maxX && z + dz >= r.minZ && z + dz <= r.maxZ,
            ),
          ).toBe(true)
    }
  }
})
