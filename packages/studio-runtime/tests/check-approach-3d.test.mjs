import { expect, spyOn, test } from 'bun:test'
import {
  approachObject3d,
  NavigationBlocked,
  planApproach3d,
} from '../runtime/check-approach-3d.mjs'

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

test.each([
  [true, false],
  [false, false],
  [true, true],
  [false, true],
])('objeto parado: quadros=%s, leitura lenta=%s', async (framesAdvance, slowRead) => {
  let now = 0,
    held = null
  const clock = spyOn(Date, 'now').mockImplementation(() => now)
  const page = {
    keyboard: {
      down: async (key) => {
        held = key
      },
      up: async () => {
        held = null
      },
    },
    waitForTimeout: async (ms) => {
      now += ms + (slowRead ? 1000 : 0)
    },
  }
  const values = {
    'personagem.position.x': 0,
    'personagem.position.y': 0,
    'personagem.position.z': 0,
    'personagem.userData.sz.hw': 0.5,
    'personagem.userData.sz.hh': 0.5,
    'personagem.userData.sz.hd': 0.5,
    'alvo.position.x': 10,
    'alvo.position.y': 0,
    'alvo.position.z': 0,
    'alvo.userData.sz.hw': 0.5,
    'alvo.userData.sz.hh': 0.5,
    'alvo.userData.sz.hd': 0.5,
  }
  const read = async (paths) =>
    paths.map((path) => ({
      found: true,
      value: {
        format: 'sz-observed-v1',
        value: [
          0,
          path.endsWith('._szWorld._frameNo')
            ? framesAdvance
              ? Math.floor(now / 40)
              : 0
            : values[path],
        ],
      },
    }))
  try {
    const pending = approachObject3d(
      page,
      {
        actorPath: 'personagem',
        targetPath: 'alvo',
        walkable: [{ minX: -1, maxX: 11, minZ: -1, maxZ: 1 }],
        timeoutMs: slowRead ? 7000 : 20000,
      },
      read,
    )
    if (framesAdvance) await expect(pending).rejects.toBeInstanceOf(NavigationBlocked)
    else await expect(pending).rejects.toThrow(slowRead ? 'tempo do teste' : 'quadros suficientes')
    expect(held).toBeNull()
  } finally {
    clock.mockRestore()
  }
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

test.each([
  1, 4, 8,
])('pulsos adaptativos respeitam a distância com velocidade %i', async (speed) => {
  let now = 0,
    x = 0,
    held = null
  const clock = spyOn(Date, 'now').mockImplementation(() => now)
  const durations = []
  const page = {
    keyboard: {
      down: async (key) => {
        held = key
      },
      up: async () => {
        held = null
      },
    },
    waitForTimeout: async (ms) => {
      now += ms
      if (held) {
        durations.push(ms)
        x += ((held === 'ArrowRight' ? 1 : -1) * speed * ms) / 1000
      }
    },
  }
  const values = {
    'personagem.position.y': 0,
    'personagem.position.z': 0,
    'personagem.userData.sz.hw': 0.5,
    'personagem.userData.sz.hh': 0.5,
    'personagem.userData.sz.hd': 0.5,
    'alvo.position.x': 10,
    'alvo.position.y': 0,
    'alvo.position.z': 0,
    'alvo.userData.sz.hw': 0.5,
    'alvo.userData.sz.hh': 0.5,
    'alvo.userData.sz.hd': 0.5,
  }
  const read = async (paths) =>
    paths.map((path) => ({
      found: true,
      value: {
        format: 'sz-observed-v1',
        value: [0, path === 'personagem.position.x' ? x : values[path]],
      },
    }))
  try {
    await approachObject3d(
      page,
      {
        actorPath: 'personagem',
        targetPath: 'alvo',
        walkable: [{ minX: -1, maxX: 11, minZ: -1, maxZ: 1 }],
        timeoutMs: 20000,
      },
      read,
    )
    expect(x).toBeGreaterThan(9)
    expect(x).toBeLessThan(10)
    expect(held).toBeNull()
    expect(durations.every((ms) => ms >= 16 && ms <= 600)).toBe(true)
    expect(durations.some((ms) => ms > 80)).toBe(true)
    // Longe do alvo o toque passa de 200 ms: menos idas e voltas de leitura por trecho.
    expect(durations.some((ms) => ms > 200)).toBe(true)
  } finally {
    clock.mockRestore()
  }
})
