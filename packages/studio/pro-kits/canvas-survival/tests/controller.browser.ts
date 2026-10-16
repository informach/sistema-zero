// Node owns Playwright's Windows transport; Bun owns the materialized project server.
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { type Browser, chromium, expect, type Page } from '@playwright/test'

const base = process.argv[2]!,
  artifactDirectory = process.argv[3]!
let browser: Browser
before(async () => {
  browser = await chromium.launch({ headless: true })
  await mkdir(artifactDirectory, { recursive: true })
})
after(async () => {
  await browser?.close()
})

interface Snapshot {
  phase: string
  readiness: string
  tick: number
  seed: number
  health: number
  player: { x: number; y: number }
  targets: Array<{ x: number; y: number }>
  kills: number
  resultReason?: string
  render: { textures: number; drawCalls: number }
}
interface BrowserAudit {
  raf: number
  observers: number
  bitmaps: number
  listeners: number
  arcs: number[]
}
const inspect = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { __studioGame: { inspect(): Snapshot } }).__studioGame.inspect(),
  )
const audit = (page: Page) =>
  page.evaluate(() => (window as unknown as { __arenaAudit(): BrowserAudit }).__arenaAudit())
async function ready(page: Page, variant = 'normal') {
  await page.goto(`${base + variant}/nested/game/`)
  await expect.poll(async () => (await inspect(page)).readiness).toBe('ready')
  await expect(page.locator('#start')).toBeEnabled()
}
async function trackedPage(options: { mobile?: boolean } = {}) {
  const page = await browser.newPage(
    options.mobile
      ? {
          viewport: { width: 360, height: 844 },
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true,
        }
      : { viewport: { width: 1100, height: 900 } },
  )
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => {
    // Deterministic entropy is a browser boundary fixture. Product inspection remains read-only.
    let seed = 12000
    crypto.getRandomValues = ((array: Uint32Array) => {
      for (let i = 0; i < array.length; i++) array[i] = ++seed
      return array
    }) as typeof crypto.getRandomValues
    const frames = new Set<number>(),
      bitmaps = new Set<ImageBitmap>(),
      arcs: number[] = []
    let observers = 0
    const request = window.requestAnimationFrame.bind(window),
      cancel = window.cancelAnimationFrame.bind(window)
    window.requestAnimationFrame = (callback) => {
      const id = request((time) => {
        frames.delete(id)
        callback(time)
      })
      frames.add(id)
      return id
    }
    window.cancelAnimationFrame = (id) => {
      frames.delete(id)
      cancel(id)
    }
    const Observer = window.ResizeObserver
    window.ResizeObserver = class extends Observer {
      live = true
      constructor(callback: ResizeObserverCallback) {
        super(callback)
        observers++
      }
      disconnect() {
        if (this.live) {
          this.live = false
          observers--
        }
        super.disconnect()
      }
    }
    const decode = window.createImageBitmap.bind(window),
      close = ImageBitmap.prototype.close
    window.createImageBitmap = (async (...args: Parameters<typeof createImageBitmap>) => {
      const bitmap = await (
        decode as (...args: Parameters<typeof createImageBitmap>) => Promise<ImageBitmap>
      )(...args)
      bitmaps.add(bitmap)
      return bitmap
    }) as typeof createImageBitmap
    ImageBitmap.prototype.close = function () {
      bitmaps.delete(this)
      close.call(this)
    }
    const arc = CanvasRenderingContext2D.prototype.arc
    CanvasRenderingContext2D.prototype.arc = function (...args) {
      arcs.push(args[2])
      if (arcs.length > 256) arcs.shift()
      arc.apply(this, args)
    }
    const media = new WeakSet<EventTarget>(),
      match = window.matchMedia.bind(window)
    window.matchMedia = (query) => {
      const result = match(query)
      media.add(result)
      return result
    }
    const add = EventTarget.prototype.addEventListener,
      remove = EventTarget.prototype.removeEventListener
    const tracked = new Set<{
      target: EventTarget
      type: string
      listener: EventListenerOrEventListenerObject | null
    }>()
    const events = new Set(['keydown', 'keyup', 'blur', 'resize', 'visibilitychange', 'pagehide'])
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (
        ((this === window || this === document) && events.has(type)) ||
        (media.has(this) && type === 'change')
      ) {
        const entry = { target: this, type, listener }
        tracked.add(entry)
        if (typeof options === 'object' && options.signal)
          add.call(options.signal, 'abort', () => tracked.delete(entry), { once: true })
      }
      add.call(this, type, listener, options)
    }
    EventTarget.prototype.removeEventListener = function (type, listener, options) {
      for (const entry of tracked)
        if (entry.target === this && entry.type === type && entry.listener === listener)
          tracked.delete(entry)
      remove.call(this, type, listener, options)
    }
    Object.assign(window, {
      __arenaAudit: () => ({
        raf: frames.size,
        observers,
        bitmaps: bitmaps.size,
        listeners: tracked.size,
        arcs: [...arcs],
      }),
    })
  })
  return { page, errors }
}
async function dispose(page: Page) {
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })),
  )
  await expect(page.locator('canvas')).toHaveCount(0)
  await expect
    .poll(async () => {
      const { arcs: _, ...resources } = await audit(page)
      return resources
    })
    .toEqual({ raf: 0, observers: 0, bitmaps: 0, listeners: 0 })
  expect(await page.evaluate(() => '__studioGame' in window)).toBe(false)
}

