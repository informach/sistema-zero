import { writeFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'
import { requireCleanPythonBrowser } from './pythonBrowserErrors'

requireCleanPythonBrowser()

for (const scale of [1, 2])
  test(`Pinta world ${scale}x renders and crosses doors in real browser Python`, async ({
    page,
  }, testInfo) => {
    await page.goto('/provider')
    const configuration = await (await page.request.get('/configuration')).json()
    await page.waitForFunction(() => !!globalThis.providerProbe)
    await page.evaluate(
      (scale) => globalThis.providerProbe.prepare('game', `pinta-world-${scale}x`),
      scale,
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
    await expect.poll(output).toContain(`world-ready ${scale}`)
    const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))!
    const canvas = frame.locator('canvas')
    await expect(canvas).toHaveCount(1)
    const colors = () =>
      canvas.evaluate((node: HTMLCanvasElement) => {
        const pixels = node.getContext('2d')!.getImageData(0, 0, node.width, node.height).data
        const seen = new Set<number>()
        for (let index = 0; index < pixels.length; index += 4)
          seen.add((pixels[index]! << 16) | (pixels[index + 1]! << 8) | pixels[index + 2]!)
        return seen.size
      })
    await expect.poll(colors).toBeGreaterThan(16)
    await canvas.screenshot({ path: testInfo.outputPath(`vila-${scale}x.png`) })
    await canvas.press('Enter')
    await expect.poll(output).toContain('world-place cabana 2')
    await expect.poll(colors).toBeGreaterThan(2)
    await canvas.screenshot({ path: testInfo.outputPath(`cabana-${scale}x.png`) })
    await canvas.press('Enter')
    await expect.poll(output).toContain('world-place vila-e-floresta 18')
    await expect.poll(colors).toBeGreaterThan(16)
    const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
    expect(state.status, JSON.stringify(state)).toBe('running')
    expect(state.events.filter((event) => event.type === 'diagnostic')).toEqual([])
    expect(state.events[0]?.identity.runtimeManifestSha256).toBe(
      configuration.runtime.manifestSha256,
    )
    const stdout = await output()
    const facts = JSON.parse(stdout.split('world-runtime ')[1]!.split('\n')[0]!)
    expect(facts).toMatchObject({
      platform: 'emscripten',
      scale,
      layers: 18,
      solids: 57,
      animation: true,
      returnDoor: true,
    })
    const path = testInfo.outputPath('runtime-proof.json')
    await writeFile(
      path,
      `${JSON.stringify({ runtime: configuration.runtime, facts, stdout }, null, 2)}\n`,
    )
    await testInfo.attach('runtime-proof', { path, contentType: 'application/json' })
    await page.evaluate(() => globalThis.providerProbe.dispose('game'))
  })
