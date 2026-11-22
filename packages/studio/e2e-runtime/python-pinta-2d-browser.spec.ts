import { expect, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'
import { PGZERO_LIMITS, PGZERO_OP } from '../src/runtime/python/pgzero/protocol'
import { requireCleanPythonBrowser } from './pythonBrowserErrors'

requireCleanPythonBrowser()

test('PNG comum usa as vagas liberadas pelo RAF anterior no Pygame Zero', async ({
  page,
  request,
}) => {
  const configuration = await (await request.get('/configuration')).json()
  await page.goto(configuration.providerFrameURL)
  const result = await page.evaluate(
    async ({ count, ops }) => {
      const { createPgzeroRenderer } = (await import(
        new URL('./pgzero-renderer.mjs', location.href).href
      )) as typeof import('../src/runtime/python/pgzero/renderer')
      const renderer = createPgzeroRenderer(document.body, { pintaRegional: true })
      // A real 1×1 red PNG keeps the count at its ceiling with only 1024 pixels.
      const pixel = document.createElement('canvas')
      pixel.width = pixel.height = 1
      const ctx = pixel.getContext('2d')!
      ctx.fillStyle = '#ff0000'
      ctx.fillRect(0, 0, 1, 1)
      const png = Uint8Array.from(atob(pixel.toDataURL().split(',')[1]!), (c) => c.charCodeAt(0))
      const bytes = new Uint8Array(png.length * count)
      for (let i = 0; i < count; i++) bytes.set(png, i * png.length)
      const list = (...values: number[]) => ({
        id: 0,
        bytes: new Uint8Array(new Float64Array(values).buffer),
      })
      const header = {
        w: 4,
        h: 4,
        title: 'PNG',
        keep: false,
        images: [],
        fonts: [],
        strings: [],
        styles: [],
        audio: [],
      }
      try {
        const reply = await renderer.exchange(
          JSON.stringify({ pintaLoad: Array.from({ length: count }, () => [1, 1, png.length]) }),
          [{ id: 0, bytes }],
        )
        const owner = JSON.parse(reply as string).pintaOwner
        if (!owner) throw Error(String(reply))
        const readOrdinary = () =>
          renderer.exchange(
            JSON.stringify({ ...header, images: [[1, '/p/images/red.png', 1, 1]], read: [1, 0] }),
            [list(ops.BLIT, 1, 1, 0), { id: 1, bytes: png }],
          )
        const full = JSON.parse((await readOrdinary()) as string)
        await renderer.exchange(JSON.stringify(header), [
          list(
            ops.PINTA_AFFINE,
            owner,
            0,
            0,
            0,
            1,
            1,
            1,
            0,
            0,
            1,
            0,
            0,
            1,
            ops.PINTA_RELEASE,
            owner,
          ),
        ])
        const before = renderer.paintedFrames()
        const read = await readOrdinary()
        return { full, before, after: renderer.paintedFrames(), reply: JSON.parse(read as string) }
      } finally {
        renderer.dispose()
      }
    },
    { count: PGZERO_LIMITS.images, ops: PGZERO_OP },
  )
  expect(result).toEqual({
    full: { error: 'O jogo carregou imagens demais ao mesmo tempo.' },
    before: 0,
    after: 2,
    reply: { pixel: [255, 0, 0, 255] },
  })
})

test('Raylib exclusivamente 3D usa o protocolo anterior e continua a desenhar', async ({
  page,
}) => {
  const fixture = 'raylibSceneShapes3d'
  await page.route(`**/project/${fixture}`, async (route) => {
    const project = await (await route.fetch()).json()
    project.assets = []
    project.tree[project.python.entrypoint].content = `import pyray as p
from _szraylib import _rt
p.init_window(32, 32, 'Raylib 3D')
assert _rt.mode == '3d'
try:
    _rt._exchange({'pintaRelease':1}, b'')
except Exception as error:
    assert 'O quadro do Raylib chegou com um formato inválido' in str(error), str(error)
else:
    raise AssertionError('Pedido privado aceito')
p.begin_drawing()
p.clear_background(p.RED)
p.end_drawing()
print('Raylib 3D preservado')
p.close_window()
`
    await route.fulfill({ json: project })
  })
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  await page.evaluate((name) => globalThis.providerProbe.prepare('isolado', name), fixture)
  await page.evaluate(() => globalThis.providerProbe.run('isolado'))
  await expect
    .poll(() =>
      page.evaluate(() =>
        globalThis.providerProbe
          .read('isolado')
          .events.flatMap((event) =>
            event.type === 'console'
              ? [event.text]
              : event.type === 'diagnostic'
                ? [event.traceback]
                : [],
          )
          .join(''),
      ),
    )
    .toContain('Raylib 3D preservado')
  await page.evaluate(() => globalThis.providerProbe.dispose('isolado'))
})

for (const engine of ['pgzero', 'raylib2d']) {
  test(`Pinta regional usa o compositor de navegador ${engine}`, async ({ page }, info) => {
    await page.goto('/provider')
    await page.waitForFunction(() => !!globalThis.providerProbe)
    await page.evaluate(
      ({ engine, supplied, stored }) =>
        globalThis.providerProbe.prepare(
          'game',
          `pinta-regional-${engine}${supplied ? '-fornecido' : ''}`,
          false,
          false,
          stored && engine === 'pgzero' ? 'classic' : stored,
        ),
      {
        engine,
        supplied: process.env.PYTHON_PROBE_PINTA_SCENES === '1',
        stored: process.env.PYTHON_PROBE_PINTA_MATERIALS === '1',
      },
    )
    const ready = await page.evaluate(() => globalThis.providerProbe.read('game'))
    expect(ready.status, JSON.stringify(ready)).toBe('ready')
    await page.locator('iframe').evaluate((frame) => {
      frame.style.cssText = 'width:640px;height:480px;border:0'
    })
    const output = () =>
      page.evaluate(() =>
        globalThis.providerProbe
          .read('game')
          .events.flatMap((event) =>
            event.type === 'console'
              ? [event.text]
              : event.type === 'diagnostic'
                ? [event.traceback]
                : [],
          )
          .join(''),
      )
    await page.evaluate(() => globalThis.providerProbe.run('game'))
    await expect.poll(output).toContain('Pinta pronta')
    const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))
    if (!frame) throw Error('Quadro do Python não encontrado')
    const canvas = frame.locator('canvas')
    await expect(canvas).toBeVisible()
    const pixels = () =>
      canvas.evaluate((node: HTMLCanvasElement) => {
        const copy = document.createElement('canvas')
        copy.width = 320
        copy.height = 240
        const context = copy.getContext('2d')!
        context.imageSmoothingEnabled = false
        context.drawImage(node, 0, 0, 320, 240)
        const at = (x: number, y: number) => [...context.getImageData(x, y, 1, 1).data].slice(0, 3)
        return {
          red: at(13, 6),
          green: at(9, 7),
          semiYellow: at(15, 10),
          purple: at(11, 11),
          outside: at(6, 4),
          legacy: at(21, 1),
          floorStripe: at(32, 32),
          floorWood: at(33, 33),
        }
      })
    const legacy = engine === 'pgzero' ? [0, 0, 255] : [0, 121, 241]
    await expect.poll(async () => (await pixels()).legacy).toEqual(legacy)
    const art = await pixels()
    expect(art.outside).toEqual([0, 0, 0])
    for (const [actual, expected] of [
      [art.red, [128, 0, 0]],
      [art.green, [0, 128, 0]],
      [art.semiYellow, [64, 64, 0]],
      [art.purple, [128, 0, 128]],
    ] as const)
      expect(
        actual.every((value, channel) => Math.abs(value - (expected[channel] ?? -255)) <= 1),
        JSON.stringify(art),
      ).toBe(true)
    await info.attach('vila', { body: await canvas.screenshot(), contentType: 'image/png' })

    await canvas.press('Enter')
    await expect.poll(output).toContain('Pinta lugar cabana')
    await expect
      .poll(pixels)
      .toMatchObject({ floorStripe: [105, 76, 56], floorWood: [161, 135, 82] })
    await info.attach('cabana', { body: await canvas.screenshot(), contentType: 'image/png' })
    await canvas.press('Enter')
    await expect.poll(output).toContain('Pinta lugar vila-e-floresta')
    await canvas.press('d')
    await expect.poll(output).toContain('Pinta recorte descartado')
    // Pygame Zero retains the last displayed frame until another input marks it dirty.
    await canvas.press('r')
    await expect.poll(output).toContain('Pinta substituição concluída')
    await expect.poll(async () => (await pixels()).red).toEqual([0, 0, 0])

    const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
    expect(state.status).toBe('running')
    expect(state.events.filter((event) => event.type === 'diagnostic')).toEqual([])
    const logs = await output()
    if (process.env.PYTHON_PROBE_PINTA_SCENES === '1')
      expect(logs).toContain('Pinta fornecido /studio/extensions/python-')
    expect(logs).toContain('"platform": "emscripten"')
    expect(logs).toContain('"rollback": true')
    await info.attach('pixels-e-saida', {
      body: JSON.stringify({ art, logs }, null, 2),
      contentType: 'application/json',
    })
    await page.evaluate(() => globalThis.providerProbe.dispose('game'))
  })
}
