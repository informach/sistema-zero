import { expect, type Page, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

async function output(page: Page) {
  return page.evaluate(() =>
    globalThis.providerProbe
      .read('turtle')
      .events.flatMap((event) => (event.type === 'console' ? [event.text] : []))
      .join(''),
  )
}
async function prepare(page: Page, fixture: string) {
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  await page.evaluate((fixture) => globalThis.providerProbe.prepare('turtle', fixture), fixture)
  const state = await page.evaluate(() => globalThis.providerProbe.read('turtle'))
  expect(state.status, state.error).toBe('ready')
  await page.locator('iframe').evaluate((frame) => {
    frame.style.width = '640px'
    frame.style.height = '480px'
    frame.style.border = '0'
  })
  await page.evaluate(() => globalThis.providerProbe.run('turtle'))
}
async function completed(page: Page) {
  await page.waitForFunction(() =>
    ['completed', 'failed'].includes(globalThis.providerProbe.read('turtle').status),
  )
  const state = await page.evaluate(() => globalThis.providerProbe.read('turtle'))
  expect(state.status, JSON.stringify(state)).toBe('completed')
}
test.beforeEach(async ({ request }, testInfo) => {
  await testInfo.attach('runtime-distribution', {
    body: await (await request.get('/distribution')).body(),
    contentType: 'application/json',
  })
})

test('optional Turtle draws actual Python geometry and Tk colors in the protected frame', async ({
  page,
}, testInfo) => {
  await prepare(page, 'turtleDrawing')
  await completed(page)
  expect(await output(page)).toBe('drawing-ready (100.00,80.00) 90.0\n')
  const frame = page.frames().find((value) => value.url().includes('/frame.html'))!
  const pixels = await frame.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    const context = canvas.getContext('2d')!
    return {
      size: [canvas.width, canvas.height],
      background: [...context.getImageData(10, 10, 1, 1).data],
      horizontal: [...context.getImageData(250, 150, 1, 1).data],
      vertical: [...context.getImageData(300, 110, 1, 1).data],
    }
  })
  expect(pixels).toEqual({
    size: [400, 300],
    background: [30, 144, 255, 255],
    horizontal: [255, 0, 0, 255],
    vertical: [255, 0, 0, 255],
  })
  await testInfo.attach('turtle-canvas', {
    body: await frame.locator('canvas').screenshot(),
    contentType: 'image/png',
  })
  await page.evaluate(() => globalThis.providerProbe.dispose('turtle'))
  expect(page.frames()).toHaveLength(1)
})

test('turtle.dot paints a filled disc, like Tk, although canvas prunes zero-length strokes', async ({
  page,
}) => {
  await prepare(page, 'turtleDot')
  await completed(page)
  expect(await output(page)).toBe('dot-ready\n')
  const frame = page.frames().find((value) => value.url().includes('/frame.html'))!
  const pixels = await frame.evaluate(() => {
    const context = document.querySelector('canvas')!.getContext('2d')!
    const at = (x: number, y: number) => [...context.getImageData(x, y, 1, 1).data]
    // Turtle (0, 0) is canvas (200, 150); y grows downward on the canvas.
    return {
      redCenter: at(100, 150),
      redEdge: at(100 + 17, 150),
      outsideRed: at(100 + 24, 150),
      // dot() without a size uses max(pensize + 4, 2 * pensize) = 60 for pensize 30.
      blueEdge: at(300, 150 - 27),
      outsideBlue: at(300, 150 - 33),
    }
  })
  expect(pixels).toEqual({
    redCenter: [255, 0, 0, 255],
    redEdge: [255, 0, 0, 255],
    outsideRed: [255, 255, 255, 255],
    blueEdge: [0, 0, 255, 255],
    outsideBlue: [255, 255, 255, 255],
  })
  await page.evaluate(() => globalThis.providerProbe.dispose('turtle'))
})

