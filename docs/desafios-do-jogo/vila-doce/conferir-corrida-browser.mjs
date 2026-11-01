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
const resultados = []
try {
  for (const mobile of [false, true])
    for (const variacao of ['corrida', 'pulo-alto', 'pombos']) {
      const tela = mobile ? 'celular' : 'computador'
      const context = await browser.newContext({
        viewport: { width: mobile ? 390 : 1280, height: 844 },
        isMobile: mobile,
        hasTouch: mobile,
        deviceScaleFactor: 1,
      })
      try {
        const errors = []
        const html = await readFile(join(dir, `${variacao}.html`), 'utf8')
        await context.route('**/*', (route) => {
          if (route.request().url() === 'https://vila.invalid/')
            return route.fulfill({ contentType: 'text/html', body: html })
          if (route.request().url() === 'https://vila.invalid/favicon.ico')
            return route.fulfill({ status: 204 })
          errors.push(`Recurso externo inesperado: ${route.request().url()}`)
          return route.abort()
        })
        const page = await context.newPage()
        page.on('pageerror', (e) => errors.push(e.message))
        page.on('console', (m) => {
          if (m.type() === 'error') errors.push(m.text())
        })
        await page.goto('https://vila.invalid/')
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
        const esperar = (field, teste, valor) =>
          page.waitForFunction(
            ({ scope, field, teste, valor }) => {
              const [root, ...path] = field.split('.')
              let current = globalThis[scope]?.get(root)?.v
              for (const key of path) current = current?.[key]
              return teste === 'igual'
                ? current === valor
                : teste === 'menor'
                  ? current < valor
                  : current >= valor
            },
            { scope, field, teste, valor },
            { timeout: 15000 },
          )
        const canvas = page.locator('canvas[data-sz-game-2d-stage]')
        // Entrada real: tecla no computador, toque na metade de cima do palco no celular (o
        // toque em cima é o pulo do dinossauro, e qualquer toque começa e recomeça).
        const cdp = mobile ? await context.newCDPSession(page) : undefined
        // O jogo lê as teclas e o dedo a cada quadro: a entrada fica apertada por 80 ms, como a
        // de uma pessoa (um aperto mais curto que um quadro passa sem ser visto).
        const tocar = async (key) => {
          if (!cdp) {
            await page.keyboard.down(key)
            await page.waitForTimeout(80)
            return page.keyboard.up(key)
          }
          const box = await canvas.boundingBox()
          assert(box, 'Palco ausente')
          const ponto = { x: box.x + box.width / 2, y: box.y + box.height * 0.3 }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [ponto] })
          await page.waitForTimeout(80)
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        }
        await esperar('metros', 'igual', 0)
        await page.screenshot({ path: join(out, `${variacao}-abertura-${tela}.png`) })
        await tocar('Enter')
        // O pulo vem logo depois da largada, antes da primeira pedra chegar (uma tecla na tela
        // de fim recomeçaria a corrida).
        await esperar('entregador.y', 'maior', 168)
        await tocar('Space')
        await esperar('entregador.y', 'menor', 140)
        await page.screenshot({ path: join(out, `${variacao}-pulo-${tela}.png`) })
        // Na corrida pelos telhados, a primeira chaminé chegando (lacunas, 01/11/2026).
        if (variacao === 'corrida') {
          await esperar('chamine1.x', 'menor', 300)
          await page.screenshot({ path: join(out, `${variacao}-chamine-${tela}.png`) })
        }
        // Sem pular de novo, uma pedra (ou chaminé) alcança o entregador e a corrida acaba.
        let antes = await ler('metros')
        for (let i = 0; i < 30; i++) {
          await page.waitForTimeout(1200)
          const agora = await ler('metros')
          if (agora === antes) break
          antes = agora
        }
        await page.screenshot({ path: join(out, `${variacao}-fim-${tela}.png`) })
        const velocidade = await ler('velocidade')
        assert(velocidade <= -5 && velocidade >= -9, `velocidade fora do limite: ${velocidade}`)
        await tocar('Enter')
        await esperar('metros', 'igual', 0)
        assert(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          'Rolagem horizontal',
        )
        const box = await canvas.boundingBox()
        assert(
          box &&
            box.width > 200 &&
            box.x >= 0 &&
            box.x + box.width <= page.viewportSize().width + 1,
        )
        assert.deepEqual(errors, [])
        resultados.push({
          variacao,
          tela,
          entrada: mobile ? 'toque' : 'teclado',
          metrosAntesDoTombo: antes,
          velocidadeNoFim: velocidade,
        })
        console.log(`PASS ${variacao} ${tela}`)
      } finally {
        await context.close()
      }
    }
} finally {
  await browser.close()
  await writeFile(
    join(out, 'resultado.json'),
    `${JSON.stringify({ resultados, navegadorFechado: true }, null, 2)}\n`,
  )
}
