/**
 * As telas do manual do jogo (01/11/2026, pedido da dona: "um manual completo, com as telas reais
 * do jogo"). Executar no pacote:
 * bun playground/pontos-do-manual.ts .cache/pontos-do-manual.json && bun build playground/capturar-manual.ts --target=node --external playwright-core --outfile .cache/capturar-manual.mjs
 * node .cache/capturar-manual.mjs
 * ARQUIPELAGO_PRINTS escolhe a pasta (padrão `.cache/manual`); ARQUIPELAGO_SO roda só as tomadas
 * listadas (ids separados por vírgula).
 *
 * Duas espécies de tomada: as vistas do mundo (câmera parada pelo `__arquipelagoPalco`, sem a HUD) e
 * as telas de jogar (a HUD, o menu, as conversas), com a criança levada até o lugar. Todas com a
 * jornada inteira aberta e todas as ilhas coloridas (`quadros=todos`).
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'
import type { CenaDePrint } from '../src/mundo/palco-de-print'

type V3 = [number, number, number]
interface Ilha {
  centro: V3
  giro: number
  ancoras: Record<string, V3>
}
const PONTOS = JSON.parse(
  readFileSync(path.resolve('.cache/pontos-do-manual.json'), 'utf8'),
) as Record<string, Ilha>
const ESCONDER = ['avatar-visual', 'zappy-3d']
const BASE = 'novo=1&persistir=0&posicao=8&quadros=todos&dicas=0'

interface Tomada {
  id: string
  url: string
  /** Vista do mundo, sem HUD. */
  palco?: CenaDePrint
  /** Tela de jogar: o que fazer depois de o jogo abrir (a HUD fica). */
  jogar?: (page: Page) => Promise<void>
  espera?: number
}

const levar = (page: Page, p: V3, giro: number) =>
  page.evaluate(
    ({ p, giro }) =>
      (globalThis as { __arquipelagoLevar?: (...a: number[]) => void }).__arquipelagoLevar?.(
        p[0],
        p[1],
        p[2],
        giro,
      ),
    { p, giro },
  )
/** O giro da câmera que olha na direção de `de` para `para`. */
const olhando = (de: V3, para: V3) => Math.atan2(para[0] - de[0], para[2] - de[2]) + Math.PI
const passo = (a: V3, b: V3, d: number): V3 => {
  const dx = b[0] - a[0]
  const dz = b[2] - a[2]
  const l = Math.hypot(dx, dz) || 1
  return [a[0] + (dx / l) * d, a[1], a[2] + (dz / l) * d]
}
const ler = (page: Page) =>
  page.evaluate(
    () =>
      (globalThis as { __arquipelagoDesenho?: { ilhasCompletas: number } }).__arquipelagoDesenho,
  )

/** A vista de uma ilha do anel: de três quartos, do lado da ponte, um pouco de cima. */
function vistaDaIlha(id: string, distancia = 40, altura = 24, lado = 0.55): CenaDePrint {
  const { centro, ancoras } = PONTOS[id] as Ilha
  const ch = ancoras.chegada as V3
  const dx = ch[0] - centro[0]
  const dz = ch[2] - centro[2]
  const l = Math.hypot(dx, dz)
  const ux = dx / l
  const uz = dz / l
  // Gira o rumo da chegada um pouco para o lado, para a ilha aparecer de três quartos.
  const rx = ux * Math.cos(lado) - uz * Math.sin(lado)
  const rz = ux * Math.sin(lado) + uz * Math.cos(lado)
  return {
    posicao: [centro[0] + rx * distancia, centro[1] + altura, centro[2] + rz * distancia],
    alvo: [centro[0], centro[1] + 3, centro[2]],
    campo: 50,
    esconder: ESCONDER,
  }
}
const naIlha = (id: string) => {
  const ch = (PONTOS[id] as Ilha).ancoras.chegada as V3
  return `${ch[0]},${ch[2]},${ch[1] + 1}`
}

async function abrirMenu(page: Page, lugar?: string) {
  await page.getByRole('button', { name: 'Abrir o menu', exact: true }).click()
  const menu = page.getByRole('dialog', { name: 'Menu do jogo', exact: true })
  await menu.waitFor()
  if (lugar)
    await menu
      .getByRole('navigation', { name: 'Lugares do menu' })
      .getByRole('button', { name: lugar, exact: true })
      .click()
  await page.waitForTimeout(1200)
}

