/**
 * Conferência no navegador dos Lumis em todas as ilhas (N01, 30/10): um jogo novo já de noite
 * (`?adiantar=12`), sem a lanterna, recebe a lanterna do Zappy; no Bosque saem os borrões da noite
 * dele, a lanterna acesa prende um e ele vira uma Pitanga que passa a morar no Bosque.
 *
 * Compilar para Node: `bun build playground/verificar-lumis-das-ilhas-browser.ts --target=node
 * --external playwright-core --outfile .cache/verificar-lumis.mjs` e `node .cache/verificar-lumis.mjs`
 * (`ARQUIPELAGO_CHROMIUM` ou `ARQUIPELAGO_BROWSER_CHANNEL`; prints em `ARQUIPELAGO_PRINTS`).
 */
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { chromium } from 'playwright-core'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'

const port = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4531)
const baseURL = `http://127.0.0.1:${port}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? tmpdir()
const pacote = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const bosque = ilhasEmVolta().find((i) => i.ilha.id === 'bosque')
if (!bosque) throw new Error('Sem o Bosque no anel.')
const giroIlha = giroDaIlha(bosque.ilha)
const glb = readFileSync(path.join(pacote, 'src', 'assets', 'ilhas', 'bosque.glb'))
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
    x: bosque.centro.x + x * Math.cos(giroIlha) + z * Math.sin(giroIlha),
    y,
    z: bosque.centro.z - x * Math.sin(giroIlha) + z * Math.cos(giroIlha),
  }
}
type Desenho = {
  posicao: P
  ilhasCompletas: number
  borroes: { id: string; x: number; z: number }[]
  lumisDasIlhas: string[]
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
  // As sete pontes já vistas: sem isso a cena da subida de posto (N02) roda uma vez por ilha antes
  // da primeira noite, e no navegador emulado as sete passam dos minutos que o roteiro espera.
  const chegada = ancora('chegada')
  // O `em=` do playground começa um salvamento novo: a posição vai no próprio salvamento semeado.
  // Nascido 12 minutos antes, como o `?adiantar=12` faz com um jogo novo: já é noite.
  const salvo = criarSalvamentoInicial(new Date(Date.now() - 12 * 60_000))
  salvo.pontesVistas = ilhasEmVolta().map((i) => i.ilha.id)
  salvo.casa = { portaNova: true }
  salvo.posicao = { x: chegada.x, y: chegada.y + 1.2, z: chegada.z }
  await context.addInitScript(
    ({ origem, s }) => {
      if (location.origin !== origem) return
      localStorage.setItem('arquipelago:medir', '1')
      localStorage.setItem(
        'arquipelago-playground',
        JSON.stringify({ revisao: 1, salvamento: s, atualizadoEm: new Date().toISOString() }),
      )
    },
    { origem: baseURL, s: salvo },
  )
  const page = await context.newPage()
  page.on('pageerror', (e) => erros.push(e.message))

  // Sem `lanterna=1`: quem dá é o Zappy, na primeira noite.
  await page.goto(`${baseURL}/?posicao=8`, {
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

  // 1. A lanterna do Zappy.
  try {
    await page.getByText('Chegou a noite.', { exact: false }).first().waitFor({ timeout: 180_000 })
  } catch (e) {
    // O que estava na tela quando o recado não veio: o print e o texto da HUD.
    await page.screenshot({ path: path.join(prints, 'falha-sem-recado-da-noite.png') })
    console.error(
      await page
        .locator('.arq-hud')
        .innerText()
        .catch(() => '(sem HUD)'),
    )
    throw e
  }
  await page.getByRole('button', { name: 'Acender a lanterna' }).waitFor({ timeout: 30_000 })
  console.log('O Zappy deu a lanterna na primeira noite.')
  await page.screenshot({ path: path.join(prints, 'lanterna-do-zappy.png') })

  // 2. Os borrões do Bosque.
  const noite = await esperar(
    'o Bosque de noite com os dois borrões dele',
    (d) => d.ilhasCompletas > 0 && d.borroes.filter((b) => b.id.startsWith('bosque:')).length === 2,
    180_000,
  )
  const doBosque = noite.borroes.filter((b) => b.id.startsWith('bosque:'))
  for (const b of doBosque)
    if (plano(b, bosque.centro) > 30) throw new Error(`O borrão ${b.id} está fora do Bosque.`)
  console.log(`Borrões do Bosque: ${doBosque.map((b) => b.id).join(', ')}`)
  await page.locator('canvas').click()
  await page.getByRole('button', { name: 'Acender a lanterna' }).click()
  await page.getByText('Lanterna acesa.').first().waitFor()
  await page.locator('canvas').click()
  const alvo = doBosque[0]
  if (!alvo) throw new Error('Sem borrão.')
  const rumo = Math.atan2(chegada.x - alvo.x, chegada.z - alvo.z)
  const junto = { x: alvo.x + Math.sin(rumo) * 1.2, z: alvo.z + Math.cos(rumo) * 1.2 }
  await levar(junto, chegada.y, rumo + Math.PI)
  await page.getByText('Prender com a luz').first().waitFor({ timeout: 60_000 })
  await page.keyboard.press('KeyE')
  const depois = await esperar(
    'o borrão virar uma Pitanga no Bosque',
    (d) =>
      !d.borroes.some((x) => x.id === alvo.id) &&
      d.lumisDasIlhas.some((l) => l.startsWith('bosque-')),
  )
  const morador = depois.lumisDasIlhas.find((l) => l.startsWith('bosque-'))
  console.log(`Preso: ${morador}`)
  if (!morador?.endsWith('pitanga')) throw new Error('O primeiro Lumi do Bosque não é a Pitanga.')
  // No primeiro Lumi de todos, a dica de primeira vez pode tomar o lugar da fala do Zappy.
  await page.waitForTimeout(1500)
  console.log(
    `Fala na tela: ${(await page.locator('.arq-dica, [role="status"]').allInnerTexts()).join(' | ')}`,
  )
  await page.waitForTimeout(2500)
  await page.screenshot({ path: path.join(prints, 'pitanga-no-bosque.png') })

  if (erros.length > 0) throw new Error(`Erros na página: ${erros.join(' | ')}`)
  console.log(`Lumis das ilhas conferidos. Prints em ${prints}`)
} finally {
  await browser?.close()
  server.kill()
}
