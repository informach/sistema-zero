/** Fliperama e player público reais; lista/publicação servidas só pelo harness local. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { chromium } from 'playwright-core'

const port = await new Promise<number>((resolve, reject) => {
  const s = createServer().once('error', reject)
  s.listen(0, '127.0.0.1', () => {
    const a = s.address()
    if (!a || typeof a === 'string') return reject(Error('Sem porta'))
    s.close(() => resolve(a.port))
  })
})
const base = `http://127.0.0.1:${port}`
const prints = process.env.ARQUIPELAGO_PRINTS
const publico = process.env.ARQUIPELAGO_PUBLICO === 'adulto' ? 'adulto' : 'kids'
if (!prints) throw Error('Informe ARQUIPELAGO_PRINTS para preservar as evidências')
mkdirSync(prints, { recursive: true })
const server = spawn('bun', ['playground/minijogos-qa-servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
})
const encerrado = new Promise<void>((resolve) => server.once('close', () => resolve()))
server.stdout.on('data', () => {})
server.stderr.on('data', (data) => process.stderr.write(data))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const resultados: unknown[] = []
const limite = setTimeout(() => {
  void browser?.close()
  server.kill()
}, 240_000)
try {
  const ate = Date.now() + 60_000
  while (true) {
    if (server.exitCode !== null) throw Error('Servidor não iniciou')
    try {
      if ((await fetch(base)).ok) break
    } catch {}
    if (Date.now() >= ate) throw Error('Tempo de início esgotado')
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  for (const width of [1280, 390]) {
    const contexto = await browser.newContext({
      viewport: { width, height: 844 },
      hasTouch: width === 390,
    })
    const pagina = await contexto.newPage()
    const erros: string[] = []
    pagina.on('pageerror', (error) => erros.push(error.message))
    // Nenhuma consulta a serviços publicados, nem imagens externas da fixture.
    await contexto.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        if (url.origin !== base) {
          erros.push(`Rede externa: ${url.origin}`)
          return route.abort()
        }
      }
      return route.continue()
    })
    pagina.setDefaultTimeout(45_000)
    await pagina.goto(`${base}/?publico=${publico}`, { waitUntil: 'networkidle' })
    const usar = pagina.locator('.arq-acao').filter({ hasText: /fliperama/i })
    await usar.waitFor()
    if (width === 390) await pagina.getByRole('button', { name: 'Usar', exact: true }).tap()
    else await pagina.keyboard.press('e')
    const jogar = pagina.getByRole('button', { name: 'Jogar Corrida publicada', exact: true })
    await jogar.waitFor()
    await pagina.screenshot({ path: `${prints}/lista-${width}.png` })
    await jogar.click()
    const dialog = pagina.getByRole('dialog', { name: 'Jogo do Mural' })
    await dialog.waitFor()
    const canvas = pagina.frameLocator('dialog iframe').locator('canvas').first()
    await canvas.waitFor()
    const box = await canvas.boundingBox()
    assert(box && box.width > 100 && box.height > 100)
    const palco = Math.min(box.width, box.height * (640 / 430))
    const altura = (palco * 430) / 640
    await canvas.click({
      position: {
        x: (box.width - palco) / 2 + palco * 0.16,
        y: (box.height - altura) / 2 + altura * 0.93,
      },
    })
    await pagina.screenshot({ path: `${prints}/jogando-${width}.png` })
    const bounds = await dialog.boundingBox()
    assert(bounds && bounds.width <= width && bounds.height <= 844)
    await dialog.getByRole('button', { name: 'Voltar ao jogo', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal(await pagina.locator('iframe').count(), 0)
    // A publicação saiu depois da lista: o player deve recusar, sem usar uma cópia anterior.
    await contexto.route('**/api/studio/play/**', (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }),
    )
    await jogar.click()
    await dialog.getByText('Não encontramos este jogo.').waitFor()
    assert.equal(await dialog.locator('iframe').count(), 0)
    await pagina.screenshot({ path: `${prints}/retirado-${width}.png` })
    await pagina.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    assert.deepEqual(erros, [])
    resultados.push({
      width,
      errors: erros,
      bounds,
      iframeDepoisDeFechar: 0,
      retiradaRecusada: true,
    })
    await contexto.close()
  }
  writeFileSync(
    `${prints}/resultado.json`,
    JSON.stringify(
      {
        publico,
        resultados,
        escopo:
          'Publicação JavaScript local, player real; não qualifica Python/Pro ou serviço remoto',
      },
      null,
      2,
    ),
  )
  console.log('PASS computador/celular: lista, player, retorno, retirada e Escape')
} catch (error) {
  writeFileSync(`${prints}/falha.txt`, String(error))
  for (const context of browser?.contexts() ?? []) {
    await context
      .pages()[0]
      ?.screenshot({ path: `${prints}/falha.png` })
      .catch(() => {})
  }
  throw error
} finally {
  clearTimeout(limite)
  await browser?.close()
  server.kill()
  await encerrado
}
