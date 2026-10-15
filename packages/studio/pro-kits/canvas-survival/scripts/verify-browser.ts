// Playwright runs under Node: Bun on Windows cannot complete its transport handshake.
// The Bun test owns the local HTTP fixture and checks this process's exit code.
import { after, before, test } from 'node:test'
import { type Browser, chromium, expect } from '@playwright/test'

const base = process.argv[2]!
let browser: Browser
async function scenario(name: string) {
  const response = await fetch(base + '__fixture?scenario=' + name)
  if (!response.ok) throw new Error('Unknown fixture scenario')
}
before(async () => {
  browser = await chromium.launch({ headless: true })
})
after(async () => {
  await browser?.close()
})

test('browser decodes actual canonical PNGs under a nested base, deduplicates aliases and disposes idempotently', async () => {
  await scenario('original')
  const page = await browser.newPage()
  try {
    await page.goto(base)
    const result = await page.evaluate(async () => {
      const { loadArenaAssets } = await import('./assets.js')
      const assets = await loadArenaAssets()
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(assets.roles.player.image, 0, 0, 64, 64, 0, 0, 64, 64)
      const pixels = ctx.getImageData(0, 0, 64, 64).data
      const colored = Array.from(pixels).filter(
        (value, index) => index % 4 === 3 && value > 0,
      ).length
      const dimensions = [assets.roles.player.width, assets.roles.player.height]
      const revision = assets.revision
      assets.dispose()
      assets.dispose()
      const original = window.createImageBitmap.bind(window)
      let decodes = 0
      window.createImageBitmap = ((...args: Parameters<typeof createImageBitmap>) => {
        decodes++
        return (
          original as (...args: Parameters<typeof createImageBitmap>) => Promise<ImageBitmap>
        )(...args)
      }) as typeof createImageBitmap
      const bindings = Object.fromEntries(
        ['player', 'seeker', 'drifter'].map((role) => [role, assets.roles.player.binding]),
      )
      const aliases = await loadArenaAssets({ bindings })
      const shared =
        aliases.roles.player.image === aliases.roles.seeker.image &&
        aliases.roles.seeker.image === aliases.roles.drifter.image
      aliases.dispose()
      window.createImageBitmap = original
      return { colored, dimensions, revision, decodes, shared }
    })
    expect(result.colored).toBeGreaterThan(700)
    expect(result.dimensions).toEqual([640, 64])
    expect(result.revision).toMatch(/^[a-f0-9]{64}$/)
    expect(result.decodes).toBe(1)
    expect(result.shared).toBe(true)
  } finally {
    await page.close()
  }
})

test('same material ID/path receives fresh bytes and metadata in a new execution', async () => {
  await scenario('original')
  const page = await browser.newPage()
  try {
    await page.goto(base)
    const sample = () =>
      page.evaluate(async () => {
        const { loadArenaAssets } = await import('./assets.js')
        const assets = await loadArenaAssets()
        const canvas = document.createElement('canvas')
        canvas.width = 64
        canvas.height = 64
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(assets.roles.player.image, 0, 0, 64, 64, 0, 0, 64, 64)
        const data = canvas.toDataURL(),
          revision = assets.revision,
          key = assets.roles.player.resourceKey
        assets.dispose()
        return { data, revision, key }
      })
    const before = await sample()
    await scenario('bytes')
    const after = await sample()
    expect(after.data).not.toBe(before.data)
    expect(after.revision).not.toBe(before.revision)
    await scenario('metadata')
    const metadata = await sample()
    expect(metadata.data).toBe(after.data)
    expect(metadata.key).not.toBe(after.key)
    expect(metadata.revision).not.toBe(after.revision)
  } finally {
    await page.close()
    await scenario('original')
  }
})

test('hash mismatch rejects before decoding, while late decode is closed after timeout', async () => {
  const page = await browser.newPage()
  try {
    await scenario('original')
    await scenario('mismatch')
    await page.goto(base)
    const mismatch = await page.evaluate(async () => {
      const { loadArenaAssets } = await import('./assets.js')
      try {
        await loadArenaAssets()
        return 'unexpected success'
      } catch (error) {
        return String(error)
      }
    })
    expect(mismatch).toContain('hash/tamanho')
    await scenario('original')
    const late = await page.evaluate(async () => {
      const { loadArenaAssets } = await import('./assets.js')
      const originalDecode = window.createImageBitmap.bind(window),
        originalClose = ImageBitmap.prototype.close
      let closes = 0
      ImageBitmap.prototype.close = function () {
        closes++
        return originalClose.call(this)
      }
      window.createImageBitmap = ((...args: Parameters<typeof createImageBitmap>) =>
        new Promise<ImageBitmap>((resolve, reject) => {
          setTimeout(() => {
            ;(
              originalDecode as (
                ...args: Parameters<typeof createImageBitmap>
              ) => Promise<ImageBitmap>
            )(...args).then(resolve, reject)
          }, 100)
        })) as typeof createImageBitmap
      let name = ''
      try {
        await loadArenaAssets({ timeoutMs: 50 })
      } catch (error) {
        name = (error as DOMException).name
      }
      await new Promise((resolve) => setTimeout(resolve, 180))
      window.createImageBitmap = originalDecode
      ImageBitmap.prototype.close = originalClose
      return { name, closes }
    })
    expect(late.name).toBe('TimeoutError')
    expect(late.closes).toBe(1)
  } finally {
    await page.close()
    await scenario('original')
  }
})

