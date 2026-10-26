import { readdirSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { expect, type Page, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'
import { RAYLIB_GAMES } from '../src/examples/python/raylibGames.manifest'

const scenes = new URL('../scripts/raylib/scenes/', import.meta.url)
/** The same list the probe fixtures build (experiments/studio-python-runtime/raylibFixtures.ts). */
const RAYLIB_SCENES = readdirSync(scenes)
  .filter((file) => file.endsWith('.py') && file !== 'make_references.py')
  .map((file) => file.slice(0, -3))
  .sort()

function stdout(page: Page) {
  return page.evaluate(() =>
    globalThis.providerProbe
      .read('game')
      .events.flatMap((event) => (event.type === 'console' ? [event.text] : []))
      .join(''),
  )
}

test('Raylib 2D: own loop, shapes, textures, text, camera, keyboard, mouse and sound', async ({
  page,
}, testInfo) => {
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  await page.evaluate(() => globalThis.providerProbe.prepare('game', 'raylibGame'))
  const ready = await page.evaluate(() => globalThis.providerProbe.read('game'))
  expect(ready.status, JSON.stringify(ready)).toBe('ready')
  await page.locator('iframe').evaluate((frame) => {
    frame.style.cssText = 'width:640px;height:480px;border:0'
  })
  await page.evaluate(() => globalThis.providerProbe.run('game'))
  await expect.poll(() => stdout(page), { timeout: 40_000 }).toContain('quadros-30 True True')
  expect(await stdout(page)).toContain('pronto 32 32 70')
  const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))!
  const canvas = frame.locator('canvas')
  await expect(canvas).toHaveCount(1)
  expect(await canvas.evaluate((node: HTMLCanvasElement) => [node.width, node.height])).toEqual([
    320, 240,
  ])
  const pixels = await canvas.evaluate((node: HTMLCanvasElement) => {
    const copy = document.createElement('canvas')
    copy.width = node.width
    copy.height = node.height
    const context = copy.getContext('2d')!
    context.drawImage(node, 0, 0)
    const at = (x: number, y: number) => [...context.getImageData(x, y, 1, 1).data]
    return {
      fill: at(300, 200),
      rect: at(50, 195),
      circle: at(280, 40),
      hero: at(160, 120),
      purple: at(205, 204),
    }
  })
  await testInfo.attach('pixels', { body: JSON.stringify(pixels), contentType: 'application/json' })
  expect(pixels.fill.slice(0, 3)).toEqual([30, 60, 120])
  expect(pixels.rect.slice(0, 3)).toEqual([253, 249, 0])
  expect(pixels.circle.slice(0, 3)).toEqual([255, 255, 255])
  expect(pixels.hero[0]).toBeGreaterThan(200)
  expect(pixels.purple.slice(0, 3)).toEqual([255, 0, 255])
  await canvas.click({ position: { x: 160, y: 120 } })
  await canvas.press('Space')
  await expect.poll(() => stdout(page)).toContain('espaco 1')
  await expect.poll(() => stdout(page)).toContain('clique')
  await testInfo.attach('stdout', { body: await stdout(page), contentType: 'text/plain' })
  await testInfo.attach('screen', {
    body: await canvas.screenshot({ path: testInfo.outputPath('screen.png') }),
    contentType: 'image/png',
  })
  const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
  expect(state.status, JSON.stringify(state)).toBe('running')
  await page.evaluate(() => globalThis.providerProbe.dispose('game'))
})

/**
 * Cenas-gabarito: the same scene ran on the desktop raylib 6.0.1.0 (scripts/raylib/scenes/
 * make_references.py) and its screenshot lives in scenes/reference. Here it runs in the Studio
 * and the canvas is compared pixel by pixel: a pixel differs when any channel is off by more
 * than 48 (the same rule as scripts/raylib/tests/compare_images.py).
 */
