import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const { chromium } = await import(process.env.SZ_PLAYWRIGHT_URL)
const [gameFile, out] = process.argv.slice(2)
const html = await readFile(gameFile, 'utf8')
await mkdir(out, { recursive: true })
const executablePath = process.env.SZ_CHECK_CHROMIUM
const scope = '__sz0123456789abcdef01234567'
// Sem placa de vídeo, como num aparelho modesto: o desenho vai todo pelo SwiftShader.
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
/** Lê uma variável do jogo pelo leitor da instrumentação (só observa, não muda nada). */
const ler = (page, caminho) =>
  page.evaluate(
    ([scope, caminho]) => {
      const [nome, campo] = caminho.split('.')
      const v = globalThis[scope]?.get(nome)?.v
      return campo ? v?.[campo] : v
    },
    [scope, caminho],
  )
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
        if (url === 'https://nuvens.invalid/')
          return route.fulfill({ contentType: 'text/html', body: html })
        if (url === 'https://nuvens.invalid/favicon.ico') return route.fulfill({ status: 204 })
        errors.push(`Recurso externo inesperado: ${url}`)
        return route.abort()
      })
      const page = await context.newPage()
      page.on('pageerror', (e) => errors.push(e.message))
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text())
      })
      await page.goto('https://nuvens.invalid/')
      await page.waitForFunction((scope) => globalThis[scope]?.get('tempo')?.v >= 0, scope, {
        timeout: 10000,
      })
      const canvas = await page.locator('canvas[data-sz-game-2d-stage]').boundingBox()
      assert(canvas)
      const tocar = async (x, y) => {
        const cx = canvas.x + (x / 640) * canvas.width
        const cy = canvas.y + (y / 480) * canvas.height
        if (mobile) await page.touchscreen.tap(cx, cy)
        else await page.mouse.click(cx, cy)
      }
      // Regar quatro vezes e dar sol três: doze de cada, a flor chega a cem em dez segundos.
      // O primeiro toque no palco só o ativa: um toque no céu vazio antes de regar.
      await tocar(320, 200)
      await page.waitForTimeout(150)
      // Espaço/A rega e a seta para cima dá sol (teclas da trilha, C01b), um toque por vez.
      const input = async (action, key) => {
        if (mobile) await page.locator(`[data-sz-g2d-action="${action}"]`).tap()
        else await page.keyboard.press(key)
      }
      for (let i = 0; i < 4; i++) {
        await input('jump', 'Space')
        await page.waitForTimeout(150)
      }
      for (let i = 0; i < 3; i++) {
        await input('up', 'ArrowUp')
        await page.waitForTimeout(150)
      }
      assert((await ler(page, 'agua')) >= 10, 'Regar não guardou a água')
      assert((await ler(page, 'sol')) >= 10, 'Sol não guardou o sol')
      await page.waitForFunction((scope) => globalThis[scope]?.get('florida')?.v === true, scope, {
        timeout: 20000,
      })
      assert((await ler(page, 'crescimento')) >= 100)
      assert.equal(await ler(page, 'recado'), 'O jardim floresceu.')
      assert(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        'Rolagem horizontal',
      )
      const filename = `2026-10-30-nuvens-desafio-${nome}.png`
      await page.screenshot({ path: resolve(out, filename), fullPage: true })
      // Enter recomeça o jardim (o extra do gabarito).
      await page.keyboard.press('Enter')
      await page.waitForFunction(
        (scope) => {
          const reader = globalThis[scope]
          return reader?.get('florida')?.v === false && reader.get('crescimento')?.v < 11
        },
        scope,
        { timeout: 5000 },
      )
      assert.deepEqual(errors, [])
      console.log(
        `${mobile ? 'Celular emulado, toque' : 'Computador, teclado'} (${width} x ${height}): regar, dar sol, florescer e recomeçar aprovados; ${filename}`,
      )
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