test('abort during hashing cannot start a new decode after the attempt is disposed', async () => {
  await scenario('original')
  const page = await browser.newPage()
  try {
    await page.goto(base)
    const result = await page.evaluate(async () => {
      const { loadArenaAssets } = await import('./assets.js')
      const originalDigest = crypto.subtle.digest.bind(crypto.subtle)
      const originalDecode = window.createImageBitmap.bind(window)
      let entered!: () => void,
        release!: () => void,
        decodes = 0
      const hashing = new Promise<void>((resolve) => {
        entered = resolve
      })
      crypto.subtle.digest = async (...args: Parameters<typeof originalDigest>) => {
        const value = await originalDigest(...args)
        entered()
        return new Promise<ArrayBuffer>((resolve) => {
          release = () => resolve(value)
        })
      }
      window.createImageBitmap = ((...args: Parameters<typeof createImageBitmap>) => {
        decodes++
        return (
          originalDecode as (...args: Parameters<typeof createImageBitmap>) => Promise<ImageBitmap>
        )(...args)
      }) as typeof createImageBitmap
      const controller = new AbortController()
      const attempt = loadArenaAssets({ signal: controller.signal }).then(
        () => 'unexpected success',
        (error: DOMException) => error.name,
      )
      await hashing
      controller.abort()
      const name = await attempt
      release()
      await new Promise((resolve) => requestAnimationFrame(resolve))
      crypto.subtle.digest = originalDigest
      window.createImageBitmap = originalDecode
      return { name, decodes }
    })
    expect(result.name).toBe('AbortError')
    expect(result.decodes).toBe(0)
  } finally {
    await page.close()
  }
})

test('real renderer keeps model immutable, draws the authored sprites and releases the canvas', async () => {
  await scenario('original')
  const page = await browser.newPage({ deviceScaleFactor: 3 })
  try {
    await page.goto(base)
    const result = await page.evaluate(async () => {
      const { loadArenaAssets } = await import('./assets.js')
      const { createCanvasRenderer } = await import('./canvas.js')
      const { createArenaState } = await import('./model.js')
      const assets = await loadArenaAssets(),
        state = createArenaState({ seed: 42 }),
        before = JSON.stringify(state)
      const renderer = createCanvasRenderer(document.querySelector('#stage')!, assets)
      renderer.draw(state, { phase: 'playing', reducedQuality: false, reducedMotion: false })
      const dimensions = [renderer.canvas.width, renderer.canvas.height],
        smoothing = renderer.canvas.getContext('2d')!.imageSmoothingEnabled
      const screenshot = renderer.canvas.toDataURL(),
        stats = renderer.inspect()
      const unchanged = JSON.stringify(state) === before
      state.player.health = 0
      renderer.draw(state, { phase: 'lost', reducedQuality: false, reducedMotion: false })
      const animatesDeath = renderer.hasEffects()
      for (let frame = 0; frame < 21; frame++) renderer.advanceVisual(0.05)
      renderer.draw(state, { phase: 'lost', reducedQuality: false, reducedMotion: false })
      const stoppedDeath = !renderer.hasEffects()
      renderer.dispose()
      renderer.dispose()
      assets.dispose()
      return {
        dimensions,
        smoothing,
        screenshot,
        stats,
        unchanged,
        animatesDeath,
        stoppedDeath,
        remaining: document.querySelectorAll('canvas').length,
      }
    })
    expect(result.dimensions).toEqual([540, 405])
    expect(result.smoothing).toBe(false)
    expect(result.screenshot.length).toBeGreaterThan(1000)
    expect(result.stats.drawCalls).toBe(1)
    expect(result.unchanged).toBe(true)
    expect(result.animatesDeath).toBe(true)
    expect(result.stoppedDeath).toBe(true)
    expect(result.remaining).toBe(0)
  } finally {
    await page.close()
  }
})
