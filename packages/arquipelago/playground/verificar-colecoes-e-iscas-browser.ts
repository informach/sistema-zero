/**
 * Conferência no navegador das coleções do Pico e das Nuvens e das iscas da pesca (30/10/2026),
 * com os modelos e o jogo reais e a plataforma falsa local (nenhum banco ou perfil remoto):
 *
 * 1. Pico, de dia: três notas pelo chão da ilha e a ponta de gelo azul dentro da caverna, cada uma
 *    pelo E / Usar, e o álbum com as seções novas.
 * 2. Nuvens, à noite: a estrela cadente aparece e se pega.
 * 3. Sua ilha: a latinha de minhocas e a pena de graça, a minhoca escolhida na mochila, a pesca com
 *    ela (o peixe chega em 1 s) e a isca gasta só quando o peixe vem.
 *
 * O salvamento vai semeado (pontes vistas, para a cena da subida de posto não tomar a vez), com o
 * corpo já na ilha de cada parte. Compilar para Node:
 * `bun build playground/verificar-colecoes-e-iscas-browser.ts --target=node --external playwright-core
 * --outfile .cache/verificar-colecoes-e-iscas-browser.mjs`. `ARQUIPELAGO_CHROMIUM` escolhe o
 * Chromium; os prints vão para `ARQUIPELAGO_PRINTS` (uma pasta nova).
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { criarSalvamentoInicial, type Salvamento } from '@sistemazero/arquipelago-contracts'
import { chromium, type Page } from 'playwright-core'
import { LUGAR_DA_MINHOCA, LUGAR_DA_PENA, PONTO_DA_PESCA } from '../src/mundo/lugares-da-praia'
import { ALTURA_DAS_NUVENS, giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'
import {
  CRISTAIS_DO_PICO,
  ESTRELAS_DAS_NUVENS,
  NOTAS_DO_PICO,
  type PecaDaColecao,
} from '../src/sistemas/colecoes-das-ilhas'
import { CORPO } from '../src/sistemas/corpo'

const prints = process.env.ARQUIPELAGO_PRINTS
if (!prints) throw new Error('Defina uma pasta nova em ARQUIPELAGO_PRINTS.')
await mkdir(prints, { recursive: false })
const port = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4533)
const baseURL = `http://127.0.0.1:${port}`

type P = { x: number; y: number; z: number }

/** Do referencial do GLB da ilha para o mundo (o mesmo `paraOMundo` do jogo). */
function noMundo(ilhaId: 'pico' | 'nuvens', p: P): P {
  const achada = ilhasEmVolta().find((i) => i.ilha.id === ilhaId)
  if (!achada) throw new Error(`sem a ilha ${ilhaId}`)
  const g = giroDaIlha(achada.ilha)
  const c = Math.cos(g)
  const s = Math.sin(g)
  return {
    x: achada.centro.x + p.x * c + p.z * s,
    y: p.y + (ilhaId === 'nuvens' ? ALTURA_DAS_NUVENS : 0),
    z: achada.centro.z - p.x * s + p.z * c,
  }
}
const lugar = (p: PecaDaColecao) => {
  if (!p.lugar) throw new Error(`${p.id} sem lugar`)
  return noMundo(p.ilha, p.lugar)
}

/** Um salvamento com as pontes vistas, o corpo em `em` e nascido `minutosAntes` (a noite). */
function semente(em: P, minutosAntes = 0, inventario?: Record<string, number>): Salvamento {
  const s = criarSalvamentoInicial(new Date(Date.now() - minutosAntes * 60_000))
  s.pontesVistas = ilhasEmVolta().map((i) => i.ilha.id)
  s.casa = { portaNova: true }
  s.posicao = { x: em.x, y: em.y + 1.2, z: em.z }
  if (inventario) s.inventario = inventario
  return s
}

const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
})
server.stdout.on('data', () => {})
server.stderr.on('data', (d) => process.stderr.write(d))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined

async function abrir(s: Salvamento, celular = false) {
  if (!browser) throw new Error('sem navegador')
  const context = await browser.newContext({
    viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
    isMobile: celular,
    hasTouch: celular,
  })
  context.setDefaultTimeout(120_000)
  await context.addInitScript(
    ({ s }) => {
      localStorage.setItem('arquipelago:medir', '1')
      if (!sessionStorage.getItem('semeado')) {
        localStorage.setItem(
          'arquipelago-playground',
          JSON.stringify({ revisao: 1, salvamento: s, atualizadoEm: new Date().toISOString() }),
        )
        sessionStorage.setItem('semeado', '1')
      }
    },
    { s },
  )
  const page = await context.newPage()
  const erros: string[] = []
  page.on('pageerror', (e) => erros.push(e.message))
  await page.goto(`${baseURL}/?posicao=8&qualidade=leve`, { waitUntil: 'domcontentloaded' })
  return { context, page, erros }
}

async function levar(page: Page, p: P) {
  await page.waitForFunction(
    () => typeof (globalThis as { __arquipelagoLevar?: unknown }).__arquipelagoLevar === 'function',
  )
  await page.evaluate(
    ({ x, y, z }) =>
      (
        globalThis as { __arquipelagoLevar?: (x: number, y: number, z: number, g: number) => void }
      ).__arquipelagoLevar?.(x, y, z, Math.PI),
    { ...p, y: p.y + CORPO.doCentroAoPe + 0.1 },
  )
}

const inventario = (page: Page): Promise<Record<string, number>> =>
  page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('arquipelago-playground') ?? '{}').salvamento?.inventario ??
      {},
  )

async function esperarNoInventario(page: Page, id: string, qtd: number) {
  await page.waitForFunction(
    ({ id, qtd }) =>
      (JSON.parse(localStorage.getItem('arquipelago-playground') ?? '{}').salvamento?.inventario?.[
        id
      ] ?? 0) === qtd,
    { id, qtd },
    { timeout: 60_000 },
  )
}

