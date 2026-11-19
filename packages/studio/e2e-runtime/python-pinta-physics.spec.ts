import { writeFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

for (const scale of [1, 2])
  test(`Pinta physics ${scale}x checks all outlines in real browser Python`, async ({
    page,
  }, info) => {
    await page.goto('/provider')
    const configuration = await (await page.request.get('/configuration')).json()
    expect(configuration.runtime.features).toContain('pinta-scene-physics-v1')
    await page.waitForFunction(() => !!globalThis.providerProbe)
    await page.evaluate(
      (scale) => globalThis.providerProbe.prepare('game', `pinta-physics-${scale}x`),
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
    await expect.poll(output).toContain(`physics-ready ${scale}`)
    const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
    expect(state.status, JSON.stringify(state)).toBe('running')
    expect(state.events.filter((event) => event.type === 'diagnostic')).toEqual([])
    expect(state.events[0]?.identity.runtimeManifestSha256).toBe(
      configuration.runtime.manifestSha256,
    )
    const stdout = await output(),
      facts = JSON.parse(stdout.split('physics-proof ')[1]!.split('\n')[0]!)
    expect(facts).toMatchObject({
      platform: 'emscripten',
      scale,
      probes: 16,
      movement: true,
      worldRootScene: 1,
      returnDoor: true,
    })
    const frame = page.frames().find((frame) => frame.url().includes('/frame.html'))!
    const canvas = frame.locator('canvas')
    await expect
      .poll(() =>
        canvas.evaluate((node: HTMLCanvasElement) => {
          const pixels = node.getContext('2d')!.getImageData(0, 0, node.width, node.height).data
          let count = 0
          for (let i = 0; i < pixels.length; i += 4)
            if (pixels[i] === 74 && pixels[i + 1] === 222 && pixels[i + 2] === 128) count++
          return count
        }),
      )
      .toBeGreaterThan(50)
    await canvas.screenshot({ path: info.outputPath(`physics-${scale}x.png`) })
    const path = info.outputPath('runtime-proof.json')
    await writeFile(
      path,
      JSON.stringify({ runtime: configuration.runtime, facts, stdout }, null, 2),
    )
    await info.attach('physics-runtime-proof', { path, contentType: 'application/json' })
    await page.evaluate(() => globalThis.providerProbe.dispose('game'))
  })
