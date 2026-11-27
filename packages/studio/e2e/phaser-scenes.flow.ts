import { expect, type Page, test } from '@playwright/test'
import type { PintaRegionSceneWire } from '@sistemazero/core/studio/pinta-region-scene'
import type { PintaSceneObject } from '@sistemazero/core/studio/pinta-scene'

type Game = {
  surface: { context: CanvasRenderingContext2D }
  maps: {
    mapObjects(name: string, type?: string): PintaSceneObject[]
    mapResourceImage(name: string, id: string): string | null
    mapLayerProperty(name: string, id: string, key: string): unknown
    mapTileProperty(name: string, id: string, tile: number, key: string): unknown
    mapObjectById(name: string, id: string): { name: string } | null
  }
  player: {
    position: { x: number; y: number }
    scene: { id: string; name: string }
    platformer: boolean
  }
}
declare global {
  interface Window {
    pintaGame: Game
  }
}
const origin = 'http://127.0.0.1:5293'

/** Change the input start marker, never add a teleport API to the shipped player. */
async function loadAt(page: Page, path: string, x: number, y: number) {
  await page.unroute('**/maps.json')
  await page.route('**/maps.json', async (route) => {
    const response = await route.fetch()
    const maps = (await response.json()) as Record<string, PintaRegionSceneWire>
    const scene = Object.values(maps)[0]!
    const layer = scene.layers.find((item) => item.kind === 'objects')
    if (!layer || layer.kind !== 'objects') throw Error('A fixture perdeu os objetos.')
    layer.objects = layer.objects.filter((item) => item.role !== 'start' && item.type !== 'inicio')
    layer.objects.unshift({
      id: 'qa-start',
      name: 'Começo QA',
      type: '',
      shape: 'point',
      role: 'start',
      x,
      y,
      width: 0,
      height: 0,
      properties: {},
    })
    await route.fulfill({ response, json: maps })
  })
  await page.goto(origin + path)
  await expect.poll(() => page.evaluate(() => !!window.pintaGame)).toBe(true)
}

async function profileQueries(page: Page, fixture: unknown, landing: boolean) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  try {
    const result = await page.evaluate(
      async ({ fixture, landing }) => {
        const url = '/qa-scene.js',
          qa = await import(url)
        const cases: Array<Record<string, unknown> & { scene: unknown }> = landing
          ? (fixture.cases as Array<Record<string, unknown> & { scene: unknown }>)
          : fixture.probes.map((probe: object) => ({
              ...probe,
              scene: qa.regionalGeometryFixture(fixture.scene),
            }))
        const queries = cases.map((item: { scene: unknown }) =>
          qa.createRegionSceneQueries(qa.readPintaRegionScene(JSON.stringify(item.scene))),
        )
        const times: number[] = []
        for (let iteration = 0; iteration < 101; iteration++) {
          const start = performance.now()
          for (let i = 0; i < cases.length; i++) {
            const item = cases[i]!,
              query = queries[i]
            if (landing) query.platformLanding(item.previous, item.desired, item.gravity)
            else query.intersectsBox(item.box)
          }
          if (iteration) times.push(performance.now() - start)
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
      },
      { fixture: fixture as { cases: unknown[]; probes: object[]; scene: unknown }, landing },
    )
    expect(result.p95Ms).toBeLessThan(16.7)
    return result
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    await cdp.detach()
  }
}