test('menu, movement, pulse, pause and reset preserve the intended seed semantics', async () => {
  const { page, errors } = await trackedPage()
  try {
    await ready(page)
    expect((await inspect(page)).phase).toBe('menu')
    expect((await inspect(page)).render.textures).toBe(3)
    await page.screenshot({ path: join(artifactDirectory, 'arena-menu.png'), fullPage: true })
    await page.locator('#start').click()
    const started = await inspect(page)
    await page.keyboard.down('ArrowRight')
    await expect
      .poll(async () => (await inspect(page)).player.x)
      .toBeGreaterThan(started.player.x + 15)
    await page.keyboard.up('ArrowRight')
    await expect.poll(async () => (await inspect(page)).targets.length).toBeGreaterThan(0)
    await page.keyboard.press('Space')
    await expect(page.locator('#hud')).not.toContainText('Pulso: pronto')
    await page.screenshot({ path: join(artifactDirectory, 'arena-playing.png'), fullPage: true })
    await page.keyboard.press('Escape')
    expect((await inspect(page)).phase).toBe('paused')
    const paused = await inspect(page)
    await page.waitForTimeout(120)
    expect((await inspect(page)).tick).toBe(paused.tick)
    await page.locator('#start').click()
    await expect.poll(async () => (await inspect(page)).tick).toBeGreaterThan(paused.tick)
    await page.locator('#restart').click()
    expect((await inspect(page)).seed).toBe(started.seed)
    await page.locator('#menu').click()
    expect((await inspect(page)).phase).toBe('menu')
    await page.locator('#start').click()
    expect((await inspect(page)).seed).not.toBe(started.seed)
    expect(
      Object.keys(
        await page.evaluate(() => (window as unknown as { __studioGame: object }).__studioGame),
      ),
    ).toEqual(['version', 'inspect'])
    await dispose(page)
    expect(errors).toEqual([])
  } finally {
    await page.close()
  }
})

test('loading errors disable start, retry real resources, and disposal cancels a pending load', async () => {
  const { page, errors } = await trackedPage()
  try {
    await page.route('**/studio-assets/manifest.json', (route) =>
      route.fulfill({ status: 503, body: 'unavailable' }),
    )
    await page.goto(`${base}normal/nested/game/`)
    await expect.poll(async () => (await inspect(page)).readiness).toBe('error')
    await expect(page.locator('#start')).toBeDisabled()
    await expect(page.locator('#retry')).toBeFocused()
    await page.unroute('**/studio-assets/manifest.json')
    await page.locator('#retry').click()
    await expect.poll(async () => (await inspect(page)).readiness).toBe('ready')
    await expect(page.locator('canvas')).toHaveCount(1)
    await dispose(page)
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route('**/studio-assets/manifest.json', async (route) => {
      await gate
      await route.continue().catch(() => {})
    })
    await page.evaluate(async () => {
      await import('./main.js?pending=1')
    })
    await expect.poll(async () => (await inspect(page)).readiness).toBe('loading')
    await expect(page.locator('#start')).toBeDisabled()
    await dispose(page)
    release()
    await page.waitForTimeout(100)
    await expect(page.locator('#app')).toBeEmpty()
    expect(errors).toEqual([])
  } finally {
    await page.close()
  }
})