async function usar(page: Page, texto: string, celular = false) {
  await page.locator('.arq-acao').filter({ hasText: texto }).first().waitFor({ timeout: 180_000 })
  if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
  else await page.keyboard.press('e')
}

async function esperarIlhaCompleta(page: Page) {
  await page.waitForFunction(
    () =>
      ((globalThis as { __arquipelagoDesenho?: { ilhasCompletas?: number } }).__arquipelagoDesenho
        ?.ilhasCompletas ?? 0) > 0,
    undefined,
    { timeout: 240_000 },
  )
}

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
  const parte = process.env.ARQUIPELAGO_PARTE

  // ── 1. Pico, de dia ─────────────────────────────────────────────────────────────────────────
  if (!parte || parte === 'pico') {
    const [seminima, colcheia, dupla] = NOTAS_DO_PICO
    const azul = CRISTAIS_DO_PICO[0]
    const { context, page, erros } = await abrir(semente(lugar(seminima)))
    await esperarIlhaCompleta(page)
    await page.locator('canvas').click()
    for (const p of [seminima, colcheia, dupla, azul]) {
      await levar(page, lugar(p))
      await usar(page, p.pegar)
      if (p === seminima) await page.screenshot({ path: path.join(prints, 'pico-nota.png') })
      await esperarNoInventario(page, p.id, 1)
      if (p === azul) await page.screenshot({ path: path.join(prints, 'pico-caverna.png') })
      console.log(`Pico: ${p.nome} na mochila.`)
    }
    // A clave de sol, no alto da parede de gelo, não aparece de baixo.
    const clave = lugar(NOTAS_DO_PICO[3])
    await levar(page, { ...clave, y: clave.y - 4.4 })
    await page.waitForTimeout(1500)
    assert.equal(await page.locator('.arq-acao').filter({ hasText: 'clave' }).count(), 0)
    // O álbum: três de quatro notas e um de quatro cristais.
    await page.getByRole('button', { name: 'Abrir o álbum de coleções' }).click()
    const album = page.getByRole('dialog', { name: 'Álbum de coleções' })
    await album.getByText('Notas musicais do Pico').first().waitFor()
    await album
      .getByText('Lá no alto da parede de gelo. O vento ajuda quem tem planador.')
      .waitFor()
    await album.getByText('Cristais do Pico').first().scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(prints, 'album-pico.png') })
    assert.deepEqual(erros, [])
    await context.close()
  }

  // ── 2. Nuvens, à noite ──────────────────────────────────────────────────────────────────────
  if (!parte || parte === 'nuvens') {
    const cadente = ESTRELAS_DAS_NUVENS[0]
    const { context, page, erros } = await abrir(semente(lugar(cadente), 12))
    await esperarIlhaCompleta(page)
    await page.locator('canvas').click()
    await levar(page, lugar(cadente))
    await usar(page, cadente.pegar)
    await page.screenshot({ path: path.join(prints, 'nuvens-estrela.png') })
    await esperarNoInventario(page, cadente.id, 1)
    console.log('Nuvens: a estrela cadente caiu à noite e foi para a mochila.')
    assert.deepEqual(erros, [])
    await context.close()
  }

  // ── 3. Sua ilha: iscas e pesca ──────────────────────────────────────────────────────────────
  for (const celular of [false, true]) {
    if (parte && parte !== 'iscas') break
    const tipo = celular ? 'celular' : 'computador'
    const { context, page, erros } = await abrir(
      semente(LUGAR_DA_MINHOCA, 0, { 'semente-alface': 3 }),
      celular,
    )
    if (!celular) await page.locator('canvas').click()
    await levar(page, LUGAR_DA_MINHOCA)
    await usar(page, 'Pegar a latinha de minhocas', celular)
    await esperarNoInventario(page, 'isca-minhoca', 1)
    await page.screenshot({ path: path.join(prints, `iscas-${tipo}-latinha.png`) })
    await levar(page, LUGAR_DA_PENA)
    await usar(page, 'Pegar a isca de penas', celular)
    await esperarNoInventario(page, 'isca-pena', 1)
    // Com a pena na mochila, a de graça some do píer.
    await page.waitForTimeout(800)
    assert.equal(await page.locator('.arq-acao').filter({ hasText: 'isca de penas' }).count(), 0)
    // A minhoca escolhida pela mochila.
    const botao = page.getByRole('button', { name: /^Usar a minhoca na pesca/ })
    if (celular) await botao.tap()
    else await botao.click()
    await page.getByRole('button', { name: /^Tirar a minhoca do anzol/ }).waitFor()
    await levar(page, PONTO_DA_PESCA)
    await usar(page, 'Lançar a linha com a minhoca', celular)
    // Com a minhoca o peixe chega em 1 s de jogo: o recado de recolher vem antes dos 3 s de sempre.
    await usar(page, 'Recolher a linha', celular)
    await esperarNoInventario(page, 'peixe-sardinha', 1)
    const depois = await inventario(page)
    assert.equal(depois['isca-minhoca'] ?? 0, 0, 'a minhoca é gasta quando o peixe vem')
    assert.equal(depois['isca-pena'], 1, 'a pena continua guardada')
    await page.screenshot({ path: path.join(prints, `iscas-${tipo}-pesca.png`) })
    console.log(`${tipo}: latinha e pena de graça, pesca com minhoca, isca gasta no peixe.`)
    assert.deepEqual(erros, [])
    await context.close()
  }
  console.log(`Coleções e iscas conferidas. Prints em ${prints}`)
} finally {
  await browser?.close()
  server.kill()
}
