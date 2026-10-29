/**
 * Conferência no navegador das receitas do Bento (fase2-04): com a amizade a 10 pontos do terceiro
 * coração (`?bento=290`), a conversa do dia faz ele lembrar o brigadeiro e dar os ingredientes; o
 * forno chega como projeto azul; na bancada da ilha central o brigadeiro sai na hora (a única
 * receita possível) e, sem ingrediente, a bancada abre a lista com o que falta. O diário mostra a
 * página da Vila Doce (fase2-12) e as receitas que ela sabe.
 *
 * `bun playground/verificar-receitas-browser.ts` (navegador: `ARQUIPELAGO_CHROMIUM` com o caminho
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

const port = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4600)
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
  await page.goto(`${baseURL}/?novo=1&posicao=8&bento=290&em=${em}`, {
    waitUntil: 'domcontentloaded',
  })
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
  const rumo = rumoDe(bento, fonte)
  const perto = { x: bento.x + Math.sin(rumo) * 1.6, y: bento.y, z: bento.z + Math.cos(rumo) * 1.6 }
  await levar(perto, rumoDe(perto, bento))
  await page.waitForTimeout(3000)
  await page.getByText('Conversar com o Bento').first().waitFor({ timeout: 20_000 })

  // 1. A conversa do dia passa o terceiro coração: ele lembra o brigadeiro.
  await page.keyboard.press('KeyE')
  const painel = page.getByRole('dialog', { name: 'Bento' })
  await painel.waitFor({ timeout: 10_000 })
  const falas: string[] = []
  for (let i = 0; i < 10; i++) {
    const continuar = painel.getByRole('button', { name: 'Continuar' })
    if (!(await continuar.isVisible())) break
    falas.push((await painel.locator('.arq-capi-fala').innerText()).trim())
    await continuar.click()
  }
  console.log(`Falas: ${falas.join(' | ')}`)
  if (!falas.some((f) => f.includes('brigadeiro')))
    throw new Error('O Bento não lembrou o brigadeiro.')
  await painel.getByRole('button', { name: 'Tchau, Bento' }).click()
  const mochila = page.getByRole('region', { name: 'Mochila' })
  await mochila.getByRole('button', { name: /Cacau/ }).or(mochila.getByText('🫘')).first().waitFor()
  await page.screenshot({ path: path.join(prints, 'receitas-mochila.png') })

  // 2. Na bancada da ilha central: o brigadeiro é a única receita possível e sai na hora.
  const bancada = { x: 10, y: 1, z: -7 }
  const diante = { x: bancada.x, y: bancada.y, z: bancada.z + 1.6 }
  await levar(diante, rumoDe(diante, bancada))
  await page.waitForTimeout(3000)
  await page.getByText('Cozinhar brigadeiro').first().waitFor({ timeout: 20_000 })
  await page.keyboard.press('KeyE')
  await page.getByText('Ficou pronto: brigadeiro', { exact: false }).first().waitFor()
  console.log('Bancada: ficou pronto o brigadeiro')

  // 3. Sem ingrediente, a bancada abre a lista das receitas com o que falta.
  await page.waitForTimeout(800)
  await page.keyboard.press('KeyE')
  const lista = page.getByRole('dialog', { name: 'Bancada' })
  await lista.waitFor({ timeout: 10_000 })
  const linhas = await lista.locator('li').allInnerTexts()
  console.log(`Receitas da bancada: ${linhas.map((l) => l.replace(/\s+/g, ' ')).join(' | ')}`)
  if (!linhas.some((l) => l.includes('Brigadeiro'))) throw new Error('Sem o brigadeiro na lista.')
  if (linhas.some((l) => l.includes('Chocolate quente')))
    throw new Error('O chocolate quente apareceu antes do quarto coração.')
  await page.screenshot({ path: path.join(prints, 'receitas-bancada.png') })
  await lista.getByRole('button', { name: 'Voltar ao jogo' }).click()

  // 4. O forno chegou como projeto azul (o Zappy avisa quando a amizade passa do primeiro coração).
  const forno = await page.evaluate(() => {
    const salvo = localStorage.getItem('arquipelago-playground')
    return salvo ? Boolean(JSON.parse(salvo).salvamento?.projetos?.forno) : null
  })
  console.log(`Forno nos projetos: ${forno}`)
  if (forno === false) throw new Error('O forno não chegou.')
  // 5. O diário: a página da Vila Doce aberta (2 corações) e as receitas sabidas (6 de 7).
  await page.getByRole('button', { name: 'Abrir o menu' }).click()
  await page.getByRole('button', { name: 'Diário', exact: true }).click()
  const diario = page.getByRole('dialog', { name: 'Diário' })
  await diario.waitFor({ timeout: 10_000 })
  await diario.getByText('O Bento me pediu a receita do bolo de fubá', { exact: false }).waitFor()
  await diario.getByText('Receitas: 6 de 7').waitFor()
  await diario.getByText('Receitas: 6 de 7').scrollIntoViewIfNeeded()
  await page.screenshot({ path: path.join(prints, 'receitas-diario.png') })
  console.log('Diário: página da Vila e 6 de 7 receitas')
  if (erros.length) throw new Error(erros.join('\n'))
  console.log('Receitas conferidas.')
} finally {
  await browser?.close()
  server.kill()
}
