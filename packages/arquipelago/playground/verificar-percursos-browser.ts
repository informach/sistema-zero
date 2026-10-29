/**
 * Conferência no navegador dos percursos (fase2-05): a entrega pelos telhados da Vila Doce (o
 * "Começar" na frente dos caixotes, o cronômetro com os confeitos, a queda que volta ao telhado,
 * o confeito sobre a primeira casinha e a chegada no terraço da sorveteria com as estrelas) e o percurso nas
 * copas do Bosque, que passou a usar o mesmo componente (começa, conta, cai e volta ao deque). A
 * primeira entrega põe os patins na mochila.
 *
 * `bun playground/verificar-percursos-browser.ts` (navegador: `ARQUIPELAGO_CHROMIUM` com o caminho
 * do executável, ou o canal `ARQUIPELAGO_BROWSER_CHANNEL`, padrão `chrome`). Os prints vão para
 * `ARQUIPELAGO_PRINTS` (padrão: a pasta temporária).
 */
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  type AncorasDoPercurso,
  NOMES_DAS_ANCORAS_DO_PERCURSO,
  percursoNoModelo,
  percursoNoMundo,
} from '../src/mundo/bosque'
import { giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'
import {
  type AncorasDosTelhados,
  NOMES_DAS_ANCORAS_DOS_TELHADOS,
  telhadosNoModelo,
} from '../src/mundo/telhados'
import type { PontosDoPercurso } from '../src/sistemas/percurso'

const port = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4599)
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
type Desenho = { posicao: P; ilhasCompletas: number }