test('touch contacts, native editable modal and responsive resize keep gameplay coherent', async () => {
  const { page, errors } = await trackedPage({ mobile: true })
  try {
    await ready(page)
    await page.locator('#start').click()
    const start = await inspect(page)
    await page.locator('#controls').scrollIntoViewIfNeeded()
    const points = []
    for (const [id, action] of ['left', 'up', 'action'].entries()) {
      const box = await page.locator(`[data-action="${action}"]`).boundingBox()
      expect(box).not.toBeNull()
      points.push({ id, x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 })
    }
    const session = await page.context().newCDPSession(page)
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points })
    await expect.poll(async () => (await inspect(page)).player.x).toBeLessThan(start.player.x - 5)
    await expect.poll(async () => (await inspect(page)).player.y).toBeLessThan(start.player.y - 5)
    await expect(page.locator('#hud')).not.toContainText('Pulso: pronto')
    await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
    const released = await inspect(page)
    await page.waitForTimeout(80)
    expect((await inspect(page)).player).toEqual(released.player)
    await page.screenshot({ path: join(artifactDirectory, 'arena-mobile.png'), fullPage: true })
    await page.evaluate(() => {
      const dialog = document.createElement('dialog')
      dialog.innerHTML = '<input aria-label="Texto do modal" autofocus>'
      document.body.append(dialog)
      dialog.showModal()
    })
    await page.getByLabel('Texto do modal').press('w')
    expect((await inspect(page)).player).toEqual(released.player)
    await page.evaluate(() => {
      const dialog = document.querySelector('dialog')!
      dialog.close()
      dialog.remove()
    })
    await page.locator('#pause').click()
    const beforeResize = await inspect(page)
    await page.setViewportSize({ width: 844, height: 390 })
    await expect
      .poll(async () => page.locator('canvas').evaluate((canvas) => canvas.width))
      .toBeGreaterThan(390)
    expect((await inspect(page)).player).toEqual(beforeResize.player)
    expect(
      await page.locator('canvas').evaluate((canvas) => ({
        width: canvas.width,
        client: canvas.clientWidth,
        smooth: canvas.getContext('2d')!.imageSmoothingEnabled,
      })),
    ).toMatchObject({ smooth: false })
    await dispose(page)
    expect(errors).toEqual([])
  } finally {
    await page.close()
  }
})

test('motion preference changes reach the real pulse renderer', async () => {
  const { page, errors } = await trackedPage()
  try {
    await ready(page)
    await page.locator('#start').click()
    await page.keyboard.press('Space')
    await expect.poll(async () => (await audit(page)).arcs.length).toBeGreaterThan(0)
    expect(Math.min(...(await audit(page)).arcs)).toBeLessThan(100)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForTimeout(700)
    const before = (await audit(page)).arcs.length
    await page.keyboard.press('Space')
    await expect.poll(async () => (await audit(page)).arcs.length).toBeGreaterThan(before)
    const reduced = (await audit(page)).arcs.slice(before)
    expect(reduced.length).toBeGreaterThan(0)
    expect(reduced.every((radius) => radius === 100)).toBe(true)
    await dispose(page)
    expect(errors).toEqual([])
  } finally {
    await page.close()
  }
})

