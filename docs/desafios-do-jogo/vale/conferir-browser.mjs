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
        if (url === 'https://vale.invalid/')
          return route.fulfill({ contentType: 'text/html', body: html })
        if (url === 'https://vale.invalid/favicon.ico') return route.fulfill({ status: 204 })
        errors.push(`Recurso externo inesperado: ${url}`)
        return route.abort()
      })
      const page = await context.newPage()
      page.on('pageerror', (e) => errors.push(e.message))
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text())
      })
      await page.goto('https://vale.invalid/')
      await page.waitForFunction((scope) => {
        const reader = globalThis[scope]
        return reader?.get('pontos')?.v === 0
      }, scope)
      const canvas = await page.locator('canvas[data-sz-game-2d-stage]').boundingBox()
      assert(canvas)
      const click = async (x, y) => {
        const cx = canvas.x + (x / 640) * canvas.width
        const cy = canvas.y + (y / 480) * canvas.height
        if (mobile) await page.touchscreen.tap(cx, cy)
        else await page.mouse.click(cx, cy)
      }
      await click(140, 316)
      await click(208, 444)
      await page.waitForFunction((scope) => globalThis[scope]?.get('comCinza')?.v === 2, scope)
      assert.equal(await page.evaluate((scope) => globalThis[scope].get('protegidos').v, scope), 1)
      assert.equal(await page.evaluate((scope) => globalThis[scope].get('pontos').v, scope), 1)
      assert(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        'Rolagem horizontal',
      )
      const filename = `2026-10-29-vale-desafio-${nome}.png`
      await page.screenshot({ path: resolve(out, filename), fullPage: true })
      await click(430, 444)
      await page.waitForFunction((scope) => {
        const reader = globalThis[scope]
        return reader?.get('pontos')?.v === 0 && reader.get('onda')?.v === 0
      }, scope)
      assert.deepEqual(errors, [])
      console.log(
        `${mobile ? 'Celular emulado, toque' : 'Computador, teclado'}: cobertura, onda, lista, contagens e reinício aprovados; ${filename}`,
      )
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