const bosque = ilhasEmVolta().find((i) => i.ilha.id === 'bosque')
if (!bosque) throw new Error('Sem o Bosque no anel.')
async function carregar(nome: string) {
  const bin = readFileSync(path.join(import.meta.dir, '..', 'src', 'assets', 'ilhas', nome))
  return (
    await new GLTFLoader().parseAsync(
      bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength),
      '',
    )
  ).scene
}
function pontosDe<N extends string>(
  cena: Awaited<ReturnType<typeof carregar>>,
  nomes: readonly N[],
): Record<N, P> {
  const r = {} as Record<N, P>
  for (const n of nomes) {
    const o = cena.getObjectByName(n)
    if (!o) throw new Error(`sem a âncora ${n}`)
    r[n] = { x: o.position.x, y: o.position.y, z: o.position.z }
  }
  return r
}
const telhados: PontosDoPercurso = percursoNoMundo(
  telhadosNoModelo(pontosDe(modelo, NOMES_DAS_ANCORAS_DOS_TELHADOS) as AncorasDosTelhados),
  { x: vila.centro.x, y: 0, z: vila.centro.z },
  giroIlha,
)
const copas: PontosDoPercurso = percursoNoMundo(
  percursoNoModelo(
    pontosDe(await carregar('bosque.glb'), NOMES_DAS_ANCORAS_DO_PERCURSO) as AncorasDoPercurso,
  ),
  { x: bosque.centro.x, y: 0, z: bosque.centro.z },
  giroDaIlha(bosque.ilha),
)

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

  const posicao = async () => (await ler())?.posicao ?? { x: 0, y: 0, z: 0 }
  const plano = (a: { x: number; z: number }, b: { x: number; z: number }) =>
    Math.hypot(a.x - b.x, a.z - b.z)
  const cronometro = (nome: string) => page.getByRole('timer', { name: nome })
  /** Espera o corpo chegar perto de `alvo` (o SwiftShader desenha poucos quadros por segundo). */
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
  /** Cai do percurso em `chao` e espera a volta para `volta` (primeiro sai, depois volta). */
  const cairEVoltar = async (chao: P, volta: P) => {
    await levar(chao, 0)
    await esperarPerto(chao, 1.5)
    return esperarPerto(volta, 0.8)
  }

  // 1. A entrega pelos telhados.
  await levar(telhados.largada, telhados.rumoDaLargada)
  await page.waitForTimeout(2500)
  await page.getByText('Começar a entrega pelos telhados').first().waitFor({ timeout: 20_000 })
  await page.keyboard.press('KeyE')
  const relogio = cronometro('Entrega pelos telhados')
  await relogio.waitFor({ timeout: 10_000 })
  await relogio.getByText('🍬 0/4').waitFor()
  await page.screenshot({ path: path.join(prints, 'telhados-largada.png') })

  const [caixote, casinha1] = telhados.deques
  if (!caixote || !casinha1) throw new Error('Paradas faltando.')
  await levar(caixote, telhados.rumoDaLargada)
  await esperarPerto(caixote, caixote.raio)
  await page.waitForTimeout(3000)
  // Caiu na rua: a tela escurece e o corpo volta para cima do caixote.
  const voltou = await cairEVoltar(telhados.largada, caixote.volta)
  console.log(
    `Queda: voltou a ${plano(voltou, caixote.volta).toFixed(2)} m da volta do caixote, pé em ${(voltou.y - 0.9).toFixed(2)}`,
  )
  if (plano(voltou, caixote.volta) > 0.8 || voltou.y - 0.9 < caixote.y - 0.3)
    throw new Error('A queda não voltou para o caixote.')
  await page.screenshot({ path: path.join(prints, 'telhados-voltou.png') })

  // O primeiro confeito fica sobre a beirada da primeira casinha (o pulo do caixote é curto): dá
  // para pegar andando perto da beirada. Os outros ficam no ar, no meio dos pulos (o teste de unidade confere a
  // altura); com o SwiftShader a poucos quadros por segundo, levar o corpo até eles não serve.
  const confeito = telhados.vagalumes[0]
  if (!confeito) throw new Error('Sem confeito.')
  // Meio metro para dentro do telhado (em cima da beirada a cápsula escorrega para a rua).
  const paraDentro = Math.hypot(casinha1.x - confeito.x, casinha1.z - confeito.z) || 1
  await levar(
    {
      x: confeito.x + ((casinha1.x - confeito.x) / paraDentro) * 0.5,
      y: casinha1.y,
      z: confeito.z + ((casinha1.z - confeito.z) / paraDentro) * 0.5,
    },
    casinha1.rumoDaVolta,
  )
  await relogio.getByText('🍬 1/4').waitFor({ timeout: 30_000 })
  await page.screenshot({ path: path.join(prints, 'telhados-confeito.png') })
  for (const d of telhados.deques.slice(1)) {
    await levar(d, d.rumoDaVolta)
    await page.waitForTimeout(3000)
  }
  await levar(telhados.chegada, 0)
  const resultado = page.getByRole('dialog', { name: 'Entrega pelos telhados' })
  await resultado.waitFor({ timeout: 10_000 })
  await resultado.getByText('Os 4 confeitos').waitFor()
  const pegos = (await resultado.locator('.arq-tempos div').nth(2).locator('dd').innerText()).trim()
  const ganhas = await resultado.locator('li.ganhou').count()
  console.log(`Entrega: ${ganhas} estrelas, confeitos ${pegos}`)
  if (!pegos.endsWith('de 4') || pegos.startsWith('0 '))
    throw new Error('A entrega perdeu os confeitos.')
  const todos = pegos === '4 de 4'
  if (ganhas !== (todos ? 3 : 2))
    throw new Error('A entrega não deu as estrelas da chegada e do tempo.')
  await page.screenshot({ path: path.join(prints, 'telhados-resultado.png') })
  // A primeira entrega traz os patins para a mochila.
  await page.getByRole('button', { name: 'Calçar os patins' }).waitFor({ timeout: 10_000 })
  await page.getByText('um par de patins', { exact: false }).first().waitFor({ timeout: 10_000 })
  await resultado.getByRole('button', { name: 'Continuar' }).click()
  await resultado.waitFor({ state: 'detached' })

  // 2. O percurso nas copas, no mesmo componente.
  await levar(copas.largada, copas.rumoDaLargada)
  await page.getByText('Começar o percurso nas copas').first().waitFor({ timeout: 180_000 })
  await page.keyboard.press('KeyE')
  const relogioDasCopas = cronometro('Percurso nas copas')
  await relogioDasCopas.waitFor({ timeout: 10_000 })
  await relogioDasCopas.getByText('✨ 0/5').waitFor()
  const deque = copas.deques[0]
  if (!deque) throw new Error('Sem deque.')
  await levar(deque, deque.rumoDaVolta)
  await esperarPerto(deque, deque.raio)
  // O deque só conta num quadro com o corpo em cima: o Bosque desenha ainda mais devagar.
  await page.waitForTimeout(6000)
  const noDeque = await cairEVoltar(copas.largada, deque.volta)
  console.log(`Copas: voltou a ${plano(noDeque, deque.volta).toFixed(2)} m da volta do deque 1`)
  if (plano(noDeque, deque.volta) > 0.8) throw new Error('A queda nas copas não voltou ao deque.')
  await relogioDasCopas.getByRole('button', { name: 'Parar' }).click()
  await relogioDasCopas.waitFor({ state: 'detached' })
  await page.screenshot({ path: path.join(prints, 'copas-parou.png') })

  if (erros.length > 0) throw new Error(`Erros na página: ${erros.join(' | ')}`)
  console.log(`Percursos conferidos. Prints em ${prints}`)
} finally {
  await browser?.close()
  server.kill()
}
