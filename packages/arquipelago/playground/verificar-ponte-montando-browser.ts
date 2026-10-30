/**
 * Conferência no navegador da cena da subida de posto (N02) e da ponte que se monta com a criança
 * em cima (aj-tec-01). Dentro de casa a cena espera. Fora, num jogo novo com o Bosque aberto, a
 * cena começa: o Zappy voa até a ilha, a ponte se monta tábua por tábua (a criança, em pé no
 * trecho quebrado, não cai) e a câmera mostra a travessia; no fim, a fala de antes. Com duas
 * pontes novas, uma cena por vez: o Pular e o Esc encerram a da vez.
 *
 * Compilar para Node: `bun build playground/verificar-ponte-montando-browser.ts --target=node
 * --external playwright-core --outfile .cache/verificar-ponte.mjs` e `node .cache/verificar-ponte.mjs`.
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

const port = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4531)
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
  const navegador = browser
  /**
   * Cada cenário num contexto novo do navegador: o diário local do jogo anterior (IndexedDB) faria
   * o jogo novo do playground parecer mudado em outro aparelho.
   */
  let contexto: Awaited<ReturnType<typeof navegador.newContext>> | undefined
  let page: Awaited<ReturnType<NonNullable<typeof contexto>['newPage']>>
  const abrir = async (url: string) => {
    await contexto?.close()
    contexto = await navegador.newContext({ viewport: { width: 1280, height: 720 } })
    contexto.setDefaultTimeout(120_000)
    await contexto.addInitScript((origem) => {
      if (location.origin === origem) localStorage.setItem('arquipelago:medir', '1')
    }, baseURL)
    page = await contexto.newPage()
    page.on('pageerror', (e) => erros.push(e.message))
    await page.goto(url, { waitUntil: 'domcontentloaded' })
  }
  const ler = () =>
    page.evaluate(
      () => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho ?? null,
    )
  const pronto = () =>
    page.waitForFunction(
      () => Boolean((globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho),
      undefined,
      { timeout: 180_000 },
    )
  const legenda = () => page.locator('.arq-chegada-legenda')

  // 1. Dentro de casa (jogo novo começa no quarto), a cena espera.
  await abrir(`${baseURL}/?novo=1&persistir=0&posicao=2`)
  await pronto()
  await page.waitForTimeout(8000)
  if (await legenda().count()) throw new Error('A cena começou com a criança dentro de casa.')
  console.log('Dentro de casa: a cena esperou.')

  // 2. Fora, em pé no trecho quebrado da ponte do Bosque: a cena inteira.
  const em = `${ponto.x.toFixed(2)},${ponto.z.toFixed(2)},${(ponto.y + 0.3).toFixed(2)}`
  await abrir(`${baseURL}/?novo=1&persistir=0&posicao=2&em=${em}`)
  await pronto()
  try {
    await page.getByText('O Zappy voou até o Bosque dos Bichos.').waitFor({ timeout: 60_000 })
  } catch (e) {
    await page.screenshot({ path: path.join(prints, 'chegada-nao-comecou.png') })
    throw e
  }
  await page.screenshot({ path: path.join(prints, 'chegada-voo.png') })
  await page.getByText('A ponte se monta tábua por tábua.').waitFor({ timeout: 30_000 })
  const pes: number[] = []
  for (let i = 0; i < 6; i++) {
    const d = await ler()
    if (d) pes.push(d.posicao.y - PE)
    await page.waitForTimeout(500)
  }
  await page.screenshot({ path: path.join(prints, 'chegada-ponte.png') })
  await page
    .getByText('A travessia para o Bosque dos Bichos está pronta.')
    .waitFor({ timeout: 30_000 })
  await page.screenshot({ path: path.join(prints, 'chegada-travessia.png') })
  await legenda().waitFor({ state: 'detached', timeout: 30_000 })
  await page
    .getByText('A ponte para o Bosque dos Bichos ficou pronta.', { exact: false })
    .first()
    .waitFor()
  await page.screenshot({ path: path.join(prints, 'chegada-fim.png') })
  console.log(`Pé na ponte durante a montagem: ${pes.map((p) => p.toFixed(2)).join(', ')}`)
  // Em pé no mesmo lugar o tempo todo (caindo, o pé desceria até a água, abaixo de 0,5).
  const primeiro = pes[0] ?? Number.NaN
  if (!(primeiro > 0.5) || pes.some((p) => Math.abs(p - primeiro) > 0.1))
    throw new Error('A criança caiu da ponte enquanto ela se montava.')

  // 3. Duas pontes novas (posição 3): uma cena por vez; o Pular encerra o Bosque e vem a Vila,
  // que o Esc encerra.
  await abrir(`${baseURL}/?novo=1&persistir=0&posicao=3&em=${em}`)
  await pronto()
  await page.getByText('O Zappy voou até o Bosque dos Bichos.').waitFor({ timeout: 60_000 })
  await page.getByRole('button', { name: 'Pular' }).click()
  await page.getByText('O Zappy voou até a Vila Doce.').waitFor({ timeout: 30_000 })
  await page.keyboard.press('Escape')
  await legenda().waitFor({ state: 'detached', timeout: 15_000 })
  await page.getByText('A ponte para a Vila Doce ficou pronta.', { exact: false }).first().waitFor()
  console.log('Pular e Esc encerram a cena da vez; a próxima ponte vem depois.')
  if (erros.length) throw new Error(erros.join('\n'))
  console.log('Ponte montando conferida.')
} finally {
  await browser?.close()
  server.kill()
}
