/**
 * Conferência no navegador dos borrões da noite (fase2-06): com a lanterna na mochila
 * (`?lanterna=1`) e a Vila Doce já de noite (`?adiantar=12`), os dois borrões da noite aparecem;
 * chegando perto sem a lanterna acesa o borrão foge; com ela acesa (o botão da mochila) ela aparece
 * na mão, o borrão não foge e o E prende: ele some e um Quindim passa a morar na Vila.
 *
 * `bun playground/verificar-borroes-browser.ts` (navegador: `ARQUIPELAGO_CHROMIUM` com o caminho do
 * executável, ou o canal `ARQUIPELAGO_BROWSER_CHANNEL`, padrão `chrome`). Os prints vão para
 * `ARQUIPELAGO_PRINTS` (padrão: a pasta temporária). A noite dura 4 minutos de relógio: com o
 * SwiftShader a ilha leva um tempo para chegar, e as esperas leem o estado, nunca um tempo fixo.
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
  borroes: { id: string; x: number; z: number }[]
  lumisDaVila: string[]
  lanternaNaMao: P | null
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

  const chegada = ancora('chegada')
  const em = `${chegada.x.toFixed(2)},${chegada.z.toFixed(2)},${(chegada.y + 1.2).toFixed(2)}`
  await page.goto(`${baseURL}/?novo=1&persistir=0&posicao=8&lanterna=1&adiantar=12&em=${em}`, {
    waitUntil: 'domcontentloaded',
  })
  const ler = async () =>
    (await page.evaluate(
      () => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho ?? null,
    )) as Desenho | null
  const levar = (p: { x: number; z: number }, y: number, olhar: number) =>
    page.evaluate(
      ({ x, y, z, g }) =>
        (globalThis as { __arquipelagoLevar?: (...a: number[]) => void }).__arquipelagoLevar?.(
          x,
          y,
          z,
          g,
        ),
      { x: p.x, y: y + 1.2, z: p.z, g: olhar + Math.PI },
    )
  const esperar = async (o: string, pronto: (d: Desenho) => boolean, ms = 120_000) => {
    const ate = Date.now() + ms
    while (Date.now() < ate) {
      const d = await ler()
      if (d && pronto(d)) return d
      await page.waitForTimeout(400)
    }
    throw new Error(`Não aconteceu a tempo: ${o}`)
  }
  const plano = (a: { x: number; z: number }, b: { x: number; z: number }) =>
    Math.hypot(a.x - b.x, a.z - b.z)

  const inicio = Date.now()
  const noite = await esperar(
    'a Vila de noite com os dois borrões',
    (d) => d.ilhasCompletas > 0 && d.borroes.length === 2,
    180_000,
  )
  // Os borrões ficam perto das âncoras `lumi-N`, a uns metros do meio da Vila.
  for (const b of noite.borroes)
    if (plano(b, vila.centro) < 1 || plano(b, vila.centro) > 30)
      throw new Error(`O borrão ${b.id} está fora da Vila: (${b.x}, ${b.z}).`)
  console.log(
    `Vila de noite em ${((Date.now() - inicio) / 1000).toFixed(0)} s: ${noite.borroes.map((b) => b.id).join(', ')}`,
  )
  if (noite.lumisDaVila.length !== 0) throw new Error('Já havia Lumi na Vila sem nenhum preso.')
  await page.locator('canvas').click()

  // Sem a lanterna acesa: chegar a 2 m faz o borrão fugir.
  const alvo = noite.borroes[0]
  if (!alvo) throw new Error('Sem borrão.')
  const casa = { x: alvo.x, z: alvo.z }
  const dePerto = (b: { x: number; z: number }, m: number) => {
    const rumo = Math.atan2(chegada.x - b.x, chegada.z - b.z)
    return { x: b.x + Math.sin(rumo) * m, z: b.z + Math.cos(rumo) * m, olhar: rumo + Math.PI }
  }
  const perto = dePerto(casa, 2)
  await levar(perto, chegada.y, perto.olhar)
  await esperar('chegar perto do borrão', (d) => plano(d.posicao, perto) < 0.5)
  const fugiu = await esperar('o borrão fugir sem a lanterna', (d) => {
    const b = d.borroes.find((x) => x.id === alvo.id)
    return !!b && plano(b, casa) > 1 && plano(b, d.posicao) > 3.5
  })
  const longe = fugiu.borroes.find((x) => x.id === alvo.id)
  console.log(`Fugiu: ${longe ? plano(longe, casa).toFixed(2) : '?'} m do lugar dele`)
  await page.getByText('O borrão fugiu da escuridão.').first().waitFor()
  await page.screenshot({ path: path.join(prints, 'borrao-fugindo.png') })

  // Acende a lanterna: ela aparece na mão.
  await page.getByRole('button', { name: 'Acender a lanterna' }).click()
  await page.getByText('Lanterna acesa.').first().waitFor()
  const mao = await esperar('a lanterna na mão', (d) => d.lanternaNaMao !== null, 30_000)
  // Pendurada na mão: perto do corpo, entre o joelho e o peito.
  const l = mao.lanternaNaMao
  const pes = mao.posicao.y - CORPO.doCentroAoPe
  if (!l || plano(l, mao.posicao) > 0.8 || l.y < pes || l.y > pes + 1.2)
    throw new Error(`A lanterna não está na mão: ${JSON.stringify(l)}.`)
  await page.locator('canvas').click()

  // Com a luz, ele volta para casa sem fugir; de perto, o E prende.
  const voltou = await esperar('o borrão voltar para perto de casa', (d) => {
    const b = d.borroes.find((x) => x.id === alvo.id)
    return !!b && plano(b, casa) < 0.6
  })
  const b = voltou.borroes.find((x) => x.id === alvo.id) ?? casa
  const junto = dePerto(b, 1.2)
  await levar(junto, chegada.y, junto.olhar)
  await page.getByText('Prender com a luz').first().waitFor({ timeout: 60_000 })
  await page.screenshot({ path: path.join(prints, 'borrao-na-luz.png') })
  await page.keyboard.press('KeyE')
  await page.screenshot({ path: path.join(prints, 'borrao-preso.png') })
  const depois = await esperar(
    'o borrão virar Quindim',
    (d) => !d.borroes.some((x) => x.id === alvo.id) && d.lumisDaVila.length === 1,
  )
  console.log(`Preso: Lumis na Vila ${depois.lumisDaVila.join(', ')}`)
  if (!depois.lumisDaVila[0]?.endsWith('quindim'))
    throw new Error('O primeiro Lumi não é o Quindim.')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: path.join(prints, 'quindim-na-vila.png') })

  if (erros.length > 0) throw new Error(`Erros na página: ${erros.join(' | ')}`)
  console.log(`Borrões conferidos. Prints em ${prints}`)
} finally {
  await browser?.close()
  server.kill()
}
