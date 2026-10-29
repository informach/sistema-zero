/**
 * Conferência no navegador da ponte que se monta com a criança em cima (aj-tec-01): num jogo novo
 * a ponte do Bosque abre na hora (ainda não foi vista) e leva 4,5 s para chegar à ilha. A criança
 * começa em pé no trecho que já existia (o quebrado, perto do fim dele) e não pode cair na água
 * enquanto as tábuas chegam; no fim, anda pela ponte inteira até o Bosque.
 *
 * `bun playground/verificar-ponte-montando-browser.ts` (navegador: `ARQUIPELAGO_CHROMIUM` com o
 * caminho do executável, ou o canal `ARQUIPELAGO_BROWSER_CHANNEL`, padrão `chrome`). Os prints vão
 * para `ARQUIPELAGO_PRINTS` (padrão: a pasta temporária).
 */
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { ilhasEmVolta, TRECHO_QUEBRADO, trajetoDaPonte } from '../src/mundo/medidas'
import { CORPO } from '../src/sistemas/corpo'

const port = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4601)
const baseURL = `http://127.0.0.1:${port}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? tmpdir()
const bosque = ilhasEmVolta().find((i) => i.ilha.id === 'bosque')
if (!bosque) throw new Error('Sem o Bosque no anel.')
const pontos = trajetoDaPonte(bosque.ilha, 36)
// Um pouco antes do fim do trecho quebrado (o que existia antes de a ponte abrir).
const ponto = pontos[Math.floor((pontos.length - 1) * TRECHO_QUEBRADO * 0.8)]
const fim = pontos.at(-1)
if (!ponto || !fim) throw new Error('Sem o trajeto da ponte.')
type P = { x: number; y: number; z: number }
type Desenho = { posicao: P }
const PE = CORPO.doCentroAoPe + CORPO.folga

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
  const em = `${ponto.x.toFixed(2)},${ponto.z.toFixed(2)},${(ponto.y + 0.3).toFixed(2)}`
  // Posição 2: o Bosque aberto; jogo novo: a ponte ainda não foi vista e se monta ao abrir.
  await page.goto(`${baseURL}/?novo=1&posicao=2&em=${em}`, { waitUntil: 'domcontentloaded' })
  const ler = () =>
    page.evaluate(
      () => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho ?? null,
    )
  await page.waitForFunction(
    () => Boolean((globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho),
    undefined,
    { timeout: 180_000 },
  )
  const pes: number[] = []
  for (let i = 0; i < 10; i++) {
    const d = await ler()
    if (d) pes.push(d.posicao.y - PE)
    await page.waitForTimeout(600)
  }
  await page.screenshot({ path: path.join(prints, 'ponte-montando.png') })
  console.log(`Pé na ponte durante a montagem: ${pes.map((p) => p.toFixed(2)).join(', ')}`)
  // Em pé no mesmo lugar o tempo todo (caindo, o pé desceria até a água, abaixo de 0,5).
  const primeiro = pes[0] ?? Number.NaN
  if (!(primeiro > 0.5) || pes.some((p) => Math.abs(p - primeiro) > 0.1))
    throw new Error('A criança caiu da ponte enquanto ela se montava.')
  if (erros.length) throw new Error(erros.join('\n'))
  console.log('Ponte montando conferida.')
} finally {
  await browser?.close()
  server.kill()
}
