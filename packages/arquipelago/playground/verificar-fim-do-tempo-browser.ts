/**
 * O fim do tempo no fim da ação (N07) e o resumo do dia na tela de descanso (N06): com 30 s de
 * tempo livre sobrando (`?limite=10&usado=570`), a criança começa os pulos nos corais do Recife; o
 * tempo acaba durante a corrida e o Zappy avisa, mas a tela de descanso só vem quando ela para a
 * corrida, já com o resumo do dia.
 *
 * Compilar para Node: `bun build playground/verificar-fim-do-tempo-browser.ts --target=node
 * --external playwright-core --outfile .cache/verificar-fim-do-tempo.mjs` e rodar com `node`.
 */
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { giroDaIlha, ilhasEmVolta, raioMaximoDaIlha } from '../src/mundo/medidas'
import { deslocar, percursoDosCorais } from '../src/mundo/percursos-das-ilhas'
import { FALA_DO_TEMPO_ACABANDO } from '../src/sistemas/fim-do-tempo'

const port = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4531)
const baseURL = `http://127.0.0.1:${port}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? tmpdir()
const pacote = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const recife = ilhasEmVolta().find((i) => i.ilha.id === 'recife')
if (!recife) throw new Error('Sem o Recife no anel.')
const bin = readFileSync(path.join(pacote, 'src', 'assets', 'ilhas', 'recife.glb'))
const raiz = (
  await new GLTFLoader().parseAsync(
    bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength),
    '',
  )
).scene
raiz.rotation.y = giroDaIlha(recife.ilha)
raiz.updateMatrixWorld(true)
const p = percursoDosCorais(lerColisores(raiz), raioMaximoDaIlha(recife.ilha))
if (!p) throw new Error('Sem os corais.')
const corais = deslocar(p, { x: recife.centro.x, y: 0, z: recife.centro.z })

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
  const em = `${corais.largada.x.toFixed(2)},${corais.largada.z.toFixed(2)},${(corais.largada.y + 1.2).toFixed(2)}`
  await page.goto(`${baseURL}/?novo=1&persistir=0&posicao=8&limite=10&usado=570&em=${em}`, {
    waitUntil: 'domcontentloaded',
  })
  await page.getByText('Começar os pulos nos corais').first().waitFor({ timeout: 180_000 })
  await page.locator('canvas').click()
  await page.keyboard.press('KeyE')
  const relogio = page.getByRole('timer', { name: 'Pulos nos corais' })
  await relogio.waitFor({ timeout: 15_000 })
  // O tempo acaba durante a corrida: o Zappy avisa e a corrida continua.
  await page.getByText(FALA_DO_TEMPO_ACABANDO).first().waitFor({ timeout: 90_000 })
  await page.waitForTimeout(3000)
  if (await page.getByText('Hora de descansar').count())
    throw new Error('A tela de descanso cobriu a corrida no meio.')
  if (!(await relogio.isVisible())) throw new Error('A corrida parou sozinha.')
  await page.screenshot({ path: path.join(prints, 'fim-do-tempo-esperando.png') })
  console.log('O tempo acabou na corrida: o Zappy avisou e a corrida continuou.')
  // Parar a corrida: agora vem a tela de descanso, com o resumo do dia.
  await relogio.getByRole('button', { name: 'Parar' }).click()
  await page.getByText('Hora de descansar').first().waitFor({ timeout: 20_000 })
  await page.getByText('Hoje na sua ilha').first().waitFor({ timeout: 10_000 })
  await page.screenshot({ path: path.join(prints, 'fim-do-tempo-descanso.png') })
  console.log('Com a corrida parada, a tela de descanso veio com o resumo do dia.')
  if (erros.length) throw new Error(erros.join('\n'))
} finally {
  await browser?.close()
  server.kill()
}
