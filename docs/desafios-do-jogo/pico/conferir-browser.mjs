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
        if (url === 'https://pico.invalid/')
          return route.fulfill({ contentType: 'text/html', body: html })
        if (url === 'https://pico.invalid/favicon.ico') return route.fulfill({ status: 204 })
        errors.push(`Recurso externo inesperado: ${url}`)
        return route.abort()
      })
      const page = await context.newPage()
      page.on('pageerror', (e) => errors.push(e.message))
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text())
      })
      await page.goto('https://pico.invalid/')
      // O pinguim cai do começo e fica de pé no primeiro gelo.
      await page.waitForFunction((scope) => globalThis[scope]?.get('noChao')?.v === true, scope, {
        timeout: 10000,
      })
      const touch = mobile ? await context.newCDPSession(page) : undefined
      const direita = mobile
        ? await page.locator('[data-sz-g2d-action="right"]').boundingBox()
        : undefined
      const segurarDireita = async () => {
        if (!touch) return page.keyboard.down('ArrowRight')
        assert(direita)
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x: direita.x + direita.width / 2, y: direita.y + direita.height / 2 }],
        })
      }
      const soltarDireita = async () => {
        if (touch)
          await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        else await page.keyboard.up('ArrowRight')
      }
      // Espaço/A pula e Enter/+ recomeça (teclas da trilha, sem clique em botão, C01b).
      const input = async (action, key) => {
        if (mobile) await page.locator(`[data-sz-g2d-action="${action}"]`).tap()
        else await page.keyboard.press(key)
      }
      // Anda até perto da beira do primeiro gelo, pula e segue até a bandeira.
      await segurarDireita()
      try {
        await page.waitForFunction(
          (scope) => (globalThis[scope]?.get('pinguim')?.v.x ?? 0) >= 150,
          scope,
          { timeout: 5000, polling: 'raf' },
        )
      } finally {
        await soltarDireita()
      }
      assert((await ler(page, 'pinguim.x')) < 230, 'o pinguim passou da beira antes do pulo')
      await input('jump', 'Space')
      // A bandeira da fase 1 leva à fase 2 (A46): o pinguim volta ao começo.
      const esperar = (fn, ms = 8000) =>
        page.waitForFunction(fn, scope, { timeout: ms, polling: 'raf' })
      await segurarDireita()
      try {
        await esperar((scope) => globalThis[scope]?.get('fase')?.v === 2)
      } finally {
        await soltarDireita()
      }
      await esperar((scope) => globalThis[scope]?.get('noChao')?.v === true)
      await page.screenshot({
        path: resolve(out, `2026-10-31-pico-fase-2-${nome}.png`),
        fullPage: true,
      })
      // Na fase 2, pula para o gelo do alto e anda até a bandeira.
      await input('jump', 'Space')
      await esperar((scope) => (globalThis[scope]?.get('pinguim')?.v.y ?? 999) < 260)
      await segurarDireita()
      try {
        await esperar((scope) => globalThis[scope]?.get('chegou')?.v === true)
      } finally {
        await soltarDireita()
      }
      assert.equal(
        await ler(page, 'recado'),
        'O pinguim chegou à bandeira da fase 2. O jogo terminou.',
      )
      assert(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        'Rolagem horizontal',
      )
      const filename = `2026-10-31-pico-desafio-${nome}.png`
      await page.screenshot({ path: resolve(out, filename), fullPage: true })
      // Recomeçar devolve o pinguim ao começo da fase 1 e limpa a chegada.
      await input('start', 'Enter')
      await page.waitForFunction(
        (scope) => {
          const reader = globalThis[scope]
          return (
            reader?.get('chegou')?.v === false &&
            reader.get('fase')?.v === 1 &&
            reader.get('pinguim')?.v.x === 40
          )
        },
        scope,
        { timeout: 5000 },
      )
      assert.deepEqual(errors, [])
      console.log(
        `${mobile ? 'Celular emulado, toque' : 'Computador, teclado'} (${width} x ${height}): andar, pular o buraco, as duas fases e recomeçar aprovados; ${filename}`,
      )
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
