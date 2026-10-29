/**
 * Conferência no navegador da casa na árvore do Bosque (física viva, etapa 5): com o `bosque.glb`
 * regerado, a ilha completa monta os mecanismos nas âncoras `mecanismos-*`, a criança atravessa a
 * porta empurrando a folha e empurra o caixote até a placa, que abre o alçapão.
 *
 * `bun playground/verificar-mecanismos-browser.ts` (navegador: `ARQUIPELAGO_CHROMIUM` com o caminho
 * do executável, ou o canal `ARQUIPELAGO_BROWSER_CHANNEL`, padrão `chrome`). Os prints vão para
 * `ARQUIPELAGO_PRINTS` (padrão: a pasta temporária).
 */
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'

const port = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4597)
const baseURL = `http://127.0.0.1:${port}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? tmpdir()
const bosque = ilhasEmVolta().find((i) => i.ilha.id === 'bosque')
if (!bosque) throw new Error('Sem o Bosque no anel.')
const giroIlha = giroDaIlha(bosque.ilha)
const glb = readFileSync(path.join(import.meta.dir, '..', 'src', 'assets', 'ilhas', 'bosque.glb'))
const modelo = (
  await new GLTFLoader().parseAsync(
    glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength),
    '',
  )
).scene
type P = { x: number; y: number; z: number }
/** Uma âncora do modelo no mundo (o mesmo `paraOMundo` de `mundo/bosque.ts`, centro em y 0). */
const ancora = (nome: string): P => {
  const o = modelo.getObjectByName(nome)
  if (!o) throw new Error(`sem a âncora ${nome}`)
  const { x, y, z } = o.position
  return {
    x: bosque.centro.x + x * Math.cos(giroIlha) + z * Math.sin(giroIlha),
    y,
    z: bosque.centro.z - x * Math.sin(giroIlha) + z * Math.cos(giroIlha),
  }
}
const rumoDe = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.atan2(b.x - a.x, b.z - a.z)
const dobradica = ancora('mecanismos-casa')
const giro = rumoDe(dobradica, ancora('mecanismos-rumo'))
const meioDaPorta = {
  x: dobradica.x + Math.cos(giro) * 0.55,
  z: dobradica.z - Math.sin(giro) * 0.55,
}
// Para dentro da casa, do lado do trinco: a folha aberta fica do lado da dobradiça.
const dentro = {
  x: dobradica.x + Math.cos(giro) * 0.85 + Math.sin(giro) * 0.9,
  z: dobradica.z - Math.sin(giro) * 0.85 + Math.cos(giro) * 0.9,
}
const frente = ancora('casa-na-arvore')
const placa = ancora('mecanismos-placa')
const caixote = ancora('mecanismos-caixote')
const paraAPlaca = rumoDe(caixote, placa)
// O rastro é o meio do corpo: os pés ficam 0,7 abaixo.
const noDeque = dobradica.y + 1.2

type Mecanismos = {
  montado: boolean
  placa: boolean
  porta: number
  alcapao: number
  caixaY: number
}
type Desenho = { mecanismos: Mecanismos; posicao: { x: number; y: number; z: number } }

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
  const context = await browser.newContext({
    viewport: {
      width: Number(process.env.ARQUIPELAGO_LARGURA ?? 1280),
      height: Number(process.env.ARQUIPELAGO_ALTURA ?? 720),
    },
  })
  context.setDefaultTimeout(120_000)
  await context.addInitScript((origem) => {
    if (location.origin === origem) localStorage.setItem('arquipelago:medir', '1')
  }, baseURL)
  const page = await context.newPage()
  page.on('pageerror', (e) => erros.push(e.message))
  const em = `${frente.x.toFixed(2)},${frente.z.toFixed(2)},${noDeque.toFixed(2)}`
  await page.goto(`${baseURL}/?novo=1&em=${em}`, { waitUntil: 'domcontentloaded' })
  const ler = () =>
    page.evaluate(
      () => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho ?? null,
    )
  const levar = (p: { x: number; z: number }, olhar: number) =>
    page.evaluate(
      ({ x, y, z, g }) =>
        (globalThis as { __arquipelagoLevar?: (...a: number[]) => void }).__arquipelagoLevar?.(
          x,
          y,
          z,
          g,
        ),
      // A câmera olha para −(sin g, cos g), e andar para a frente segue a câmera.
      { x: p.x, y: noDeque, z: p.z, g: olhar + Math.PI },
    )
  /** Anda para a frente por `ms`, guardando a maior medida que `medir` devolver. */
  const andar = async (ms: number, medir: (d: Desenho) => number) => {
    await page.keyboard.down('KeyW')
    let maior = 0
    for (let t = 0; t < ms; t += 150) {
      await page.waitForTimeout(150)
      const d = await ler()
      if (d) maior = Math.max(maior, medir(d))
    }
    await page.keyboard.up('KeyW')
    return maior
  }
  // A ilha completa carrega, troca e monta os mecanismos nas âncoras do modelo.
  await page.waitForFunction(
    () =>
      (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.mecanismos
        .montado === true,
    undefined,
    { timeout: 180_000 },
  )
  await page.locator('canvas').click()

  // 1. A porta: da frente dela, andando para dentro da casa. Logo depois da troca da ilha o deque
  // pode ainda não colidir: leva de novo até pousar nele.
  let antes: Desenho | null = null
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    await levar(frente, rumoDe(frente, dentro))
    await page.waitForTimeout(2500)
    antes = await ler()
    if (antes && Math.abs(antes.posicao.y - 0.7 - dobradica.y) < 0.4) break
  }
  if (!antes) throw new Error('Sem medidor.')
  console.log('Antes:', JSON.stringify(antes.mecanismos), JSON.stringify(antes.posicao))
  if (Math.abs(antes.posicao.y - 0.7 - dobradica.y) > 0.4)
    throw new Error(`A criança não ficou no deque da casa: ${JSON.stringify(antes.posicao)}`)
  if (Math.abs(antes.mecanismos.porta) > 0.15) throw new Error('A porta começou aberta.')
  if (antes.mecanismos.placa || Math.abs(antes.mecanismos.alcapao) > 0.15)
    throw new Error('A placa ou o alçapão começaram ligados sem o caixote em cima.')
  await page.screenshot({ path: path.join(prints, 'mecanismos-antes.png') })
  const porta = await andar(4000, (d) => Math.abs(d.mecanismos.porta))
  await page.screenshot({ path: path.join(prints, 'mecanismos-porta.png') })
  const naCasa = await ler()
  const passou =
    naCasa &&
    (naCasa.posicao.x - meioDaPorta.x) * Math.sin(giro) +
      (naCasa.posicao.z - meioDaPorta.z) * Math.cos(giro)
  console.log(`Porta: abriu ${porta.toFixed(2)} rad; a criança entrou ${passou?.toFixed(2)} m`)
  if (porta < 0.3) throw new Error('A porta não abriu quando a criança andou contra ela.')
  if (!passou || passou < 0.3) throw new Error('A criança não atravessou a porta.')
  await page.waitForTimeout(4000)
  const fechou = await ler()
  console.log(`Porta depois de sair da frente: ${fechou?.mecanismos.porta.toFixed(2)} rad`)

  // 2. O caixote: de trás dele, empurrando até a placa.
  const atras = {
    x: caixote.x - Math.sin(paraAPlaca) * 0.8,
    z: caixote.z - Math.cos(paraAPlaca) * 0.8,
  }
  await levar(atras, paraAPlaca)
  await page.waitForTimeout(2500)
  const alcapao = await andar(4500, (d) =>
    d.mecanismos.placa ? Math.abs(d.mecanismos.alcapao) : 0,
  )
  // Sai de perto (em cima do alçapão a criança o seguraria fechado) e espera ele abrir.
  await levar(frente, rumoDe(frente, dentro))
  await page.waitForTimeout(3500)
  const depois = await ler()
  await page.screenshot({ path: path.join(prints, 'mecanismos-placa.png') })
  console.log('Depois:', JSON.stringify(depois?.mecanismos), JSON.stringify(depois?.posicao))
  if (!depois?.mecanismos.placa) throw new Error('O caixote não ficou na placa.')
  if (Math.max(alcapao, Math.abs(depois.mecanismos.alcapao)) < 1)
    throw new Error('A placa ligou, mas o alçapão não abriu.')
  if (depois.mecanismos.caixaY < dobradica.y) throw new Error('O caixote caiu do deque.')
  if (erros.length) throw new Error(erros.join('\n'))
  console.log('PASS: porta atravessada, caixote na placa e alçapão aberto na casa do Bosque.')
} finally {
  await browser?.close()
  server.kill()
}
