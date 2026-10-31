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
    for (const variacao of ['corrida', 'pedras', 'noite', 'placar']) {
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
        const value = (field) =>
          page.evaluate(
            ({ scope, field }) => {
              const [root, ...path] = field.split('.')
              let current = globalThis[scope].get(root)?.v
              for (const key of path) current = current?.[key]
              return current
            },
            { scope, field },
          )
        const input = async (action, key) => {
          if (mobile) await page.locator(`[data-sz-g2d-action="${action}"]`).tap()
          else await page.keyboard.press(key)
        }
        await wait('correndo', false)
        if (variacao === 'corrida') {
          for (const [action, key, bicho] of [
            ['up', 'ArrowUp', 'cachorro'],
            ['left', 'ArrowLeft', 'gato'],
            ['right', 'ArrowRight', 'coelho'],
            ['down', 'ArrowDown', 'porquinho'],
          ]) {
            await input(action, key)
            await wait('escolhido', bicho)
            await input(action, key)
            await wait('escolhido', '')
          }
          await input('up', 'ArrowUp')
          await wait('escolhido', 'cachorro')
          await input('start', 'Enter')
          await wait('correndo', true)
          assert.equal(await value('cachorro.x'), 0)
          await input('jump', 'Space')
          await wait('cachorro.x', 12)
          await input('left', 'ArrowLeft')
          await wait('escolhido', 'cachorro')
        } else if (variacao === 'noite') {
          await input('jump', 'Space')
          await wait('noite.opacity', 0.15)
          await input('jump', 'Space')
          await wait('noite.opacity', 0.94)
          await input('jump', 'Space')
          await wait('noite.opacity', 0.15)
          assert.equal(await value('cachorro.x'), 0)
          await input('start', 'Enter')
          await wait('correndo', true)
        } else {
          await input('start', 'Enter')
          await wait('correndo', true)
        }
        await wait('correndo', false)
        assert.notEqual(await value('vencedor'), '')
        if (variacao === 'pedras')
          for (const b of ['cachorro', 'gato', 'coelho', 'porquinho']) await wait(`pulo_${b}`, 40)
        if (variacao === 'placar') {
          await wait('corridas', 1)
          await input('start', 'Enter')
          await wait('correndo', true)
          assert.equal(await value('corridas'), 1)
          await input('jump', 'Space')
          await wait('corridas', 0)
        } else {
          await input(
            variacao === 'pedras' ? 'jump' : 'start',
            variacao === 'pedras' ? 'Space' : 'Enter',
          )
          await wait('correndo', true)
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
        const print = `${variacao}-${tela}.png`
        await page.screenshot({ path: join(out, print), fullPage: true })
        assert.deepEqual(errors, [])
        resultados.push({
          variacao,
          tela,
          entrada: mobile ? 'toque em controles reais' : 'teclado',
          repeticao: true,
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
