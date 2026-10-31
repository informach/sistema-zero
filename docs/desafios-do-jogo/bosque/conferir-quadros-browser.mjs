import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// A chuva de pinhas inteira (o gabarito dos quadros 1 a 5 é o mesmo jogo), no computador com o
// teclado e no celular com o pad da extensão.
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
    const nome = mobile ? 'celular' : 'computador'
    const context = await browser.newContext({
      viewport: { width: mobile ? 390 : 1280, height: 844 },
      isMobile: mobile,
      hasTouch: mobile,
      deviceScaleFactor: 1,
    })
    try {
      const errors = []
      const html = await readFile(join(dir, 'chuva.html'), 'utf8')
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
      const ler = (field) =>
        page.evaluate(
          ({ scope, field }) => {
            const [root, ...path] = field.split('.')
            let current = globalThis[scope]?.get(root)?.v
            for (const key of path) current = current?.[key]
            return current
          },
          { scope, field },
        )
      const esperar = async (field, teste, ms = 15000) => {
        const fim = Date.now() + ms
        while (Date.now() < fim) {
          if (teste(await ler(field))) return
          await page.waitForTimeout(100)
        }
        throw Error(`${field} não chegou ao esperado (${await ler(field)})`)
      }
      const cdp = mobile ? await context.newCDPSession(page) : undefined
      const ACAO = { Enter: 'start', Space: 'jump', ArrowRight: 'right' }
      // Entrada real: a tecla, ou o dedo no botão do pad, apertados pelo tempo pedido.
      const apertar = async (key, ms = 80) => {
        if (!cdp) {
          await page.keyboard.down(key)
          await page.waitForTimeout(ms)
          return page.keyboard.up(key)
        }
        const box = await page.locator(`[data-sz-g2d-action="${ACAO[key]}"]`).boundingBox()
        assert(box, `Botão ${ACAO[key]} ausente no pad`)
        const ponto = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [ponto] })
        await page.waitForTimeout(ms)
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      }
      await esperar('pontos', (v) => v === 0)
      await page.screenshot({ path: join(out, `abertura-${nome}.png`) })
      await apertar('Enter')
      await esperar('pinhas.items.length', (v) => v >= 1)
      for (let i = 0; i < 20 && (await ler('pontos')) < 1; i++) {
        await apertar('Space')
        await page.waitForTimeout(350)
      }
      assert((await ler('pontos')) >= 1, 'nenhuma pinha quebrada')
      await page.screenshot({ path: join(out, `quebrou-${nome}.png`) })
      const antes = await ler('coelho.x')
      await apertar('ArrowRight', 500)
      assert((await ler('coelho.x')) > antes, 'o coelho não andou')
      // Parado, as pinhas caem nele até as vidas acabarem.
      await esperar('coelho.hp', (v) => v === 0, 20000)
      await page.waitForTimeout(400)
      await page.screenshot({ path: join(out, `fim-${nome}.png`) })
      await apertar('Enter')
      await esperar('coelho.hp', (v) => v === 3)
      await esperar('pontos', (v) => v === 0)
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
      assert.deepEqual(errors, [])
      results.push({ tela: nome, entrada: mobile ? 'pad de toque' : 'teclado', recomeco: true })
      console.log(`PASS chuva de pinhas ${nome}`)
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
  await writeFile(
    join(out, 'resultado.json'),
    `${JSON.stringify({ results, navegadorFechado: true }, null, 2)}\n`,
  )
}