test('keyboard and turtle/screen clicks dispatch inside Python; Stop revokes the scene', async ({
  page,
}, testInfo) => {
  await prepare(page, 'turtleEvents')
  await expect.poll(() => output(page)).toContain('events-ready')
  const frame = page.frames().find((value) => value.url().includes('/frame.html'))!
  const canvas = frame.locator('canvas')
  await canvas.press('ArrowRight')
  await expect.poll(() => output(page)).toContain('key 10.0')
  await frame.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    canvas.addEventListener(
      'pointerdown',
      (event) => {
        document.documentElement.dataset.pointerEvidence = JSON.stringify({
          clientX: event.clientX,
          clientY: event.clientY,
          canvas: canvas.getBoundingClientRect().toJSON(),
          width: canvas.width,
          height: canvas.height,
        })
      },
      { once: true },
    )
  })
  await canvas.click({ position: { x: 210, y: 150 } })
  await testInfo.attach('pointer-evidence', {
    contentType: 'application/json',
    body: await frame.evaluate(() => document.documentElement.dataset.pointerEvidence!),
  })
  await expect.poll(() => output(page)).toContain('turtle-click 10 0\nscreen-click 10 0\n')
  const elapsed = await page.evaluate(async () => {
    const start = performance.now()
    await globalThis.providerProbe.stop('turtle')
    return performance.now() - start
  })
  expect(elapsed).toBeLessThan(250)
  expect(await page.evaluate(() => globalThis.providerProbe.read('turtle').status)).toBe('stopped')
  await page.evaluate(() => globalThis.providerProbe.dispose('turtle'))
})

test('GIF shape uses unchanged virtual asset and keeps official heading semantics', async ({
  page,
}) => {
  await prepare(page, 'turtleImage')
  await completed(page)
  expect(await output(page)).toBe('image-ready (20.00,30.00) 270.0\n')
  const frame = page.frames().find((value) => value.url().includes('/frame.html'))!
  await expect(frame.locator('canvas')).toBeVisible()
  await page.evaluate(() => globalThis.providerProbe.dispose('turtle'))
})

test('author turtle.py shadows the extension and private module names do not execute author code during prepare', async ({
  page,
}) => {
  await prepare(page, 'turtleNamespace')
  await completed(page)
  expect(await output(page)).toBe('author turtle preserved\n')
  const frame = page.frames().find((value) => value.url().includes('/frame.html'))!
  expect(await frame.locator('canvas').count()).toBe(0)
  await page.evaluate(() => globalThis.providerProbe.dispose('turtle'))
})

test('plain Python never loads the optional Turtle renderer or module', async ({ page }) => {
  const requested: string[] = []
  page.on('request', (request) => requested.push(request.url()))
  await prepare(page, 'portable')
  await completed(page)
  expect(
    requested.filter((url) => url.includes('/turtle/') || /\/turtle-[^/]+\.mjs/.test(url)),
  ).toEqual([])
  await page.evaluate(() => globalThis.providerProbe.dispose('turtle'))
})

test('Turtle hit testing respects occlusion and outline-only shapes', async ({ page }) => {
  await prepare(page, 'turtleOverlap')
  await expect.poll(() => output(page)).toContain('overlap-ready')
  const frame = page.frames().find((value) => value.url().includes('/frame.html'))!
  const canvas = frame.locator('canvas')
  await canvas.click({ position: { x: 200, y: 150 } })
  await expect.poll(() => output(page)).toBe('overlap-ready\nscreen\n')
  await canvas.press('u')
  await canvas.click({ position: { x: 200, y: 150 } })
  await expect.poll(() => output(page)).toBe('overlap-ready\nscreen\nbottom\nscreen\n')
  await canvas.press('o')
  await canvas.click({ position: { x: 200, y: 150 } })
  await expect.poll(() => output(page)).toContain('outline\nscreen\n')
  await page.evaluate(() => globalThis.providerProbe.dispose('turtle'))
})

test('multiline Turtle text occupies two lines and preserves the right anchor for move', async ({
  page,
}, testInfo) => {
  await prepare(page, 'turtleText')
  await completed(page)
  expect(await output(page)).toBe('text-right -1\n')
  const frame = page.frames().find((value) => value.url().includes('/frame.html'))!
  const rows = await frame.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    const ctx = canvas.getContext('2d')!
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    const bands: number[][] = []
    for (let y = 0; y < canvas.height; y++) {
      let dark = false
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4
        if (pixels[i]! < 100 && pixels[i + 1]! < 100 && pixels[i + 2]! < 100) {
          dark = true
          break
        }
      }
      if (dark) {
        if (bands.at(-1)?.at(-1) === y - 1) bands.at(-1)!.push(y)
        else bands.push([y])
      }
    }
    return bands
  })
  expect(rows).toHaveLength(2)
  await testInfo.attach('multiline', {
    body: await frame.locator('canvas').screenshot(),
    contentType: 'image/png',
  })
  await page.evaluate(() => globalThis.providerProbe.dispose('turtle'))
})

