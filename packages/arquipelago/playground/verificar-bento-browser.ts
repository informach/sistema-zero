/**
 * Conferência no navegador do Bento na Vila Doce (fase2-02): ele aparece na frente da padaria com a
 * ilha completa, segura o corpo, "Conversar com o Bento" abre a conversa (primeiro encontro com o
 * pedido de hoje), as escolhas mostram o pedido e o que falta, o presente mostra o convite dele
 * e "Tchau, Bento" fecha e devolve o jogo.
 *
 * `bun playground/verificar-bento-browser.ts` (navegador: `ARQUIPELAGO_CHROMIUM` com o caminho
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
const rumoDe = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.atan2(b.x - a.x, b.z - a.z)
type Desenho = { posicao: P; ilhasCompletas: number }

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

  const bento = ancora('morador')
  const fonte = ancora('fonte')
  // 1. Um passo e meio na frente dele, do lado da praça, olhando para ele.
  const rumo = rumoDe(bento, fonte)
  const perto = { x: bento.x + Math.sin(rumo) * 1.6, y: bento.y, z: bento.z + Math.cos(rumo) * 1.6 }
  await levar(perto, rumoDe(perto, bento))
  await page.waitForTimeout(3000)
  await page.screenshot({ path: path.join(prints, 'bento-perto.png') })
  await page.getByText('Conversar com o Bento').first().waitFor({ timeout: 20_000 })

  // 2. Andar contra ele: o cilindro segura (não atravessa).
  const antes = await ler()
  await page.keyboard.down('KeyW')
  await page.waitForTimeout(2000)
  await page.keyboard.up('KeyW')
  const depois = await ler()
  if (!antes || !depois) throw new Error('Sem medidor.')
  const longe = Math.hypot(depois.posicao.x - bento.x, depois.posicao.z - bento.z)
  console.log(`Andando contra o Bento: parou a ${longe.toFixed(2)} m dele`)
  if (longe < 0.6) throw new Error('A criança atravessou o Bento.')

  // 3. A conversa: primeiro encontro, com o pedido de hoje no fim.
  await page.keyboard.press('KeyE')
  const painel = page.getByRole('dialog', { name: 'Bento' })
  await painel.waitFor({ timeout: 10_000 })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: path.join(prints, 'bento-conversa.png') })
  const falas: string[] = []
  for (let i = 0; i < 8; i++) {
    const continuar = painel.getByRole('button', { name: 'Continuar' })
    if (!(await continuar.isVisible())) break
    falas.push((await painel.locator('.arq-capi-fala').innerText()).trim())
    await continuar.click()
  }
  console.log(`Falas: ${falas.join(' | ')}`)
  if (!falas[0]?.includes('Bento')) throw new Error('O primeiro encontro não apresenta o Bento.')
  if (!falas.at(-1)?.startsWith('Hoje eu queria uma coisa'))
    throw new Error('Sem o pedido de hoje.')
  await painel.getByText('Pedido de hoje').waitFor()
  const falta = await painel.locator('.arq-capi-falta').innerText()
  console.log(`O que falta: ${falta}`)
  await page.screenshot({ path: path.join(prints, 'bento-escolhas.png') })

  // 4. O presente: o convite dele (ou a mochila vazia) e volta.
  await painel.getByRole('button', { name: 'Dar um presente' }).click()
  const convite = (await painel.locator('.arq-capi-fala').innerText()).trim()
  console.log(`Presente: ${convite}`)
  if (!convite.includes('Bento') && !convite.includes('mochila está vazia'))
    throw new Error('A tela do presente não é a do Bento.')
  await page.screenshot({ path: path.join(prints, 'bento-presente.png') })
  await painel.getByRole('button', { name: 'Voltar' }).click()

  // 5. Tchau fecha e o jogo volta (o "Conversar" aparece de novo).
  await painel.getByRole('button', { name: 'Tchau, Bento' }).click()
  await painel.waitFor({ state: 'detached', timeout: 5000 })
  await page.getByText('Conversar com o Bento').first().waitFor({ timeout: 10_000 })
  // A segunda conversa do dia é só a despedida.
  await page.keyboard.press('KeyE')
  await painel.waitFor()
  const despedida = (await painel.locator('.arq-capi-fala').innerText()).trim()
  console.log(`Segunda conversa: ${despedida}`)
  if (!despedida.startsWith('Até amanhã') && !despedida.startsWith('Volte amanhã'))
    throw new Error('A segunda conversa do dia não foi a despedida.')
  if (erros.length) throw new Error(erros.join('\n'))
  console.log('Bento conferido.')
} finally {
  await browser?.close()
  server.kill()
}
