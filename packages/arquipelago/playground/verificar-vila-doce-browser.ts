/**
 * Conferência no navegador da Vila Doce completa (fase2-01): o jogo aberto em cima da ilha espera
 * os colisores do `vila-doce.glb`, a criança fica de pé em cada parada do percurso dos telhados
 * (caixotes, três casinhas e o terraço da sorveteria, que só a ilha completa segura) e anda da
 * chegada da ponte até a praça sem esbarrar em nada.
 *
 * `bun playground/verificar-vila-doce-browser.ts` (navegador: `ARQUIPELAGO_CHROMIUM` com o caminho
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
import { CORPO } from '../src/sistemas/corpo'

const port = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4598)
const baseURL = `http://127.0.0.1:${port}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? tmpdir()
const vila = ilhasEmVolta().find((i) => i.ilha.id === 'vila-doce')
if (!vila) throw new Error('Sem a Vila Doce no anel.')
const giroIlha = giroDaIlha(vila.ilha)
const glb = readFileSync(
  path.join(import.meta.dir, '..', 'src', 'assets', 'ilhas', 'vila-doce.glb'),
)
const modelo = (
  await new GLTFLoader().parseAsync(
    glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength),
    '',
  )
).scene
type P = { x: number; y: number; z: number }
/** Uma âncora do modelo no mundo (centro da ilha em y 0, girada como no jogo). */
const ancora = (nome: string): P => {
  const o = modelo.getObjectByName(nome)
  if (!o) throw new Error(`sem a âncora ${nome}`)
  const { x, y, z } = o.position
  return {
    x: vila.centro.x + x * Math.cos(giroIlha) + z * Math.sin(giroIlha),
    y,
    z: vila.centro.z - x * Math.sin(giroIlha) + z * Math.cos(giroIlha),
  }
}
const rumoDe = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.atan2(b.x - a.x, b.z - a.z)
type Desenho = { posicao: P; ilhasCompletas: number }
/** O rastro é o meio do corpo: o pé fica abaixo dele o meio da cápsula mais a folga do controlador. */
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
  const chegada = ancora('chegada')
  const em = `${chegada.x.toFixed(2)},${chegada.z.toFixed(2)},${(chegada.y + 1.2).toFixed(2)}`
  // Posição 8: todas as ilhas abertas.
  await page.goto(`${baseURL}/?novo=1&posicao=8&em=${em}`, { waitUntil: 'domcontentloaded' })
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
      // A câmera olha para −(sin g, cos g), e andar para a frente segue a câmera.
      { x: p.x, y: p.y + 1.2, z: p.z, g: olhar + Math.PI },
    )
  await page.waitForFunction(
    () =>
      ((globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.ilhasCompletas ??
        0) > 0,
    undefined,
    { timeout: 180_000 },
  )
  await page.locator('canvas').click()
  await page.waitForTimeout(3000)

  // 1. Da chegada até a praça: anda para a fonte sem esbarrar.
  const fonte = ancora('fonte')
  await levar(chegada, rumoDe(chegada, fonte))
  await page.waitForTimeout(2500)
  const inicio = await ler()
  if (!inicio) throw new Error('Sem medidor.')
  await page.keyboard.down('KeyW')
  await page.waitForTimeout(4000)
  await page.keyboard.up('KeyW')
  const andou = await ler()
  const distancia = andou
    ? Math.hypot(andou.posicao.x - inicio.posicao.x, andou.posicao.z - inicio.posicao.z)
    : 0
  console.log(`Chegada até a praça: andou ${distancia.toFixed(2)} m em 4 s`)
  await page.screenshot({ path: path.join(prints, 'vila-doce-chegada.png') })
  if (distancia < 4) throw new Error('A criança esbarrou no caminho da chegada até a praça.')

  // 2. Cada parada do percurso dos telhados segura a criança (a versão leve não tem esses pisos).
  const paradas = ['telhados-inicio', 'telhados-1', 'telhados-2', 'telhados-3', 'telhados-fim']
  for (const [k, nome] of paradas.entries()) {
    const a = ancora(nome)
    const proxima = ancora(paradas[k + 1] ?? 'fonte')
    let pe = Number.NaN
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      await levar(a, rumoDe(a, proxima))
      await page.waitForTimeout(2500)
      const d = await ler()
      pe = d ? d.posicao.y - PE : Number.NaN
      if (Math.abs(pe - a.y) < 0.15) break
    }
    console.log(`${nome}: pé em ${pe.toFixed(2)} (o topo é ${a.y.toFixed(2)})`)
    await page.screenshot({ path: path.join(prints, `vila-doce-${nome}.png`) })
    if (!(Math.abs(pe - a.y) < 0.15)) throw new Error(`A criança não ficou de pé em ${nome}.`)
  }
  if (erros.length) throw new Error(erros.join('\n'))
  console.log('Vila Doce conferida.')
} finally {
  await browser?.close()
  server.kill()
}
