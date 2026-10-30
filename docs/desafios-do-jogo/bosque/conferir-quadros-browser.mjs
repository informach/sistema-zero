import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const { chromium } = await import(process.env.SZ_PLAYWRIGHT_URL)
const [dir, out] = process.argv.slice(2)
await mkdir(out, { recursive: true })
const scope = '__sz0123456789abcdef01234567'
const browser = await chromium.launch({
  executablePath: process.env.SZ_CHECK_CHROMIUM,
  headless: true,
})
const results = []
try {
  for (const mobile of [false, true]) {
    for (const quadro of [1, 2, 3, 4, 5]) {
      const nome = mobile ? 'celular' : 'computador'
      const context = await browser.newContext({
        viewport: { width: mobile ? 390 : 1280, height: 844 },
        isMobile: mobile,
        hasTouch: mobile,
        deviceScaleFactor: 1,
      })
      try {
        const errors = []
        const html = await readFile(join(dir, `${quadro}.html`), 'utf8')
        await context.route('**/*', (route) => {
          if (route.request().url() === 'https://bosque.invalid/')
            return route.fulfill({ contentType: 'text/html', body: html })
          if (route.request().url() === 'https://bosque.invalid/favicon.ico')
            return route.fulfill({ status: 204 })
          errors.push(`Recurso externo inesperado: ${route.request().url()}`)
          return route.abort()
        })
        const page = await context.newPage()
        page.on('pageerror', (e) => errors.push(e.message))
        page.on('console', (m) => {
          if (m.type() === 'error') errors.push(m.text())
        })
        await page.goto('https://bosque.invalid/')
        const field = ['aceso', 'entregue', 'terminou', 'cuidados', 'chegou'][quadro - 1]
        const initial = quadro === 4 ? 0 : false
        const final = quadro === 4 ? 4 : true
        const waitValue = (value) =>
          page.waitForFunction(
            ({ scope, field, value }) => globalThis[scope]?.get(field)?.v === value,
            { scope, field, value },
            { timeout: 12000, polling: 'raf' },
          )
        await waitValue(initial)
        const cdp = mobile ? await context.newCDPSession(page) : undefined
        const key = quadro === 1 || quadro === 5 ? 'Space' : 'ArrowRight'
        if (cdp) {
          const box = await page
            .locator(`[data-sz-g2d-action="${key === 'Space' ? 'jump' : 'right'}"]`)
            .boundingBox()
          assert(box, 'Controle de toque ausente')
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
          })
        } else await page.keyboard.down(key)
        try {
          await waitValue(final)
        } finally {
          if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
          else await page.keyboard.up(key)
        }
        assert(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          'Rolagem horizontal',
        )
        const canvas = await page.locator('canvas[data-sz-game-2d-stage]').boundingBox()
        assert(
          canvas &&
            canvas.width > 200 &&
            canvas.x >= 0 &&
            canvas.x + canvas.width <= page.viewportSize().width + 1,
        )
        const print = `quadro-${quadro}-${nome}.png`
        await page.screenshot({ path: join(out, print), fullPage: true })
        if (mobile) {
          await page.locator('[data-sz-g2d-action="start"]').tap()
          await waitValue(initial)
        } else {
          await page.keyboard.press('Enter')
          await waitValue(initial)
        }
        assert.deepEqual(errors, [])
        results.push({
          quadro,
          tela: nome,
          entrada: mobile ? 'toque real CDP' : 'teclado',
          resultado: final,
          reinicio: true,
          print,
        })
        console.log(`PASS quadro ${quadro} ${nome}`)
      } finally {
        await context.close()
      }
    }
  }
} finally {
  await browser.close()
  await writeFile(
    join(out, 'resultado.json'),
    `${JSON.stringify({ casos: results, browserFechado: true }, null, 2)}\n`,
  )
}
