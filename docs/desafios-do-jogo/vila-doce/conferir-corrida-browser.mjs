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
    for (const variacao of ['corrida', 'entregas', 'tempo', 'caixa']) {
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
        const wait = (field, value) =>
          page.waitForFunction(
            ({ scope, field, value }) => {
              const [root, ...path] = field.split('.')
              let current = globalThis[scope]?.get(root)?.v
              for (const key of path) current = current?.[key]
              return current === value
            },
            { scope, field, value },
            { timeout: 15000 },
          )
        const input = async (action, key) => {
          if (mobile) await page.locator(`[data-sz-g2d-action="${action}"]`).tap()
          else await page.keyboard.press(key)
        }
        const cdp = mobile ? await context.newCDPSession(page) : undefined
        // Entrada real e espera por posição observada; nunca altera o estado do jogo pelo teste.
        const andar = async (action, key, eixo, alvo, sinal) => {
          if (cdp) {
            const box = await page.locator(`[data-sz-g2d-action="${action}"]`).boundingBox()
            assert(box, 'Controle de toque ausente')
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchStart',
              touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
            })
          } else await page.keyboard.down(key)
          try {
            await page.waitForFunction(
              ({ scope, eixo, alvo, sinal }) => {
                const estado = globalThis[scope]
                return (
                  !estado.get('correndo')?.v ||
                  (estado.get('entregador')?.v?.[eixo] - alvo) * sinal >= 0
                )
              },
              { scope, eixo, alvo, sinal },
              { timeout: 5000 },
            )
          } finally {
            if (cdp)
              await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
            else await page.keyboard.up(key)
          }
        }
        await wait('correndo', false)
        await input('start', 'Enter')
        await wait('correndo', true)
        await wait('entregador.x', 48)
        if (variacao === 'caixa') await andar('down', 'ArrowDown', 'y', 360, 1)
        else await andar('up', 'ArrowUp', 'y', 165, -1)
        if (variacao === 'entregas') {
          await andar('right', 'ArrowRight', 'x', 210, 1)
          await wait('entregas', 1)
          await page.waitForTimeout(300)
          await wait('entregas', 1)
        }
        await andar('right', 'ArrowRight', 'x', 550, 1)
        if (variacao === 'caixa') await andar('up', 'ArrowUp', 'y', 270, -1)
        else await andar('down', 'ArrowDown', 'y', 270, 1)
        await wait('correndo', false)
        await wait('entregas', variacao === 'entregas' ? 2 : 1)
        await wait('recado', 'Entrega feita. Os doces chegaram.')
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
        const print = `${variacao}-${tela}.png`
        await page.screenshot({ path: join(out, print), fullPage: true })
        await input('jump', 'Space')
        await wait('correndo', true)
        await wait('entregador.x', 48)
        await wait('entregador.y', 270)
        await wait('entregas', 0)
        await wait('recado', '')
        if (variacao === 'tempo') {
          await wait('correndo', false)
          await wait('tempo', 0)
          await wait('entregas', 0)
          await input('start', 'Enter')
          await wait('correndo', true)
        }
        assert.deepEqual(errors, [])
        resultados.push({
          variacao,
          tela,
          entrada: mobile ? 'toque real CDP' : 'teclado',
          entrega: true,
          reinicioExtra: true,
          print,
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
