/**
 * O quarto nos dois sentidos no playground (§6.28, A10). Só a plataforma falsa, sem banco.
 *
 * "🛏️ Meu quarto", no modo construir, abre o editor do quarto da plataforma (no playground, a
 * plataforma falsa gira o primeiro móvel) e, ao voltar, o quarto novo aparece na casa sem
 * recarregar. Confere as poses reais do quarto, com menos movimento para o bichinho não mexer.
 * No computador e no celular.
 *
 * No Windows: `bun build playground/verificar-quarto-browser.ts --target=node --external
 * playwright-core --outfile .cache/verificar-quarto-browser.mjs && node
 * .cache/verificar-quarto-browser.mjs`. Aceita `ARQUIPELAGO_CHROMIUM` e `ARQUIPELAGO_PRINTS`.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium } from 'playwright-core'

type Pose = { nome: string; pose: number[] }
type Inspecao = { __arquipelagoLerQuarto?: () => Pose[] }
const port = await new Promise<number>((resolve, reject) => {
  const s = createServer().once('error', reject)
  s.listen(0, '127.0.0.1', () => {
    const a = s.address()
    if (!a || typeof a === 'string') return reject(Error('Sem porta local'))
    s.close(() => resolve(a.port))
  })
})
const baseURL = `http://127.0.0.1:${port}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/quarto')
mkdirSync(prints, { recursive: true })

const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
})
server.stdout.on('data', () => {})
server.stderr.on('data', (d) => process.stderr.write(d))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  const deadline = Date.now() + 30_000
  while (true) {
    if (server.exitCode !== null) throw new Error('Playground encerrou antes de iniciar.')
    try {
      if ((await fetch(baseURL)).ok) break
    } catch {}
    if (Date.now() >= deadline) throw new Error('Playground não iniciou.')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  for (const celular of [false, true]) {
    const nome = celular ? 'celular' : 'computador'
    const context = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      isMobile: celular,
      hasTouch: celular,
      deviceScaleFactor: 0.5,
      reducedMotion: 'reduce',
    })
    context.setDefaultTimeout(120_000)
    await context.addInitScript(() => {
      localStorage.setItem('arquipelago:medir', '1')
      localStorage.setItem('arquipelago:camera-dica', '1')
    })
    const page = await context.newPage()
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    await page.goto(
      `${baseURL}/?novo=1&obra=exemplo&posicao=5&em=-3.2,1.5,3&dia=nenhum&qualidade=leve`,
    )
    await page.waitForFunction(
      () => ((globalThis as Inspecao).__arquipelagoLerQuarto?.().length ?? 0) > 50,
    )
    const ler = () => page.evaluate(() => (globalThis as Inspecao).__arquipelagoLerQuarto?.() ?? [])
    const antes = await ler()
    await page.getByRole('button', { name: /Construir/ }).click()
    await page.getByRole('button', { name: /Móveis/ }).click()
    await page.getByRole('button', { name: /Meu quarto/ }).click()
    await page.waitForFunction((n) => {
      const agora = (globalThis as Inspecao).__arquipelagoLerQuarto?.() ?? []
      return agora.length > 50 && JSON.stringify(agora) !== n
    }, JSON.stringify(antes))
    const depois = await ler()
    assert.equal(depois.length, antes.length, 'o quarto tem os mesmos móveis')
    const mudaram = depois.filter((p, i) => JSON.stringify(p) !== JSON.stringify(antes[i]))
    assert.ok(mudaram.length > 0, 'algum móvel girou')
    // Só o móvel girado mudou: o resto do quarto fica como estava.
    assert.ok(mudaram.length < antes.length / 2, `mudaram ${mudaram.length} de ${antes.length}`)
    await page.getByRole('button', { name: /Meu quarto/ }).waitFor({ state: 'visible' })
    assert.equal(await page.getByRole('button', { name: /Meu quarto/ }).isEnabled(), true)
    await page.screenshot({ path: path.join(prints, `${nome}-quarto-arrumado.png`) })
    if (erros.length) throw Error(erros.join('\n'))
    console.log(`PASS ${nome}: o quarto arrumado na plataforma apareceu na casa`)
    await context.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (server.exitCode === null) server.kill()
}
