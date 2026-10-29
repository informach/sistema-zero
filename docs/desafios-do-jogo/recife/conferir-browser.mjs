import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const { chromium } = await import(process.env.SZ_PLAYWRIGHT_URL)
const [gameFile, out] = process.argv.slice(2)
const html = await readFile(gameFile, 'utf8')
await mkdir(out, { recursive: true })
const executablePath = process.env.SZ_CHECK_CHROMIUM
const scope = '__sz0123456789abcdef01234567'
const browser = await chromium.launch({ executablePath, headless: true })
try {
  for (const { mobile, width, height, nome } of [
    { mobile: false, width: 1280, height: 844, nome: 'computador' },
    { mobile: true, width: 390, height: 844, nome: 'celular' },
    { mobile: false, width: 640, height: 480, nome: 'compacto' },
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: mobile,
      hasTouch: mobile,
      deviceScaleFactor: 1,
    })
    try {
      const errors = []
      await context.route('**/*', (route) => {
        const url = route.request().url()
        if (url === 'https://recife.invalid/')
          return route.fulfill({ contentType: 'text/html', body: html })
        if (url === 'https://recife.invalid/favicon.ico') return route.fulfill({ status: 204 })
        errors.push(`Recurso externo inesperado: ${url}`)
        return route.abort()
      })
      const page = await context.newPage()
      page.on('pageerror', (e) => errors.push(e.message))
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text())
      })
      await page.goto('https://recife.invalid/')
      await page.waitForFunction((scope) => {
        const reader = globalThis[scope]
        return reader?.get('pontos')?.v === 0
      }, scope)
      const touch = mobile ? await context.newCDPSession(page) : undefined
      if (touch) {
        const button = await page.locator('[data-sz-g2d-action="right"]').boundingBox()
        assert(button)
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x: button.x + button.width / 2, y: button.y + button.height / 2 }],
        })
      } else await page.keyboard.down('ArrowRight')
      try {
        await page.waitForFunction(
          (scope) => {
            const reader = globalThis[scope]
            return (reader?.get('mira')?.v.x ?? 0) >= 420
          },
          scope,
          { timeout: 5000, polling: 'raf' },
        )
      } finally {
        if (touch)
          await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        else await page.keyboard.up('ArrowRight')
      }
      const canvas = await page.locator('canvas[data-sz-game-2d-stage]').boundingBox()
      assert(canvas)
      const click = async (x, y) => {
        const cx = canvas.x + (x / 640) * canvas.width
        const cy = canvas.y + (y / 480) * canvas.height
        if (mobile) await page.touchscreen.tap(cx, cy)
        else await page.mouse.click(cx, cy)
      }
      await click(286, 446)
      await page.waitForFunction(
        (scope) => {
          const reader = globalThis[scope]
          return reader?.get('preso')?.v === true && reader.get('pontos')?.v === 1
        },
        scope,
        { timeout: 5000 },
      )
      assert(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        'Rolagem horizontal',
      )
      const filename = `2026-10-29-recife-desafio-${nome}.png`
      await page.screenshot({ path: resolve(out, filename), fullPage: true })
      await click(482, 446)
      await page.waitForFunction((scope) => {
        const reader = globalThis[scope]
        return reader?.get('pontos')?.v === 0 && reader.get('preso')?.v === false
      }, scope)
      assert.deepEqual(errors, [])
      console.log(
        `${mobile ? 'Celular emulado, toque' : 'Computador, teclado'}: mira, captura, ponto e reinício aprovados; ${filename}`,
      )
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
