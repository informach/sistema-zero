import { expect, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

test('capture cost at the maximum output size with incompressible pixels', async ({
  page,
}, info) => {
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  await page.evaluate(() => globalThis.providerProbe.prepare('capture', 'turtleCapture'))
  await page.evaluate(() => globalThis.providerProbe.run('capture'))
  await page.waitForFunction(() =>
    globalThis.providerProbe
      .read('capture')
      .events.some((event) => event.type === 'console' && event.text.includes('capture-ready')),
  )
  const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))!
  await frame.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    const context = canvas.getContext('2d')!
    const pixels = context.createImageData(canvas.width, canvas.height)
    let seed = 20261017
    for (let i = 0; i < pixels.data.length; i += 4) {
      seed ^= seed << 13
      seed ^= seed >>> 17
      seed ^= seed << 5
      pixels.data[i] = seed & 255
      pixels.data[i + 1] = (seed >>> 8) & 255
      pixels.data[i + 2] = (seed >>> 16) & 255
      pixels.data[i + 3] = 255
    }
    // Synthetic stress pixels in a real presented renderer. No compatibility claim.
    context.putImageData(pixels, 0, 0)
    for (const method of ['drawImage', 'toDataURL'] as const) {
      if (method === 'drawImage') {
        const original = CanvasRenderingContext2D.prototype.drawImage
        CanvasRenderingContext2D.prototype.drawImage = new Proxy(original, {
          apply(target, context, args) {
            const start = performance.now()
            const result = Reflect.apply(target, context, args)
            performance.measure('capture-copy', { start, end: performance.now() })
            return result
          },
        })
      } else {
        const original = HTMLCanvasElement.prototype.toDataURL
        HTMLCanvasElement.prototype.toDataURL = function (...args) {
          const start = performance.now()
          const result = original.apply(this, args)
          performance.measure('capture-sync-encode', { start, end: performance.now() })
          return result
        }
      }
    }
    const toBlob = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = function (...args) {
      const start = performance.now()
      const result = toBlob.apply(this, args)
      performance.measure('capture-async-encode-dispatch', { start, end: performance.now() })
      return result
    }
  })
  const result = await page.evaluate(async () => {
    const elapsed: number[] = []
    let golden = ''
    for (let i = 0; i < 13; i++) {
      const start = performance.now()
      const image = await globalThis.providerProbe.capture('capture')
      if (image?.width !== 1024 || image.height !== 768) throw new Error('capture')
      const ms = performance.now() - start
      if (i >= 3) elapsed.push(ms)
      const digest = [
        ...new Uint8Array(
          await crypto.subtle.digest('SHA-256', new TextEncoder().encode(image.dataUrl)),
        ),
      ]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
      if (golden && golden !== digest) throw new Error('Different pixels between captures')
      golden = digest
      await new Promise(requestAnimationFrame)
    }
    return { elapsed, golden }
  })
  const measures = await frame.evaluate(() => ({
    copy: performance
      .getEntriesByName('capture-copy')
      .map((entry) => entry.duration)
      .slice(3),
    syncEncode: performance
      .getEntriesByName('capture-sync-encode')
      .map((entry) => entry.duration)
      .slice(3),
    asyncEncodeDispatch: performance
      .getEntriesByName('capture-async-encode-dispatch')
      .map((entry) => entry.duration)
      .slice(3),
  }))
  expect(result.elapsed).toHaveLength(10)
  expect(result.golden).toBe('401a6efa4bbc0c40a43b47e2fa55279afbae9448a0ab349bf70d9e63a91f0f4e')
  await info.attach('capture-measurements', {
    body: JSON.stringify({
      ...result,
      ...measures,
      scope: 'local synthetic stress, 3 warmups + 10 samples',
    }),
    contentType: 'application/json',
  })
  await page.evaluate(() => globalThis.providerProbe.dispose('capture'))
})