test('Phaser: plataformas conservam contornos, gravidade invertida e apoio preciso na cena regional', async ({
  page,
  request,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await loadAt(page, '/platforms/', 42, 10)
  const fixture = await (await request.get(origin + '/platforms/platform-probes.json')).json()
  const performanceResult = await profileQueries(page, fixture, true)
  const probes = await page.evaluate(async ({ cases }) => {
    const url = '/qa-scene.js'
    const qa = await import(url)
    return cases.map(
      (item: {
        name: string
        scene: unknown
        previous: unknown
        desired: unknown
        gravity: number
        result: unknown
      }) => {
        const scene = qa.readPintaRegionScene(JSON.stringify(item.scene))
        if (!scene) throw Error('A cena regional não foi admitida.')
        const queries = qa.createRegionSceneQueries(scene)
        return {
          name: item.name,
          expected: item.result,
          actual: queries.platformLanding(item.previous, item.desired, item.gravity),
        }
      },
    )
  }, fixture)
  for (const probe of probes) {
    if (probe.expected === null) expect(probe.actual, probe.name).toBeNull()
    else {
      expect(probe.actual, probe.name).not.toBeNull()
      for (const key of ['x', 'y', 'width', 'height'] as const)
        expect(probe.actual[key], probe.name + '.' + key).toBeCloseTo(probe.expected[key], 5)
    }
  }
  expect(await page.evaluate(() => window.pintaGame.player.platformer)).toBe(true)
  await expect
    .poll(() => page.evaluate(() => window.pintaGame.player.position.y))
    .toBeCloseTo(34.25, 3)
  await page.keyboard.down('ArrowUp')
  await expect.poll(() => page.evaluate(() => window.pintaGame.player.position.y)).toBeLessThan(25)
  await page.keyboard.up('ArrowUp')
  await expect
    .poll(() => page.evaluate(() => window.pintaGame.player.position.y))
    .toBeCloseTo(34.25, 3)
  expect(errors).toEqual([])
  await info.attach('plataformas-regionais', {
    body: JSON.stringify({ probes, performance: performanceResult }),
    contentType: 'application/json',
  })
})

test('Phaser: cena regional consulta contornos e barra movimento através de parede fina', async ({
  page,
  request,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await loadAt(page, '/physics/', 16, 34)
  const fixture = await (await request.get(origin + '/physics-probes.json')).json()
  const performanceResult = await profileQueries(page, fixture, false)
  const probes = await page.evaluate(async ({ scene, probes }) => {
    const url = '/qa-scene.js',
      qa = await import(url)
    const canonical = qa.readPintaRegionScene(JSON.stringify(qa.regionalGeometryFixture(scene)))
    if (!canonical) throw Error('A geometria não foi admitida.')
    const queries = qa.createRegionSceneQueries(canonical)
    return probes.map((probe: { name: string; box: unknown; blocked: boolean }) => ({
      name: probe.name,
      expected: probe.blocked,
      actual: queries.intersectsBox(probe.box),
    }))
  }, fixture)
  for (const probe of probes) expect(probe.actual, probe.name).toBe(probe.expected)
  await page.keyboard.down('ArrowRight')
  await expect
    .poll(() => page.evaluate(() => window.pintaGame.player.position.x))
    .toBeGreaterThan(33.9)
  await page.waitForTimeout(350)
  await page.keyboard.up('ArrowRight')
  const x = await page.evaluate(() => window.pintaGame.player.position.x)
  expect(x).toBeLessThanOrEqual(34.01)
  expect(errors).toEqual([])
  await info.attach('contornos-regionais', {
    body: JSON.stringify({ probes, x, performance: performanceResult }),
    contentType: 'application/json',
  })
})

test('Phaser resolve portas pelo ID preservado no pacote novo', async ({ page, request }) => {
  const scenes = (await (await request.get(origin + '/maps.json')).json()) as Record<
    string,
    PintaRegionSceneWire
  >
  const rootId = (await (await request.get(origin + '/start.json')).json()) as string
  const root = scenes[rootId]!,
    other = Object.values(scenes).find((scene) => scene.id !== rootId)!
  const door = root.layers
    .flatMap((layer) => (layer.kind === 'objects' ? layer.objects : []))
    .find((object) => object.role === 'door')!
  await loadAt(page, '/', door.x, door.y)
  await expect.poll(() => page.evaluate(() => window.pintaGame.player.scene.id)).toBe(other.id)
})

test('Phaser portátil anima a versão fixada, consulta referências e conserva o último quadro', async ({
  page,
  request,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(origin + '/resources/')
  await expect.poll(() => page.evaluate(() => !!window.pintaGame)).toBe(true)
  const scenes = (await (await request.get(origin + '/resources/maps.json')).json()) as Record<
    string,
    PintaRegionSceneWire
  >
  const sample = Object.values(scenes)[0]!
  const references = await page.evaluate(
    async ({ layer, tileset }) => {
      const maps = window.pintaGame.maps,
        name = window.pintaGame.player.scene.id
      const id = maps.mapLayerProperty(name, layer, 'resource'),
        url = maps.mapResourceImage(name, String(id))
      if (!url) throw Error('Falta a imagem referenciada pela propriedade.')
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
        score: maps.mapLayerProperty(name, layer, 'score'),
        allowed: maps.mapTileProperty(name, tileset, 0, 'allowed'),
        empty: maps.mapTileProperty(name, tileset, 0, 'empty'),
        related: maps.mapObjectById(name, String(maps.mapTileProperty(name, tileset, 0, 'related')))
          ?.name,
        missing: maps.mapResourceImage(name, 'missing'),
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
  const samples = await page.evaluate(
    async ({ scenes, rootId }) => {
      const url = '/qa-scene.js',
        qa = await import(url)
      const player = qa.createRegionPhaserPlayer(qa.readRegionPhaserWorld(scenes, rootId))
      const images = new Map<string, HTMLImageElement>()
      for (const asset of [...player.scene.tilesets, ...(player.scene.art ?? [])]) {
        const image = new Image()
        image.src = asset.image
        await image.decode()
        images.set(asset.id, image)
      }
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 480
      const ctx = canvas.getContext('2d')!
      return [0, 300, 600, 10000].map((time) => {
        player.draw(ctx, images, time)
        return [...ctx.getImageData(24, 24, 1, 1).data]
      })
    },
    { scenes, rootId: sample.id },
  )
  expect(samples).toEqual([
    [255, 0, 0, 255],
    [0, 255, 0, 255],
    [0, 0, 255, 255],
    [0, 0, 255, 255],
  ])
  expect(errors).toEqual([])
  await info.attach('phaser-resource-frames', {
    body: JSON.stringify(samples),
    contentType: 'application/json',
  })
})

test('Phaser portátil renderiza o mapa real, anda, colide e atravessa portas', async ({
  page,
  request,
}, info) => {
  const errors: string[] = [],
    external: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (req) => {
    if (new URL(req.url()).origin !== origin) external.push(req.url())
  })
  const scenes = (await (await request.get(origin + '/maps.json')).json()) as Record<
    string,
    PintaRegionSceneWire
  >
  const rootId = (await (await request.get(origin + '/start.json')).json()) as string
  const vila = scenes[rootId]!,
    cabana = Object.values(scenes).find((scene) => scene.id !== rootId)!
  expect(vila.layers).toHaveLength(18)
  expect(vila.tilesets).toHaveLength(2)
  expect(vila.layers.some((layer) => layer.kind === 'tiles' && layer.front)).toBe(true)
  await loadAt(page, '/', 38, 38)
  await expect(page.locator('canvas')).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => [...window.pintaGame.surface.context.getImageData(33, 33, 1, 1).data]),
    )
    .toEqual([74, 222, 128, 255])
  const water = () =>
    page.evaluate(() =>
      [...window.pintaGame.surface.context.getImageData(448, 224, 16, 16).data].join(','),
    )
  const first = await water()
  await expect.poll(water).not.toBe(first)
  const start = await page.evaluate(() => window.pintaGame.player.position.y)
  await page.keyboard.down('ArrowDown')
  await expect
    .poll(() => page.evaluate(() => window.pintaGame.player.position.y))
    .toBeGreaterThan(start + 10)
  await page.keyboard.up('ArrowDown')
  await loadAt(page, '/', 94, 46)
  await expect
    .poll(() =>
      page.evaluate(() => [...window.pintaGame.surface.context.getImageData(89, 41, 1, 1).data]),
    )
    .not.toEqual([74, 222, 128, 255])
  await loadAt(page, '/', 70, 74)
  await page.keyboard.down('ArrowRight')
  await page.waitForTimeout(350)
  await page.keyboard.up('ArrowRight')
  expect(await page.evaluate(() => window.pintaGame.player.position.x)).toBeLessThanOrEqual(74.1)
  await loadAt(page, '/', 102, 102)
  await expect.poll(() => page.evaluate(() => window.pintaGame.player.scene.id)).toBe(cabana.id)
  // Start in the second map through the actual start manifest, then use its return door.
  await page.route('**/start.json', (route) => route.fulfill({ json: cabana.id }))
  await page.unroute('**/maps.json')
  await page.route('**/maps.json', async (route) => {
    const response = await route.fetch(),
      maps = (await response.json()) as Record<string, PintaRegionSceneWire>
    for (const layer of maps[cabana.id]!.layers)
      if (layer.kind === 'objects')
        for (const item of layer.objects)
          if (item.role === 'start') {
            item.x = 86
            item.y = 38
          }
    await route.fulfill({ response, json: maps })
  })
  await page.goto(origin + '/')
  await expect.poll(() => page.evaluate(() => window.pintaGame?.player.scene.id)).toBe(vila.id)
  expect(errors).toEqual([])
  expect(external).toEqual([])
  await info.attach('phaser-vila', { body: await page.screenshot(), contentType: 'image/png' })
})
