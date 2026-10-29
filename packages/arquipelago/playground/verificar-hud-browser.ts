/**
 * O HUD novo, o menu de pausa e a abertura "O Cinza" no playground. Executar no pacote:
 * bun build playground/verificar-hud-browser.ts --target=node --external playwright-core --outfile .cache/verificar-hud-browser.mjs
 * node .cache/verificar-hud-browser.mjs
 * ARQUIPELAGO_CHROMIUM escolhe o navegador; ARQUIPELAGO_PRINTS a pasta dos prints;
 * ARQUIPELAGO_TELA (computador, notebook ou celular) roda uma tela só.
 *
 * Confere: a abertura na primeira vez (cenas, legenda, passar com Enter e pular segurando), a
 * fala do Zappy depois dela, as partes do HUD sem se cobrirem, as teclas de 1 a 5 da mochila, o
 * menu (lugares, conforto, Esc), o diário revendo a abertura e o HUD da corrida (saltos das Nuvens).
 */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { type BrowserContext, chromium, type Page } from 'playwright-core'
import { posicaoDoCanteiro } from '../src/mundo/colisao-da-ilha-central'
import { ALTURA_DA_TERRA, giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'
import { LARGADA_DOS_SALTOS } from '../src/mundo/saltos-das-nuvens'
import { CENAS, SEGURAR_PARA_PULAR_MS } from '../src/sistemas/abertura'
import { CORPO } from '../src/sistemas/corpo'

type P = { x: number; y: number; z: number }
type Desenho = {
  posicao: P
  ilhasCompletas: number
  noChao: boolean
  corrida: { percurso: string | null } | null
}
const port = await new Promise<number>((resolve, reject) => {
  const reserva = createServer()
  reserva.once('error', reject)
  reserva.listen(0, '127.0.0.1', () => {
    const endereco = reserva.address()
    if (!endereco || typeof endereco === 'string') return reject(new Error('Sem porta local'))
    reserva.close(() => resolve(endereco.port))
  })
})
const baseURL = `http://127.0.0.1:${port}`
const prints =
  process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-29-arquipelago-hud')
mkdirSync(prints, { recursive: true })
const achada = ilhasEmVolta().find((i) => i.ilha.id === 'nuvens')
if (!achada) throw new Error('Nuvens fora do anel')
const nuvens = achada
const giro = giroDaIlha(nuvens.ilha)
const mundo = (p: P): P => ({
  x: nuvens.centro.x + p.x * Math.cos(giro) + p.z * Math.sin(giro),
  y: p.y + 7,
  z: nuvens.centro.z - p.x * Math.sin(giro) + p.z * Math.cos(giro),
})
const rumo = (a: P, b: P) => Math.atan2(b.x - a.x, b.z - a.z)
const PE = CORPO.doCentroAoPe + CORPO.folga

const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let servidorPronto = false
server.stdout.on('data', (d) => {
  if (String(d).includes('Arquipélago no ar')) servidorPronto = true
})
server.stderr.on('data', (d) => process.stderr.write(d))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined

const esperar = (page: Page, fn: (d: Desenho, a: unknown) => boolean, arg?: unknown, ms = 60_000) =>
  page.waitForFunction(
    `(() => { const d = globalThis.__arquipelagoDesenho; return !!d && (${fn.toString()})(d, ${JSON.stringify(arg ?? null)}) })()`,
    undefined,
    { timeout: ms },
  )
const levar = (page: Page, p: P, olhar: number) =>
  page.evaluate(
    ({ p, g }) => {
      const ir = (globalThis as { __arquipelagoLevar?: (...args: number[]) => void })
        .__arquipelagoLevar
      if (!ir) throw new Error('Sem transporte de conferência')
      ir(p.x, p.y + 1.2, p.z, g)
    },
    { p, g: olhar + Math.PI },
  )
const dePe = async (page: Page, p: P, olhar: number) => {
  await levar(page, p, olhar)
  await esperar(
    page,
    (d, a) => {
      const q = a as P & { pe: number }
      return (
        d.noChao &&
        Math.hypot(d.posicao.x - q.x, d.posicao.z - q.z) < 0.35 &&
        Math.abs(d.posicao.y - q.pe - q.y) < 0.1
      )
    },
    { ...p, pe: PE },
  )
  await page.waitForTimeout(300)
}

/** As caixas das partes do HUD não se cruzam (as que existem na tela). */
async function semSobreposicao(page: Page, tipo: string, seletores: string[]) {
  const caixas: { s: string; r: { x: number; y: number; width: number; height: number } }[] = []
  for (const s of seletores) {
    const l = page.locator(s).first()
    if ((await l.count()) === 0 || !(await l.isVisible())) continue
    const r = await l.boundingBox()
    if (r) caixas.push({ s, r })
  }
  for (let i = 0; i < caixas.length; i++)
    for (let j = i + 1; j < caixas.length; j++) {
      const a = caixas[i]!.r
      const b = caixas[j]!.r
      const cruza =
        a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
      if (cruza)
        throw new Error(
          `${tipo}: ${caixas[i]!.s} cobre ${caixas[j]!.s} ${JSON.stringify({ a, b })}`,
        )
    }
  return caixas.map((c) => c.s)
}

const PARTES = [
  '.arq-quem',
  '.arq-ilha-agora',
  '.arq-topo-dir',
  '.arq-agora',
  '.arq-dica',
  '.arq-baixo',
  '.arq-cantinho',
  '.arq-botoes-toque',
  '.arq-cronometro',
  '.arq-altura',
]

const TELAS = {
  computador: { viewport: { width: 1280, height: 720 }, celular: false },
  notebook: { viewport: { width: 1024, height: 640 }, celular: false },
  celular: { viewport: { width: 390, height: 844 }, celular: true },
} as const

async function abrir(context: BrowserContext, url: string) {
  const page = await context.newPage()
  const erros: string[] = []
  page.on('pageerror', (e) => {
    erros.push(e.message)
    console.error('pageerror', e.message)
  })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  return { page, erros }
}

const relatorio: string[] = []
try {
  const deadline = Date.now() + 30_000
  while (true) {
    if (server.exitCode !== null) throw new Error('Playground encerrou')
    try {
      if (servidorPronto && (await fetch(baseURL)).ok) break
    } catch {}
    if (Date.now() > deadline) throw new Error('Playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  for (const [tipo, tela] of Object.entries(TELAS)) {
    if (process.env.ARQUIPELAGO_TELA && process.env.ARQUIPELAGO_TELA !== tipo) continue
    const { celular } = tela
    // Cada parte num navegador limpo: o rascunho guardado de uma não vira conflito na outra.
    const contextos: BrowserContext[] = []
    const novoContexto = async () => {
      const c = await browser!.newContext({
        viewport: tela.viewport,
        deviceScaleFactor: 1,
        reducedMotion: celular ? 'reduce' : 'no-preference',
        isMobile: celular,
        hasTouch: celular,
      })
      c.setDefaultTimeout(120_000)
      await c.addInitScript(() => {
        localStorage.setItem('arquipelago:medir', '1')
        localStorage.setItem('arquipelago:conforto', JSON.stringify({ qualidade: 'leve' }))
      })
      contextos.push(c)
      return c
    }

    // ── 1. A abertura na primeira vez ─────────────────────────────────────────────────────
    const { page, erros } = await abrir(
      await novoContexto(),
      `${baseURL}/?novo=1&persistir=0&abertura=1`,
    )
    const abertura = page.getByRole('dialog', { name: 'Abertura: O Cinza' })
    await abertura.waitFor({ timeout: 180_000 })
    const legenda = page.locator('.arq-abertura-legenda p')
    await legenda.filter({ hasText: 'No Arquipélago, tudo existia' }).waitFor()
    // O HUD fica fora enquanto ela passa.
    if ((await page.locator('.arq-quem').count()) !== 0) throw new Error(`${tipo}: HUD na abertura`)
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(prints, `${tipo}-abertura-1.png`) })
    if (!celular) {
      // Enter passa a cena; o personagem por baixo não recebe a tecla.
      // O print do 3D por baixo é lento: a cena pode andar sozinha, então segue a da tela.
      const cenaNaTela = () =>
        page
          .locator('.arq-abertura-progresso i')
          .evaluateAll((is) => is.findIndex((i) => i.classList.contains('agora')))
      let atual = 0
      while (atual < CENAS.length - 1) {
        await page.keyboard.press('Enter')
        await page.waitForFunction((antes) => {
          const is = [...document.querySelectorAll('.arq-abertura-progresso i')]
          return is.findIndex((i) => i.classList.contains('agora')) > antes
        }, atual)
        atual = await cenaNaTela()
        const primeira = CENAS[atual]!.falas[0]!.texto
        if (atual === CENAS.length - 1) break
        await legenda.filter({ hasText: primeira.slice(0, 20) }).waitFor()
        await page.waitForTimeout(1000)
        await page.screenshot({ path: path.join(prints, `${tipo}-abertura-${atual + 1}.png`) })
      }
      // Na última cena, primeiro a luz pisca; depois o Zappy se apresenta.
      await legenda.filter({ hasText: 'E nele, uma luz piscava.' }).waitFor()
      await page.screenshot({ path: path.join(prints, `${tipo}-abertura-8.png`) })
      await page.locator('.arq-abertura-quem').filter({ hasText: 'Zappy' }).waitFor()
      await page.screenshot({ path: path.join(prints, `${tipo}-abertura-8-zappy.png`) })
      // Segurar Espaço pula.
      await page.keyboard.down('Space')
      await page.waitForTimeout(SEGURAR_PARA_PULAR_MS + 400)
      await page.keyboard.up('Space')
    } else {
      // No toque: segurar o botão pula.
      const pular = page.getByRole('button', { name: 'Pular a abertura (segure)' })
      const r = await pular.boundingBox()
      if (!r) throw new Error('Sem o botão de pular')
      await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2)
      await page.mouse.down()
      await page.waitForTimeout(SEGURAR_PARA_PULAR_MS + 400)
      await page.mouse.up()
    }
    await abertura.waitFor({ state: 'detached' })
    await page.locator('.arq-dica').filter({ hasText: 'Só o seu quarto ainda tem cor' }).waitFor()
    await page.locator('.arq-quem').waitFor()
    relatorio.push(`${tipo}: abertura passou e pulou; o Zappy falou depois`)
    await page.waitForTimeout(1600)
    await page.screenshot({ path: path.join(prints, `${tipo}-hud-quarto.png`) })
    const dentro = await semSobreposicao(page, tipo, PARTES)
    relatorio.push(`${tipo}: no quarto, sem sobreposição entre ${dentro.join(', ')}`)
    const textoDoHud = await page.locator('.arq-hud').innerText()
    for (const esperado of ['Agora', 'Abrir a porta nova do quarto', 'Sua ilha'])
      if (!celular || esperado !== 'Sua ilha')
        if (!textoDoHud.toLowerCase().includes(esperado.toLowerCase()))
          throw new Error(`${tipo}: sem "${esperado}" no HUD`)
    await page.locator('.arq-moedas').waitFor()

    // ── 2. O menu ───────────────────────────────────────────────────────────────────────────
    if (celular) await page.getByRole('button', { name: 'Abrir o menu' }).tap()
    else await page.keyboard.press('Escape')
    const menu = page.getByRole('dialog', { name: 'Menu do jogo' })
    await menu.waitFor()
    await menu.getByRole('button', { name: 'Continuar jogando' }).waitFor()
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(prints, `${tipo}-menu.png`) })
    await menu.getByRole('button', { name: 'Conforto e controles' }).click()
    await menu.getByText('Itens da mochila: 1 a 5').waitFor()
    await page.screenshot({ path: path.join(prints, `${tipo}-menu-conforto.png`) })
    // O diário pelo menu, e dele a abertura de novo.
    await menu.getByRole('button', { name: 'Diário', exact: true }).click()
    const diario = page.getByRole('dialog', { name: 'Diário' })
    await diario.waitFor()
    await diario.getByRole('button', { name: 'Rever a abertura: O Cinza' }).click()
    await abertura.waitFor()
    await page.keyboard.press('Escape')
    await abertura.waitFor({ state: 'detached' })
    relatorio.push(`${tipo}: menu, conforto, diário e rever a abertura`)
    await page.close()

    // ── 3. Lá fora, perto da horta (sem a abertura) ─────────────────────────────────────────
    const canteiro = posicaoDoCanteiro(0)
    const fora = await abrir(
      await novoContexto(),
      `${baseURL}/?novo=1&persistir=0&posicao=3&patins=1&em=${canteiro.x - 1.3},${canteiro.z},${ALTURA_DA_TERRA + 1.2}`,
    )
    await esperar(fora.page, (d) => d.noChao, undefined, 180_000).catch(async (e) => {
      await fora.page.screenshot({ path: path.join(prints, `${tipo}-falha-fora.png`) })
      throw e
    })
    await fora.page.locator('.arq-quem').waitFor()
    if ((await fora.page.locator('.arq-abertura').count()) !== 0)
      throw new Error(`${tipo}: a abertura voltou sem ser a primeira vez`)
    await fora.page.waitForTimeout(2500)
    await fora.page.screenshot({ path: path.join(prints, `${tipo}-hud-fora.png`) })
    const partesFora = await semSobreposicao(fora.page, tipo, PARTES)
    relatorio.push(`${tipo}: lá fora, sem sobreposição entre ${partesFora.join(', ')}`)
    if (!celular) {
      // A tecla 1 faz o que o primeiro lugar com número faz (se houver um).
      const primeiro = fora.page.locator('.arq-inventario button[aria-keyshortcuts="1"]')
      if ((await primeiro.count()) === 0) throw new Error(`${tipo}: sem atalho 1 na mochila`)
      {
        const nome = await primeiro.getAttribute('aria-label')
        await fora.page.locator('canvas').click()
        await fora.page.keyboard.press('Digit1')
        await fora.page.locator('.arq-dica').filter({ hasText: 'patins' }).waitFor()
        relatorio.push(`${tipo}: a tecla 1 usou "${nome}"`)
      }
    }
    await fora.page.close()
    // De noite (a noite chega aos 12 min): o relógio com a lua.
    const noite = await abrir(
      await novoContexto(),
      `${baseURL}/?novo=1&persistir=0&posicao=3&adiantar=13&em=${canteiro.x - 1.3},${canteiro.z},${ALTURA_DA_TERRA + 1.2}`,
    )
    await esperar(noite.page, (d) => d.noChao, undefined, 180_000)
    await noite.page.locator('.arq-quem').waitFor()
    await noite.page.waitForTimeout(2500)
    await noite.page.screenshot({ path: path.join(prints, `${tipo}-hud-noite.png`) })
    await noite.page.close()

    // ── 4. A corrida: os saltos entre nuvens ────────────────────────────────────────────────
    const largada = mundo(LARGADA_DOS_SALTOS)
    const n = await abrir(
      await novoContexto(),
      `${baseURL}/?novo=1&persistir=0&posicao=7&em=${largada.x},${largada.z},${largada.y + 1.2}`,
    )
    await esperar(n.page, (d) => d.ilhasCompletas > 0, undefined, 180_000)
    await n.page.locator('canvas').click()
    const degrau = mundo({ x: -14.1, y: 3.13, z: -2.9 })
    await dePe(n.page, largada, rumo(largada, degrau))
    await n.page
      .locator('.arq-acao')
      .filter({ hasText: 'Começar os saltos entre nuvens' })
      .waitFor()
    if (celular) await n.page.getByRole('button', { name: 'Usar', exact: true }).tap()
    else await n.page.keyboard.press('KeyE')
    await n.page.getByRole('timer', { name: 'Saltos entre nuvens' }).waitFor()
    await esperar(n.page, (d) => d.corrida?.percurso === 'nuvens-saltos')
    await n.page.waitForTimeout(800)
    for (const escondido of ['.arq-agora', '.arq-ilha-agora', '.arq-inventario', '.arq-cantinho'])
      if (await n.page.locator(escondido).isVisible())
        throw new Error(`${tipo}: ${escondido} aparece na corrida`)
    await n.page.screenshot({ path: path.join(prints, `${tipo}-hud-corrida.png`) })
    const partesCorrida = await semSobreposicao(n.page, tipo, PARTES)
    relatorio.push(`${tipo}: na corrida, só ${partesCorrida.join(', ')}`)
    await n.page.close()

    const todosErros = [...erros, ...fora.erros, ...n.erros]
    if (todosErros.length) throw new Error(`${tipo}: erros na página: ${todosErros.join(' | ')}`)
    for (const c of contextos) await c.close()
  }
  writeFileSync(path.join(prints, 'relatorio.txt'), `${relatorio.join('\n')}\n`)
  console.log(relatorio.join('\n'))
} finally {
  await browser?.close()
  server.kill()
}