for (const scene of RAYLIB_SCENES) {
  test(`Raylib: cena-gabarito ${scene}`, async ({ page }, testInfo) => {
    const fixture = `raylibScene${scene[0]!.toUpperCase()}${scene.slice(1)}`
    await page.goto('/provider')
    await page.waitForFunction(() => !!globalThis.providerProbe)
    await page.evaluate((name) => globalThis.providerProbe.prepare('game', name), fixture)
    await page.evaluate(() => globalThis.providerProbe.run('game'))
    await expect
      .poll(async () => (await page.evaluate(() => globalThis.providerProbe.read('game'))).status, {
        timeout: 40_000,
      })
      .not.toBe('running')
    const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
    expect(state.status, JSON.stringify(state)).not.toBe('failed')
    const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))!
    const ours = await frame
      .locator('canvas')
      .evaluate((node: HTMLCanvasElement) => node.toDataURL('image/png'))
    const path = testInfo.outputPath(`${scene}.png`)
    await writeFile(path, Buffer.from(ours.split(',')[1]!, 'base64'))
    await testInfo.attach(scene, { path, contentType: 'image/png' })
    const reference = `data:image/png;base64,${(
      await readFile(new URL(`reference/${scene}.png`, scenes))
    ).toString('base64')}`
    const diff = await page.evaluate(
      async ([a, b]) => {
        const pixels = async (url: string) => {
          const bitmap = await createImageBitmap(await (await fetch(url)).blob())
          const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
          const context = canvas.getContext('2d')!
          context.drawImage(bitmap, 0, 0)
          return context.getImageData(0, 0, bitmap.width, bitmap.height)
        }
        const [real, mine] = await Promise.all([pixels(a!), pixels(b!)])
        if (real.width !== mine.width || real.height !== mine.height)
          return { size: `${real.width}x${real.height} × ${mine.width}x${mine.height}`, count: -1 }
        let count = 0
        for (let index = 0; index < real.data.length; index += 4) {
          for (let channel = 0; channel < 4; channel++) {
            if (Math.abs(real.data[index + channel]! - mine.data[index + channel]!) > 48) {
              count++
              break
            }
          }
        }
        return { size: `${real.width}x${real.height}`, count }
      },
      [reference, ours],
    )
    testInfo.annotations.push({
      type: 'pixels-diferentes',
      description: `${diff.count} (${diff.size})`,
    })
    expect(diff.count, `pixels diferentes do raylib real (${diff.size})`).toBe(0)
    await page.evaluate(() => globalThis.providerProbe.dispose('game'))
  })
}

/** Every gallery game: it opens from the gallery payload, draws and takes input without errors. */
for (const { key } of RAYLIB_GAMES)
  test(`Raylib: exemplo da galeria ${key} roda, desenha e recebe teclado e mouse`, async ({
    page,
  }, testInfo) => {
    await page.goto('/provider')
    await page.waitForFunction(() => !!globalThis.providerProbe)
    await page.evaluate(
      (name) => globalThis.providerProbe.prepare('game', name),
      `raylib-example-${key}`,
    )
    const ready = await page.evaluate(() => globalThis.providerProbe.read('game'))
    expect(ready.status, JSON.stringify(ready)).toBe('ready')
    await page.evaluate(() => globalThis.providerProbe.run('game'))
    const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))!
    const canvas = frame.locator('canvas')
    await expect(canvas).toHaveCount(1, { timeout: 30_000 })
    await page.waitForTimeout(1500)
    const box = await canvas.boundingBox()
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    for (const pressed of ['ArrowRight', 'ArrowUp', 'Space']) await canvas.press(pressed)
    await page.waitForTimeout(1000)
    const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
    const output = state.events
      .flatMap((event) => (event.type === 'console' ? [event.text] : []))
      .join('')
    await testInfo.attach('stdout', { body: output, contentType: 'text/plain' })
    expect(state.status, `${JSON.stringify(state.events.at(-1))}\n${output}`).toBe('running')
    const png = await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL('image/png'))
    const path = testInfo.outputPath(`${key}.png`)
    await writeFile(path, Buffer.from(png.split(',')[1]!, 'base64'))
    await testInfo.attach(key, { path, contentType: 'image/png' })
    const colours = await page.evaluate(async (url) => {
      const bitmap = await createImageBitmap(await (await fetch(url)).blob())
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const context = canvas.getContext('2d')!
      context.drawImage(bitmap, 0, 0)
      const data = context.getImageData(0, 0, bitmap.width, bitmap.height).data
      const seen = new Set<number>()
      for (let at = 0; at < data.length; at += 4 * 97)
        seen.add((data[at]! << 16) | (data[at + 1]! << 8) | data[at + 2]!)
      return seen.size
    }, png)
    expect(colours).toBeGreaterThan(3)
    await page.evaluate(() => globalThis.providerProbe.dispose('game'))
  })
