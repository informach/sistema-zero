import { expect, test } from '@playwright/test'
import type { PintaScene, PintaSceneObject } from '@sistemazero/core/studio/pinta-scene'
import type { SceneBox } from '@sistemazero/core/studio/pinta-scene-geometry'

type Game = {
  surface: { context: CanvasRenderingContext2D }
  hero: { x: number; y: number; body: { reset(x: number, y: number): void } }
  physics: { world: { gravity: { y: number } } }
  maps: {
    mapSize(name: string, axis: string): number
    mapObjects(name: string, type: string): PintaSceneObject[]
    useMapDoor(name: string, sprite: Game['hero'], door: PintaSceneObject): void
    createMapScene(name: string, asset: string): void
    mapResourceImage(name: string, id: string): string | null
    mapLayerProperty(name: string, id: string, key: string): unknown
    mapTileProperty(name: string, id: string, tile: number, key: string): unknown
    mapObjectById(name: string, id: string): { name: string } | null
  }
}

test('Phaser: plataforma precisa permite salto, pouso e vista de cima sem grade arredondada', async ({
  page,
  request,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('http://127.0.0.1:5293/platforms/')
  await expect.poll(() => page.evaluate(() => !!window.pintaGame)).toBe(true)
  const fixture = (await (
    await request.get('http://127.0.0.1:5293/platforms/platform-probes.json')
  ).json()) as {
    cases: {
      name: string
      scene: PintaScene
      previous: SceneBox
      desired: SceneBox
      gravity: number
      result: SceneBox | null
    }[]
  }
  const probes = await page.evaluate(({ cases }) => {
    const land = (
      window as unknown as {
        scenePlatformLanding: (
          scene: PintaScene,
          previous: SceneBox,
          desired: SceneBox,
          gravity: number,
        ) => SceneBox | null
      }
    ).scenePlatformLanding
    return cases.map((item) => ({
      name: item.name,
      expected: item.result,
      actual: land(item.scene, item.previous, item.desired, item.gravity),
    }))
  }, fixture)
  for (const probe of probes) {
    if (probe.expected === null) expect(probe.actual, probe.name).toBeNull()
    else {
      expect(probe.actual, probe.name).not.toBeNull()
      for (const key of ['x', 'y', 'width', 'height'] as const)
        expect(probe.actual![key], `${probe.name}.${key}`).toBeCloseTo(probe.expected[key], 5)
    }
  }
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  const performanceResult = await page.evaluate(({ cases }) => {
    const land = (
      window as unknown as {
        scenePlatformLanding: (
          scene: PintaScene,
          previous: SceneBox,
          desired: SceneBox,
          gravity: number,
        ) => SceneBox | null
      }
    ).scenePlatformLanding
    const times: number[] = []
    for (let i = 0; i < 101; i++) {
      const start = performance.now()
      for (const item of cases) land(item.scene, item.previous, item.desired, item.gravity)
      if (i) times.push(performance.now() - start)
    }
    times.sort((a, b) => a - b)
    return {
      cpuRate: 4,
      cases: cases.length,
      batches: times.length,
      medianMs: times[50],
      p95Ms: times[94],
      maxMs: times[99],
    }
  }, fixture)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  await cdp.detach()
  expect(performanceResult.p95Ms).toBeLessThan(16.7)
  await page.evaluate(() => {
    window.pintaGame.physics.world.gravity.y = 300
    window.pintaGame.hero.body.reset(40, 10)
  })
  await page.keyboard.down('ArrowDown')
  await expect.poll(() => page.evaluate(() => window.pintaGame.hero.y)).toBeGreaterThan(28)
  await page.waitForTimeout(350)
  const normal = await page.evaluate(() => window.pintaGame.hero.y)
  await page.keyboard.up('ArrowDown')
  expect(normal).toBeCloseTo(28.25, 3)
  await page.evaluate(() => window.pintaGame.hero.body.reset(40, 60))
  await page.keyboard.down('ArrowUp')
  await expect.poll(() => page.evaluate(() => window.pintaGame.hero.y)).toBeLessThan(25)
  await page.keyboard.up('ArrowUp')
  await page.evaluate(() => {
    window.pintaGame.physics.world.gravity.y = -300
    window.pintaGame.hero.body.reset(40, 70)
  })
  await page.keyboard.down('ArrowUp')
  await expect.poll(() => page.evaluate(() => window.pintaGame.hero.y)).toBeLessThan(43)
  await page.waitForTimeout(350)
  const inverted = await page.evaluate(() => window.pintaGame.hero.y)
  await page.keyboard.up('ArrowUp')
  expect(inverted).toBeCloseTo(42.25, 3)
  await page.evaluate(() => {
    window.pintaGame.physics.world.gravity.y = 0
    window.pintaGame.hero.body.reset(40, 10)
  })
  await page.keyboard.down('ArrowDown')
  await expect.poll(() => page.evaluate(() => window.pintaGame.hero.y)).toBeGreaterThan(50)
  await page.keyboard.up('ArrowDown')
  expect(errors).toEqual([])
  await info.attach('plataforma-phaser', {
    body: JSON.stringify({ normal, inverted, probes, performance: performanceResult }),
    contentType: 'application/json',
  })
  await info.attach('plataforma-phaser-imagem', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
})

test('Phaser: cena 3 consulta os contornos e barra movimento através de parede fina', async ({
  page,
  request,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('http://127.0.0.1:5293/physics/')
  await expect.poll(() => page.evaluate(() => !!window.pintaGame)).toBe(true)
  const fixture = await (await request.get('http://127.0.0.1:5293/physics-probes.json')).json()
  const result = await page.evaluate(({ scene, probes }) => {
    const query = (
      window as unknown as { sceneIntersectsBox: (scene: unknown, box: unknown) => boolean }
    ).sceneIntersectsBox
    return probes.map((p: { name: string; box: unknown; blocked: boolean }) => ({
      name: p.name,
      expected: p.blocked,
      actual: query(scene, p.box),
    }))
  }, fixture)
  for (const probe of result) expect(probe.actual, probe.name).toBe(probe.expected)
  // CPU throttling is a simulation on this machine, not a physical phone result.
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  const performanceResult = await page.evaluate(({ scene, probes }) => {
    const query = (
      window as unknown as { sceneIntersectsBox: (scene: unknown, box: unknown) => boolean }
    ).sceneIntersectsBox
    const times: number[] = []
    for (let iteration = 0; iteration < 101; iteration++) {
      const start = performance.now()
      for (const probe of probes) query(scene, probe.box)
      if (iteration) times.push(performance.now() - start)
    }
    times.sort((a, b) => a - b)
    return {
      cpuRate: 4,
      bodies: probes.length,
      batches: times.length,
      medianMs: times[50]!,
      p95Ms: times[94]!,
      maxMs: times[99]!,
    }
  }, fixture)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  await cdp.detach()
  expect(performanceResult.p95Ms).toBeLessThan(16.7)
  await page.evaluate(() => window.pintaGame.hero.body.reset(10, 28))
  await page.keyboard.down('ArrowRight')
  await page.waitForTimeout(800)
  await page.keyboard.up('ArrowRight')
  const x = await page.evaluate(() => window.pintaGame.hero.x)
  expect(x).toBeGreaterThan(27.9)
  expect(x).toBeLessThanOrEqual(28.01)
  expect(errors).toEqual([])
  await info.attach('contornos-phaser', {
    body: JSON.stringify({ probes: result, x, performance: performanceResult }),
    contentType: 'application/json',
  })
  await info.attach('contornos-phaser-imagem', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
})

test('Phaser resolve portas por ID e conserva a escolha explícita pelo nome do mapa', async ({
  page,
  request,
}) => {
  const scenes = (await (await request.get('http://127.0.0.1:5293/maps.json')).json()) as Record<
    string,
    PintaScene
  >
  const withCollision = {
    ...scenes,
    cabana: scenes['vila-e-floresta']!,
    'cabana-by-id': scenes.cabana!,
  }
  await page.route('http://127.0.0.1:5293/main.js', async (route) => {
    const response = await route.fetch()
    const source = await response.text()
    const prefix = `const PINTA_MAPS=${JSON.stringify(scenes)};`
    expect(source.startsWith(prefix)).toBe(true)
    await route.fulfill({
      response,
      body: source.replace(prefix, `const PINTA_MAPS=${JSON.stringify(withCollision)};`),
    })
  })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('http://127.0.0.1:5293/')
  await expect.poll(() => page.evaluate(() => !!window.pintaGame)).toBe(true)
  const widths = await page.evaluate(() => {
    const { maps, hero } = window.pintaGame
    maps.createMapScene('mapa', 'cabana')
    const named = maps.mapSize('mapa', 'width')
    const door = maps.mapObjects('mapa', 'door')[0]!
    hero.body.reset(door.x, door.y)
    maps.useMapDoor('mapa', hero, {
      ...door,
      properties: { destino: { type: 'asset', value: 'cabana' } },
    })
    return { named, destination: maps.mapSize('mapa', 'width') }
  })
  expect(widths).toEqual({ named: 512, destination: 128 })
  expect(errors).toEqual([])
})

test('Phaser portátil anima a versão fixada e conserva o último quadro', async ({
  page,
  request,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.clock.setFixedTime(1000)
  await page.goto('http://127.0.0.1:5293/resources/')
  await expect.poll(() => page.evaluate(() => !!window.pintaGame)).toBe(true)
  await page.evaluate(() => window.pintaGame.maps.createMapScene('mapa', 'recursos-qa'))
  const scenes = (await (
    await request.get('http://127.0.0.1:5293/resources/maps.json')
  ).json()) as Record<string, PintaScene>
  const sample = scenes['recursos-qa']!
  const references = await page.evaluate(
    async ({ layer, tileset }) => {
      const maps = window.pintaGame.maps
      const id = maps.mapLayerProperty('mapa', layer, 'resource')
      const url = maps.mapResourceImage('mapa', String(id))
      if (!url) throw new Error('Property-only resource missing')
      const image = new Image()
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = reject
        image.src = url
      })
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      return {
        pixel: [...ctx.getImageData(8, 8, 1, 1).data],
        score: maps.mapLayerProperty('mapa', layer, 'score'),
        allowed: maps.mapTileProperty('mapa', tileset, 0, 'allowed'),
        empty: maps.mapTileProperty('mapa', tileset, 0, 'empty'),
        related: maps.mapObjectById(
          'mapa',
          String(maps.mapTileProperty('mapa', tileset, 0, 'related')),
        )?.name,
        missing: maps.mapResourceImage('mapa', 'missing'),
      }
    },
    { layer: sample.layers[0]!.id, tileset: sample.tilesets[0]!.id },
  )
  expect(references).toEqual({
    pixel: [255, 255, 0, 255],
    score: 0,
    allowed: false,
    empty: '',
    related: 'Árvore QA',
    missing: null,
  })
  const samples: number[][] = []
  for (const [time, expected] of [
    [1000, [255, 0, 0, 255]],
    [1300, [0, 255, 0, 255]],
    [1600, [0, 0, 255, 255]],
    [11000, [0, 0, 255, 255]],
  ] as const) {
    await page.clock.setFixedTime(time)
    const read = () =>
      page.evaluate(() => [...window.pintaGame.surface.context.getImageData(24, 24, 1, 1).data])
    await expect.poll(read).toEqual([...expected])
    samples.push(await read())
  }
  expect(errors).toEqual([])
  await info.attach('phaser-resource-frames', {
    body: JSON.stringify(samples),
    contentType: 'application/json',
  })
})
declare global {
  interface Window {
    pintaGame: Game
  }
}

test('Phaser portátil renderiza o mapa real, anda, colide e atravessa portas', async ({
  page,
  request,
}, testInfo) => {
  const errors: string[] = []
  const external: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (req) => {
    if (new URL(req.url()).origin !== 'http://127.0.0.1:5293') external.push(req.url())
  })
  const response = await request.get('http://127.0.0.1:5293/maps.json')
  const scenes = (await response.json()) as Record<string, PintaScene>
  const vila = scenes['vila-e-floresta']!
  expect(vila.layers).toHaveLength(18)
  expect(vila.tilesets).toHaveLength(2)
  expect(vila.layers.some((l) => l.kind === 'tiles' && l.front)).toBe(true)
  await page.goto('http://127.0.0.1:5293/')
  await expect.poll(() => page.evaluate(() => !!window.pintaGame)).toBe(true)
  await expect(page.locator('canvas')).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(window.pintaGame.surface.context.getImageData(33, 33, 1, 1).data),
      ),
    )
    .toEqual([74, 222, 128, 255])
  const water = () =>
    page.evaluate(() =>
      Array.from(window.pintaGame.surface.context.getImageData(28 * 16, 14 * 16, 16, 16).data).join(
        ',',
      ),
    )
  const firstWater = await water()
  await expect.poll(water).not.toBe(firstWater)
  expect(
    await page.evaluate(() => window.pintaGame.maps.mapObjects('mapa', 'door').map((o) => o.name)),
  ).toContain('Porta da cabana')
  const start = await page.evaluate(() => window.pintaGame.hero.y)
  await page.keyboard.down('ArrowDown')
  await expect.poll(() => page.evaluate(() => window.pintaGame.hero.y)).toBeGreaterThan(start + 10)
  await page.keyboard.up('ArrowDown')
  // A frente cobre o personagem sob o telhado, no canvas real do Phaser.
  await page.evaluate(async () => {
    window.pintaGame.hero.body.reset(88, 40)
    await new Promise<void>((done) =>
      requestAnimationFrame(() => requestAnimationFrame(() => done())),
    )
  })
  await expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(window.pintaGame.surface.context.getImageData(89, 41, 1, 1).data),
      ),
    )
    .not.toEqual([74, 222, 128, 255])
  // Exercita a física real contra a parede da casa em x=80 (não uma grade mockada).
  await page.evaluate(() => window.pintaGame.hero.body.reset(64, 68))
  await page.keyboard.down('ArrowRight')
  await page.waitForTimeout(350)
  await page.keyboard.up('ArrowRight')
  expect(await page.evaluate(() => window.pintaGame.hero.x)).toBeLessThanOrEqual(68.1)
  await page.evaluate(() => window.pintaGame.hero.body.reset(96, 96))
  await expect
    .poll(() => page.evaluate(() => window.pintaGame.maps.mapSize('mapa', 'width')))
    .toBe(scenes.cabana!.cols * scenes.cabana!.tileSize)
  await page.evaluate(() => window.pintaGame.hero.body.reset(80, 32))
  await expect
    .poll(() => page.evaluate(() => window.pintaGame.maps.mapSize('mapa', 'width')))
    .toBe(vila.cols * vila.tileSize)
  expect(errors).toEqual([])
  expect(external).toEqual([])
  await testInfo.attach('phaser-vila', { body: await page.screenshot(), contentType: 'image/png' })
})
