import { expect, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'
import { requireCleanPythonBrowser } from './pythonBrowserErrors'

requireCleanPythonBrowser()

for (const engine of ['pgzero', 'raylib2d']) {
  test(`Pinta regional usa o compositor de navegador ${engine}`, async ({ page }, info) => {
    await page.goto('/provider')
    await page.waitForFunction(() => !!globalThis.providerProbe)
    await page.evaluate(
      (engine) => globalThis.providerProbe.prepare('game', `pinta-regional-${engine}`),
      engine,
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
    expect(logs).toContain('"platform": "emscripten"')
    expect(logs).toContain('"rollback": true')
    await info.attach('pixels-e-saida', {
      body: JSON.stringify({ art, logs }, null, 2),
      contentType: 'application/json',
    })
    await page.evaluate(() => globalThis.providerProbe.dispose('game'))
  })
}