/**
 * Leva a criança para a frente do morador da ilha e abre a conversa (E). `onde` é a âncora em que o
 * morador fica (o Floco fica no alto do palco), `de` a âncora do lado de onde a criança chega.
 */
function conversa(id: string, onde = 'morador', de = 'chegada', distancia = 1.9) {
  return async (page: Page) => {
    const { ancoras } = PONTOS[id] as Ilha
    const m = ancoras[onde] as V3
    const lugar = passo(m, ancoras[de] as V3, distancia)
    await esperarIlha(page)
    await levar(page, [lugar[0], lugar[1] + 1, lugar[2]], olhando(lugar, m))
    await page.waitForTimeout(2500)
    await page
      .locator('canvas')
      .first()
      .click({ position: { x: 640, y: 300 } })
    await page.keyboard.press('KeyE')
    await page.waitForTimeout(3500)
  }
}
async function esperarIlha(page: Page) {
  const ate = Date.now() + 120_000
  while (Date.now() < ate) {
    const d = await ler(page)
    if (d && d.ilhasCompletas >= 1) break
    await page.waitForTimeout(500)
  }
  await page.waitForTimeout(3000)
}

const CASA: V3 = [2, 2, 12]
export const TOMADAS: Tomada[] = [
  // ── vistas do mundo ────────────────────────────────────────────────────────────────────────────
  {
    id: 'arquipelago',
    url: `${BASE}&adiantar=3&em=6,18`,
    palco: {
      posicao: [28, 62, 104],
      alvo: [0, 0, 4],
      campo: 52,
      esconder: ESCONDER,
      semNevoa: true,
    },
    espera: 25_000,
  },
  {
    id: 'sua-ilha',
    url: `${BASE}&adiantar=3&em=6,18`,
    palco: { posicao: [26, 20, 40], alvo: [-2, 1, 4], campo: 55, esconder: ESCONDER },
    espera: 20_000,
  },
  ...(['bosque', 'vila-doce', 'recife', 'pico', 'vale-dos-dinos', 'nuvens'] as const).map((id) => ({
    id: `ilha-${id}`,
    url: `${BASE}&adiantar=3&em=${naIlha(id)}`,
    palco: vistaDaIlha(
      id,
      id === 'recife' ? 46 : 40,
      id === 'pico' || id === 'vale-dos-dinos' ? 26 : 22,
    ),
    espera: 30_000,
  })),
  // ── telas de jogar ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'hud',
    url: `${BASE}&adiantar=2&em=${CASA[0]},${CASA[2]}`,
    jogar: async (page) => {
      await levar(page, CASA, Math.PI * 0.85)
      await page.waitForTimeout(6000)
    },
  },
  ...(
    [
      ['menu', undefined],
      ['menu-diario', 'Diário'],
      ['menu-album', 'Álbum de coleções'],
      ['menu-caderno', 'Caderno dos Lumis'],
      ['menu-mapa', 'Mapa do arquipélago'],
    ] as const
  ).map(([id, lugar]) => ({
    id,
    url: `${BASE}&adiantar=2&em=${CASA[0]},${CASA[2]}&lumis=quindim:2,pitanga:1,bolha:1&bichos=achados`,
    jogar: async (page: Page) => {
      await page.waitForTimeout(4000)
      await abrirMenu(page, lugar)
    },
  })),
  {
    // O cavalete do Quadro das Cores da sua ilha, na grama ao lado da trilha do píer.
    id: 'quadro-sua-ilha',
    url: `${BASE}&adiantar=2&em=1,18.5`,
    jogar: async (page) => {
      const lugar: V3 = [0.6, 2, 18.6]
      await levar(page, lugar, olhando(lugar, [-1.5, 1, 18.5]))
      await page.waitForTimeout(4000)
      await page
        .locator('canvas')
        .first()
        .click({ position: { x: 640, y: 300 } })
      await page.keyboard.press('KeyE')
      await page.waitForTimeout(3000)
    },
  },
  {
    id: 'construir',
    url: `${BASE}&adiantar=2&obra=exemplo&em=${CASA[0]},${CASA[2]}`,
    jogar: async (page) => {
      await page.waitForTimeout(4000)
      await page.getByRole('button', { name: 'Construir', exact: true }).first().click()
      await page.waitForTimeout(5000)
    },
  },
  ...(
    [
      ['conversa-capi', 'bosque'],
      ['conversa-bento', 'vila-doce'],
      ['conversa-mare', 'recife'],
      ['conversa-floco', 'pico'],
      ['conversa-jade', 'vale-dos-dinos'],
      ['conversa-irie', 'nuvens'],
    ] as const
  ).map(([id, ilha]) => ({
    id,
    url: `${BASE}&adiantar=3&em=${naIlha(ilha)}`,
    jogar:
      ilha === 'pico'
        ? conversa(ilha, 'palco', 'chegada', 1.8)
        : ilha === 'vila-doce'
          ? conversa(ilha, 'morador', 'fonte', 1.8)
          : ilha === 'recife'
            ? conversa(ilha, 'morador', 'lagoa', 1.5)
            : conversa(ilha),
  })),
  {
    id: 'noite-vila',
    url: `${BASE}&adiantar=12&lanterna=1&em=${naIlha('vila-doce')}`,
    jogar: async (page) => {
      await esperarIlha(page)
      const { ancoras } = PONTOS['vila-doce'] as Ilha
      const f = ancoras.fonte as V3
      const lugar = passo(f, ancoras.chegada as V3, 6)
      await levar(page, [lugar[0], 2, lugar[2]], olhando(lugar, f))
      await page.waitForTimeout(6000)
    },
  },
]

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
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/manual')
mkdirSync(prints, { recursive: true })
const so = (process.env.ARQUIPELAGO_SO ?? '').split(',').filter(Boolean)
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
try {
  const prazo = Date.now() + 60_000
  while (true) {
    if (server.exitCode !== null) throw new Error('Playground encerrou')
    try {
      if (servidorPronto && (await fetch(baseURL)).ok) break
    } catch {}
    if (Date.now() > prazo) throw new Error('Playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  for (const t of TOMADAS.filter((t) => !so.length || so.includes(t.id))) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    context.setDefaultTimeout(180_000)
    await context.addInitScript(() => {
      localStorage.setItem('arquipelago:medir', '1')
      localStorage.setItem('arquipelago:camera-dica', '1')
      localStorage.setItem('arquipelago:conforto', JSON.stringify({ qualidade: 'completa' }))
    })
    const page = await context.newPage()
    page.on('pageerror', (e) => console.error(t.id, 'pageerror', e.message))
    try {
      await page.goto(`${baseURL}/?${t.url}`, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(
        () =>
          typeof (globalThis as { __arquipelagoLevar?: unknown }).__arquipelagoLevar === 'function',
      )
      // As cenas de chegada das pontes seguram os comandos num jogo novo: pula todas.
      const pular = page.locator('.arq-chegada-pular')
      for (let i = 0; i < 12; i++) {
        try {
          await pular.waitFor({ state: 'visible', timeout: 3000 })
        } catch {
          break
        }
        await pular.click()
        await pular.waitFor({ state: 'detached', timeout: 15_000 }).catch(() => {})
      }
      if (t.palco) {
        await page.evaluate(
          (c) =>
            (globalThis as { __arquipelagoPalco?: (c: CenaDePrint) => void }).__arquipelagoPalco?.(
              c,
            ),
          t.palco,
        )
        await page.addStyleTag({
          content: 'body *{visibility:hidden!important} canvas{visibility:visible!important}',
        })
        await page.waitForTimeout(t.espera ?? 15_000)
        await page
          .locator('canvas')
          .first()
          .screenshot({
            path: path.join(prints, `${t.id}.jpg`),
            type: 'jpeg',
            quality: 84,
          })
      } else {
        await t.jogar?.(page)
        await page.screenshot({ path: path.join(prints, `${t.id}.jpg`), type: 'jpeg', quality: 84 })
      }
      console.log('ok', t.id)
    } catch (e) {
      console.error('falhou', t.id, (e as Error).message.split('\n')[0])
      await page
        .screenshot({ path: path.join(prints, `falha-${t.id}.jpg`), type: 'jpeg' })
        .catch(() => {})
    }
    await context.close()
  }
} finally {
  await browser?.close()
  server.kill()
}