test('authored configuration variants achieve both victories and a health defeat through real input', async () => {
  const { page, errors } = await trackedPage()
  try {
    await ready(page, 'time')
    await page.locator('#start').click()
    await expect.poll(async () => (await inspect(page)).phase).toBe('won')
    expect((await inspect(page)).resultReason).toBe('time')
    await expect(page.locator('#restart')).toBeFocused()
    await ready(page, 'kills')
    await page.locator('#start').click()
    await expect.poll(async () => (await inspect(page)).tick).toBeGreaterThan(10)
    await page.keyboard.press('Space')
    await expect.poll(async () => (await inspect(page)).phase).toBe('won')
    expect((await inspect(page)).resultReason).toBe('kills')
    expect((await inspect(page)).kills).toBeGreaterThanOrEqual(2)
    await ready(page, 'loss')
    await page.locator('#start').click()
    await expect.poll(async () => (await inspect(page)).phase).toBe('lost')
    expect((await inspect(page)).resultReason).toBe('health')
    expect((await inspect(page)).health).toBe(0)
    await dispose(page)
    expect(errors).toEqual([])
  } finally {
    await page.close()
  }
})

test('twenty complete mount/play/dispose cycles release RAF, listeners, observers and decoded PNGs', async () => {
  const { page, errors } = await trackedPage()
  try {
    await ready(page)
    for (let cycle = 0; cycle < 20; cycle++) {
      if (cycle) {
        await page.evaluate(async (index) => {
          await import(`./main.js?cycle=${index}`)
        }, cycle)
        await expect.poll(async () => (await inspect(page)).readiness).toBe('ready')
      }
      await expect(page.locator('canvas')).toHaveCount(1)
      expect((await audit(page)).observers).toBe(1)
      expect((await audit(page)).bitmaps).toBe(3)
      await page.locator('#start').click()
      await expect.poll(async () => (await inspect(page)).tick).toBeGreaterThan(0)
      expect((await audit(page)).raf).toBeLessThanOrEqual(1)
      await dispose(page)
    }
    expect(errors).toEqual([])
  } finally {
    await page.close()
  }
})

test('focus loss resumes paused without applying elapsed background time', async () => {
  const { page, errors } = await trackedPage()
  try {
    await ready(page)
    await page.locator('#start').click()
    await expect.poll(async () => (await inspect(page)).tick).toBeGreaterThan(2)
    // Browser tab focus is the public blur boundary; no simulation mutators are exposed.
    await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    const paused = await inspect(page)
    expect(paused.phase).toBe('paused')
    await page.waitForTimeout(150)
    expect((await inspect(page)).tick).toBe(paused.tick)
    await page.locator('#start').click()
    await expect.poll(async () => (await inspect(page)).tick).toBeGreaterThan(paused.tick)
    expect((await inspect(page)).tick - paused.tick).toBeLessThan(15)
    await dispose(page)
    expect(errors).toEqual([])
  } finally {
    await page.close()
  }
})

test('a retry left in the UI cannot restart a disposed controller', async () => {
  const { page, errors } = await trackedPage()
  try {
    await ready(page)
    await dispose(page)
    let requests = 0
    await page.route('**/studio-assets/manifest.json', (route) => {
      requests++
      return route.fulfill({ status: 503, body: 'unavailable' })
    })
    const result = await page.evaluate(async () => {
      const { createGame, createInput, createUI } = await import('./controller-fixture.js')
      const ui = createUI('Fixture', 'Controller ownership', { readiness: 'loading' })
      const input = createInput(
        ui.controls,
        () => ui.phase === 'playing' && ui.readiness === 'ready',
      )
      const game = createGame(ui, input)
      try {
        for (let attempt = 0; attempt < 100 && ui.readiness === 'loading'; attempt++)
          await new Promise((resolve) => setTimeout(resolve, 10))
        const before = ui.readiness
        game.dispose()
        document.querySelector<HTMLButtonElement>('#retry')!.click()
        await new Promise((resolve) => setTimeout(resolve, 100))
        return { before, canvases: document.querySelectorAll('canvas').length }
      } finally {
        game.dispose()
        input.destroy()
        ui.destroy()
      }
    })
    expect(result).toEqual({ before: 'error', canvases: 0 })
    expect(requests).toBe(1)
    expect((await audit(page)).bitmaps).toBe(0)
    expect((await audit(page)).observers).toBe(0)
    expect(errors).toEqual([])
  } finally {
    await page.close()
  }
})
