/**
 * Conferência no navegador dos três percursos da V19: os pulos nos corais do Recife (começa,
 * conta o coral, cair na areia volta ao coral, a chegada dá estrelas), a trilha das pedras do
 * vulcão do Vale (só conta na ordem, chega) e a volta pela praia da sua ilha (começa e chega).
 *
 * `bun playground/verificar-percursos-v19-browser.ts` (navegador: `ARQUIPELAGO_CHROMIUM` ou o canal
 * `ARQUIPELAGO_BROWSER_CHANNEL`, padrão `chrome`). Prints em `ARQUIPELAGO_PRINTS` (padrão: temp).
 */
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { giroDaIlha, ilhasEmVolta, RAIO_DO_RASO, raioMaximoDaIlha } from '../src/mundo/medidas'
import {
  deslocar,
  percursoDaPraia,
  percursoDasPedrasDoVulcao,
  percursoDosCorais,
} from '../src/mundo/percursos-das-ilhas'
import type { PontosDoPercurso } from '../src/sistemas/percurso'

const port = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4531)
const baseURL = `http://127.0.0.1:${port}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? tmpdir()
/** A pasta do pacote, também no arquivo compilado para Node em `.cache/`. */
const pacote = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
type P = { x: number; y: number; z: number }

async function cena(...partes: string[]) {
  const bin = readFileSync(path.join(pacote, 'src', 'assets', ...partes))
  return (
    await new GLTFLoader().parseAsync(
      bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength),
      '',
    )
  ).scene
}

/** Os pontos no mundo, lidos como o jogo lê: a ilha girada e os colisores em volta do meio. */
async function pontosDaIlha(
  id: string,
  arquivo: string,
  montar: typeof percursoDosCorais,
): Promise<PontosDoPercurso> {
  const anel = ilhasEmVolta().find((i) => i.ilha.id === id)
  if (!anel) throw new Error(`Sem ${id} no anel.`)
  const raiz = await cena('ilhas', arquivo)
  raiz.rotation.y = giroDaIlha(anel.ilha)
  raiz.updateMatrixWorld(true)
  const p = montar(lerColisores(raiz), raioMaximoDaIlha(anel.ilha))
  if (!p) throw new Error(`Sem os pontos do percurso de ${id}.`)
  return deslocar(p, { x: anel.centro.x, y: 0, z: anel.centro.z })
}

const corais = await pontosDaIlha('recife', 'recife.glb', percursoDosCorais)
const pedras = await pontosDaIlha('vale-dos-dinos', 'vale-dos-dinos.glb', percursoDasPedrasDoVulcao)
const terreno = await cena('mundo', 'terreno.glb')
terreno.updateMatrixWorld(true)
const praia = percursoDaPraia(lerColisores(terreno), RAIO_DO_RASO)
if (!praia) throw new Error('Sem a volta pela praia.')

const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
})
server.stdout.on('data', () => {})
server.stderr.on('data', (d) => process.stderr.write(d))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const erros: string[] = []
type Desenho = { posicao: P; ilhasCompletas: number }
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
  const ler = () =>
    page.evaluate(
      () => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho ?? null,
    )
  const levar = (p: P, olhar: number) =>
    page.evaluate(
      ({ x, y, z, g }) =>
        (globalThis as { __arquipelagoLevar?: (...a: number[]) => void }).__arquipelagoLevar?.(
          x,
          y,
          z,
          g,
        ),
      { x: p.x, y: p.y + 1.2, z: p.z, g: olhar + Math.PI },
    )
  const posicao = async () => (await ler())?.posicao ?? { x: 0, y: 0, z: 0 }
  const plano = (a: { x: number; z: number }, b: { x: number; z: number }) =>
    Math.hypot(a.x - b.x, a.z - b.z)
  const esperarPerto = async (alvo: P, raio: number) => {
    const ate = Date.now() + 30_000
    let p = await posicao()
    while (plano(p, alvo) > raio || p.y - 0.9 < alvo.y - 0.3) {
      if (Date.now() > ate) break
      await page.waitForTimeout(500)
      p = await posicao()
    }
    return p
  }
  const cronometro = (nome: string) => page.getByRole('timer', { name: nome })
  const comecar = async (
    pontos: PontosDoPercurso,
    rotulo: string,
    nome: string,
    simbolo: string,
  ) => {
    await levar(pontos.largada, pontos.rumoDaLargada)
    await page.waitForTimeout(2500)
    await page.getByText(rotulo).first().waitFor({ timeout: 180_000 })
    await page.keyboard.press('KeyE')
    const relogio = cronometro(nome)
    await relogio.waitFor({ timeout: 15_000 })
    await relogio.getByText(`${simbolo} 0 de`).waitFor()
    return relogio
  }
  const chegar = async (pontos: PontosDoPercurso, nome: string) => {
    for (const d of pontos.deques) {
      await levar(d, d.rumoDaVolta)
      await esperarPerto(d, d.raio)
      await page.waitForTimeout(2500)
    }
    await levar(pontos.chegada, 0)
    const resultado = page.getByRole('dialog', { name: nome })
    await resultado.waitFor({ timeout: 20_000 })
    const ganhas = await resultado.locator('li.ganhou').count()
    console.log(`${nome}: ${ganhas} estrela(s)`)
    if (ganhas < 1) throw new Error(`${nome} não deu a estrela da chegada.`)
    return resultado
  }

  // Posição 8: todas as ilhas abertas. Começa no Recife.
  const em = `${corais.largada.x.toFixed(2)},${corais.largada.z.toFixed(2)},${(corais.largada.y + 1.2).toFixed(2)}`
  await page.goto(`${baseURL}/?novo=1&posicao=8&em=${em}`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () =>
      ((globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.ilhasCompletas ??
        0) > 0,
    undefined,
    { timeout: 180_000 },
  )
  await page.locator('canvas').click()
  await page.waitForTimeout(3000)

  // 1. Os corais: começa, sobe no primeiro, cai na areia e volta ao coral.
  const relogioDosCorais = await comecar(
    corais,
    'Começar os pulos nos corais',
    'Pulos nos corais',
    'Pérolas',
  )
  await page.screenshot({ path: path.join(prints, 'corais-largada.png') })
  const primeiro = corais.deques[0]
  if (!primeiro) throw new Error('Sem coral.')
  await levar(primeiro, primeiro.rumoDaVolta)
  await esperarPerto(primeiro, primeiro.raio)
  await page.waitForTimeout(4000)
  await levar(corais.largada, 0)
  const voltou = await esperarPerto(primeiro.volta, 0.6)
  console.log(`Corais: voltou a ${plano(voltou, primeiro.volta).toFixed(2)} m do primeiro coral`)
  if (plano(voltou, primeiro.volta) > 0.6) throw new Error('A queda não voltou ao coral.')
  await page.screenshot({ path: path.join(prints, 'corais-voltou.png') })
  const resultadoDosCorais = await chegar(corais, 'Pulos nos corais')
  await page.screenshot({ path: path.join(prints, 'corais-resultado.png') })
  await resultadoDosCorais.getByRole('button', { name: 'Continuar' }).click()
  await relogioDosCorais.waitFor({ state: 'detached' })

  // 2. As pedras do vulcão: pular para a última não conta; na ordem, chega.
  const relogioDasPedras = await comecar(
    pedras,
    'Começar a trilha das pedras',
    'Trilha das pedras do vulcão',
    'Fósseis',
  )
  await levar(pedras.chegada, 0)
  await page.waitForTimeout(4000)
  if (await page.getByRole('dialog', { name: 'Trilha das pedras do vulcão' }).count())
    throw new Error('A trilha chegou sem passar pelas pedras.')
  const resultadoDasPedras = await chegar(pedras, 'Trilha das pedras do vulcão')
  await page.screenshot({ path: path.join(prints, 'pedras-resultado.png') })
  await resultadoDasPedras.getByRole('button', { name: 'Continuar' }).click()
  await relogioDasPedras.waitFor({ state: 'detached' })

  // 3. A volta pela praia da sua ilha.
  const relogioDaPraia = await comecar(
    praia,
    'Começar a volta pela praia',
    'Volta pela praia',
    'Conchas brilhantes',
  )
  await page.screenshot({ path: path.join(prints, 'praia-largada.png') })
  const resultadoDaPraia = await chegar(praia, 'Volta pela praia')
  await page.screenshot({ path: path.join(prints, 'praia-resultado.png') })
  await resultadoDaPraia.getByRole('button', { name: 'Continuar' }).click()
  await relogioDaPraia.waitFor({ state: 'detached' })

  if (erros.length > 0) throw new Error(`Erros na página: ${erros.join(' | ')}`)
  console.log(`Percursos da V19 conferidos. Prints em ${prints}`)
} finally {
  await browser?.close()
  server.kill()
}
