/**
 * O clima natural antes das Nuvens (N04, 30/10): no posto Construtor, num dia de chuva do jogo
 * (`?adiantar=130` põe o jogo no dia 9, que é de chuva), chove na sua ilha, o relógio mostra a
 * chuva e o cata-vento não oferece mudar o clima (isso só nas Nuvens).
 *
 * Compilar para Node: `bun build playground/verificar-clima-natural-browser.ts --target=node
 * --external playwright-core --outfile .cache/verificar-clima-natural.mjs` e rodar com `node`.
 */
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { CATA_VENTO } from '../src/mundo/medidas'
import { climaNatural } from '../src/sistemas/clima'

const port = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4531)
const baseURL = `http://127.0.0.1:${port}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? tmpdir()
type Desenho = { clima: { escolhido: string; efetivo: string; gotas: boolean } }
if (climaNatural(9) !== 'chuva') throw new Error('O dia 9 do jogo deixou de ser de chuva.')

const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
})
server.stdout.on('data', () => {})
server.stderr.on('data', (d) => process.stderr.write(d))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const erros: string[] = []
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
      : { channel: process.env.ARQUIPELAGO_BROWSER_CHANNEL ?? 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  context.setDefaultTimeout(120_000)
  await context.addInitScript((origem) => {
    if (location.origin === origem) localStorage.setItem('arquipelago:medir', '1')
  }, baseURL)
  const page = await context.newPage()
  page.on('pageerror', (e) => erros.push(e.message))
  const em = `${CATA_VENTO.x + 2},${CATA_VENTO.z + 1}`
  await page.goto(`${baseURL}/?novo=1&persistir=0&posicao=2&adiantar=130&em=${em}`, {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForFunction(
    () =>
      (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.clima?.gotas ===
      true,
    undefined,
    { timeout: 180_000 },
  )
  const d = (await page.evaluate(
    () => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho,
  )) as Desenho
  console.log(`Clima: escolhido ${d.clima.escolhido}, valendo ${d.clima.efetivo}`)
  if (d.clima.efetivo !== 'chuva') throw new Error('O clima natural do dia 9 não está valendo.')
  await page.getByText('Chuva', { exact: false }).first().waitFor({ timeout: 20_000 })
  await page.screenshot({ path: path.join(prints, 'clima-natural-chuva.png') })
  if (await page.getByText('Mudar o clima').count())
    throw new Error('O cata-vento oferece mudar o clima antes das Nuvens.')
  if (erros.length) throw new Error(erros.join('\n'))
  console.log('Clima natural conferido.')
} finally {
  await browser?.close()
  server.kill()
}
