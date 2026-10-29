/**
 * Conferência no navegador dos patins (fase2-05): com um par na mochila (`?patins=1`), o toque nos
 * patins calça (o botão fica apertado e o Zappy avisa), os dois patins aparecem nos pés com as
 * rodinhas no chão, e andando na praça da Vila Doce o corpo desliza bem mais depois de
 * soltar a tecla do que descalço. Tirar os patins solta os dois.
 *
 * `bun playground/verificar-patins-browser.ts` (navegador: `ARQUIPELAGO_CHROMIUM` com o caminho do
 * executável, ou o canal `ARQUIPELAGO_BROWSER_CHANNEL`, padrão `chrome`). Os prints vão para
 * `ARQUIPELAGO_PRINTS` (padrão: a pasta temporária). Com o SwiftShader a cena anda a poucos quadros
 * por segundo: as medidas esperam o corpo parar, nunca um tempo fixo.
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
type Desenho = {
  posicao: P
  ilhasCompletas: number
  noChao: boolean
  patins: { peca: string; malhas: number; rodas: number }[]
}

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

  // Da chegada da ponte para a fonte, pelo chão da praça.
  const chegada = ancora('chegada')
  const fonte = ancora('fonte')
  const rumo = Math.atan2(fonte.x - chegada.x, fonte.z - chegada.z)
  console.log(
    `Praça: ${Math.hypot(fonte.x - chegada.x, fonte.z - chegada.z).toFixed(1)} m da chegada à fonte`,
  )
  const em = `${chegada.x.toFixed(2)},${chegada.z.toFixed(2)},${(chegada.y + 1.2).toFixed(2)}`
  await page.goto(`${baseURL}/?novo=1&persistir=0&posicao=8&patins=1&em=${em}`, {
    waitUntil: 'domcontentloaded',
  })
  const ler = async () =>
    (await page.evaluate(
      () => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho ?? null,
    )) as Desenho | null
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

  const plano = (a: P, b: P) => Math.hypot(a.x - b.x, a.z - b.z)
  /** Espera o corpo ficar parado no chão (três leituras seguidas a menos de 1 cm). */
  const esperarParar = async () => {
    const ate = Date.now() + 60_000
    let antes = (await ler())?.posicao
    let quietas = 0
    while (quietas < 3 && Date.now() < ate) {
      await page.waitForTimeout(700)
      const d = await ler()
      if (!d || !antes) continue
      quietas = d.noChao && plano(d.posicao, antes) < 0.01 ? quietas + 1 : 0
      antes = d.posicao
    }
    return antes ?? { x: 0, y: 0, z: 0 }
  }
  /** Volta à chegada, anda para a fonte e mede quanto o corpo segue depois de soltar a tecla. */
  const andarESoltar = async (print?: string) => {
    await levar(chegada, rumo)
    const parado = await esperarParar()
    if (plano(parado, chegada) > 0.5) throw new Error('O corpo não voltou à chegada.')
    await page.keyboard.down('KeyW')
    const ate = Date.now() + 60_000
    let soltouEm = parado
    while (Date.now() < ate) {
      await page.waitForTimeout(300)
      const p = (await ler())?.posicao
      if (p && plano(p, parado) > 1.5) {
        soltouEm = p
        // As pernas no meio do passo: a bota segue o pé e a canela sem a perna escapar.
        if (print) await page.screenshot({ path: path.join(prints, print) })
        break
      }
    }
    await page.keyboard.up('KeyW')
    const fim = await esperarParar()
    return plano(fim, soltouEm)
  }

  const calcar = page.getByRole('button', { name: 'Calçar os patins' })
  await calcar.waitFor({ timeout: 30_000 })
  await page.waitForTimeout(3000)
  const descalco = await andarESoltar()
  console.log(`Descalço: seguiu ${descalco.toFixed(2)} m depois de soltar`)

  await calcar.click()
  const tirar = page.getByRole('button', { name: 'Tirar os patins' })
  await tirar.waitFor()
  if ((await tirar.getAttribute('aria-pressed')) !== 'true')
    throw new Error('O botão dos patins não ficou apertado.')
  await page.getByText('Patins calçados.').first().waitFor()
  await page.locator('canvas').click()

  // Os dois patins nos pés (malhas com o esqueleto do avatar), com as rodinhas no chão.
  await levar(chegada, rumo)
  await esperarParar()
  const ate = Date.now() + 30_000
  let d = await ler()
  while ((d?.patins.length ?? 0) < 2 && Date.now() < ate) {
    await page.waitForTimeout(500)
    d = await ler()
  }
  if (d?.patins.length !== 2) throw new Error('Os patins não apareceram nos pés.')
  const pes = d.posicao.y - CORPO.doCentroAoPe - CORPO.folga
  for (const p of d.patins) {
    console.log(`${p.peca}: ${p.malhas} malhas, rodinhas ${(p.rodas - pes).toFixed(3)} m do chão`)
    if (Math.abs(p.rodas - pes) > 0.012)
      throw new Error(`${p.peca} não está com as rodinhas no chão.`)
  }
  await page.screenshot({ path: path.join(prints, 'patins-calcados.png') })

  const calcado = await andarESoltar('patins-andando.png')
  console.log(`De patins: seguiu ${calcado.toFixed(2)} m depois de soltar`)
  await page.screenshot({ path: path.join(prints, 'patins-deslizou.png') })
  if (calcado < 0.4 || calcado < descalco * 3)
    throw new Error('De patins o corpo não deslizou depois de soltar.')

  // De perto, parado: a câmera chega perto pela roda do mouse.
  await levar(chegada, rumo)
  await esperarParar()
  await page.mouse.move(640, 300)
  for (let i = 0; i < 8; i++) await page.mouse.wheel(0, -400)
  await page.waitForTimeout(4000)
  await page.screenshot({ path: path.join(prints, 'patins-de-perto.png') })

  await tirar.click()
  await calcar.waitFor()
  await page.getByText('Patins guardados na mochila.').first().waitFor()
  const ateSair = Date.now() + 30_000
  d = await ler()
  while ((d?.patins.length ?? 0) > 0 && Date.now() < ateSair) {
    await page.waitForTimeout(500)
    d = await ler()
  }
  if (d?.patins.length) throw new Error('Os patins não saíram dos pés.')

  if (erros.length > 0) throw new Error(`Erros na página: ${erros.join(' | ')}`)
  console.log(`Patins conferidos. Prints em ${prints}`)
} finally {
  await browser?.close()
  server.kill()
}
