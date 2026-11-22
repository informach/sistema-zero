import { expect, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'
import { requireCleanPythonBrowser } from './pythonBrowserErrors'

requireCleanPythonBrowser()
for (const scale of [1, 2])
  test(`regional PNG5 ${scale}x runs the shared Python scene in real Wasm pygame-ce`, async ({
    page,
  }, info) => {
    await page.goto('/provider')
    await page.waitForFunction(() => !!globalThis.providerProbe)
    await page.evaluate(
      ({ scale, supplied, stored }) =>
        globalThis.providerProbe.prepare(
          'game',
          `pinta-regional-pygame-${scale}x${supplied ? '-fornecido' : ''}`,
          false,
          false,
          stored && scale === 1 ? 'classic' : stored,
        ),
      {
        scale,
        supplied: process.env.PYTHON_PROBE_PINTA_SCENES === '1',
        stored: process.env.PYTHON_PROBE_PINTA_MATERIALS === '1',
      },
    )
    const ready = await page.evaluate(() => globalThis.providerProbe.read('game'))
    expect(ready.status, JSON.stringify(ready)).toBe('ready')
    await page.locator('iframe').evaluate((frame) => {
      frame.style.cssText = 'width:800px;height:600px;border:0'
    })
    await page.evaluate(() => globalThis.providerProbe.run('game'))
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
    await expect.poll(output).toContain(`regional-ready ${scale}`)
    const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))
    expect(frame).toBeDefined()
    const canvas = frame!.locator('canvas')
    const colours = () =>
      canvas.evaluate((node: HTMLCanvasElement) => {
        const pixels = node.getContext('2d')!.getImageData(0, 0, node.width, node.height).data,
          seen = new Set<number>()
        for (let i = 0; i < pixels.length; i += 4)
          seen.add((pixels[i]! << 16) | (pixels[i + 1]! << 8) | pixels[i + 2]!)
        return seen.size
      })
    await expect.poll(colours).toBeGreaterThan(16)
    const samples = () =>
      canvas.evaluate((node: HTMLCanvasElement, scale: number) => {
        const ctx = node.getContext('2d')!
        return [
          [48, 32],
          [49, 33],
        ].map(([x, y]) => [...ctx.getImageData(x! * scale, y! * scale, 1, 1).data])
      }, scale)
    const villageSamples = await samples()
    const cabinSamples = [
      [105, 76, 56, 255],
      [161, 135, 82, 255],
    ]
    expect(villageSamples).not.toEqual(cabinSamples)
    await info.attach('regional-vila', {
      body: await canvas.screenshot(),
      contentType: 'image/png',
    })
    await canvas.press('Enter')
    await expect.poll(output).toContain('regional-place cabana')
    await expect.poll(colours).toBeGreaterThan(2)
    await expect.poll(samples).toEqual(cabinSamples)
    await info.attach('regional-cabana', {
      body: await canvas.screenshot(),
      contentType: 'image/png',
    })
    await canvas.press('Enter')
    await expect.poll(output).toContain('regional-place vila-e-floresta')
    await expect.poll(colours).toBeGreaterThan(16)
    await expect.poll(samples).toEqual(villageSamples)
    const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
    expect(state.events.filter((event) => event.type === 'diagnostic')).toEqual([])
    expect(state.status).toBe('running')
    const stdout = await output(),
      facts = JSON.parse(stdout.split('regional-runtime ')[1]!.split('\n')[0]!)
    if (process.env.PYTHON_PROBE_PINTA_SCENES === '1')
      expect(stdout).toContain('Pinta fornecido /studio/extensions/python-pygame-')
    expect(facts).toMatchObject({
      platform: 'emscripten',
      scale,
      layers: 18,
      scene: 4,
      png: 5,
      width: 160000 * scale,
      sharedResources: true,
      animation: true,
      float32SupportFrames: 40,
    })
    await info.attach('regional-runtime', {
      body: JSON.stringify({ facts, stdout }, null, 2),
      contentType: 'application/json',
    })
    await page.evaluate(() => globalThis.providerProbe.dispose('game'))
  })

test('wrong bytes for the supplied module fail before learner code or a ready session', async ({
  page,
}) => {
  test.skip(process.env.PYTHON_PROBE_PINTA_SCENES !== '1')
  let intercepted = 0
  await page.context().route('**/pinta-scenes/pygame/pinta.py', async (route) => {
    const response = await route.fetch()
    const body = await response.body()
    body[0] = (body[0] ?? 0) ^ 1
    intercepted++
    await route.fulfill({ response, body })
  })
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  await page.evaluate(
    (stored) =>
      globalThis.providerProbe.prepare(
        'game',
        'pinta-regional-pygame-1x-fornecido',
        false,
        false,
        stored,
      ),
    process.env.PYTHON_PROBE_PINTA_MATERIALS === '1',
  )
  const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
  expect(intercepted).toBe(1)
  expect(state.status).toBe('failed')
  expect(state.error).toContain('não corresponde à distribuição')
  expect(state.events).toEqual([])
  expect(state.frameURL).toBe('about:blank')
})