test('an idle mainloop requests no animation frames and wakes for input and timers', async ({
  page,
}) => {
  await prepare(page, 'turtleIdle')
  await expect.poll(() => output(page)).toContain('idle-ready')
  const frame = page.frames().find((value) => value.url().includes('/frame.html'))!
  const frames = await frame.evaluate(async () => {
    let count = 0
    const original = requestAnimationFrame
    globalThis.requestAnimationFrame = (callback) => {
      count++
      return original(callback)
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
    globalThis.requestAnimationFrame = original
    return count
  })
  expect(frames).toBe(0)
  await frame.locator('canvas').press('ArrowRight')
  await completed(page)
  expect(await output(page)).toBe('idle-ready\nidle-key\nidle-timer\nidle-done\n')
  await page.evaluate(() => globalThis.providerProbe.dispose('turtle'))
})

test('Screen can reopen after bye in the same Python execution', async ({ page }) => {
  await prepare(page, 'turtleReopen')
  await completed(page)
  expect(await output(page)).toBe('reopened\n')
  const frame = page.frames().find((value) => value.url().includes('/frame.html'))!
  await expect(frame.locator('canvas')).toBeVisible()
  expect(
    await frame
      .locator('canvas')
      .evaluate((canvas) => [
        ...(canvas as HTMLCanvasElement).getContext('2d')!.getImageData(1, 1, 1, 1).data,
      ]),
  ).toEqual([255, 0, 0, 255])
  await page.evaluate(() => globalThis.providerProbe.dispose('turtle'))
})

test('a corrupt image raises a catchable Python error and a later valid image still loads', async ({
  page,
}) => {
  await prepare(page, 'turtleInvalidImage')
  await completed(page)
  expect(await output(page)).toBe('caught TclError\ncontinued\n')
  const frame = page.frames().find((value) => value.url().includes('/frame.html'))!
  await expect(frame.locator('canvas')).toBeVisible()
  await page.evaluate(() => globalThis.providerProbe.dispose('turtle'))
})

test('input queued during Python sleep survives a catchable image error', async ({ page }) => {
  await prepare(page, 'turtleImageInput')
  await expect.poll(() => output(page)).toBe('image-input-ready\n')
  const frame = page.frames().find((value) => value.url().includes('/frame.html'))!
  await frame.locator('canvas').press('ArrowRight')
  await completed(page)
  expect(await output(page)).toBe('image-input-ready\ncaught TclError\nimage-key\ncontinued\n')
  await page.evaluate(() => globalThis.providerProbe.dispose('turtle'))
})

test('a Pinta drawing becomes a turtle shape that turns with the turtle', async ({ page }) => {
  await prepare(page, 'turtlePintaShape')
  await completed(page)
  // Six parts: the eye's outline is a band of its own, on top of its fill.
  expect(await output(page)).toBe('forma nave 6\n')
  const frame = page.frames().find((value) => value.url().includes('/frame.html'))!
  const pixels = await frame.evaluate(() => {
    const context = document.querySelector('canvas')!.getContext('2d')!
    const at = (x: number, y: number) => [...context.getImageData(x, y, 1, 1).data]
    return {
      // Facing east: the red nose is to the right of the turtle at (-100, 0).
      eastNose: at(145, 150),
      // Facing north: the nose is above the turtle at (100, 0), and not to its right.
      northNose: at(300, 105),
      northRight: at(345, 150),
    }
  })
  expect(pixels).toEqual({
    eastNose: [255, 51, 51, 255],
    northNose: [255, 51, 51, 255],
    northRight: [255, 255, 255, 255],
  })
  await page.evaluate(() => globalThis.providerProbe.dispose('turtle'))
})
