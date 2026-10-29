/**
 * A aventura das Nuvens no playground (fase4-07): os saltos entre nuvens, a corrida de balão e as
 * constelações. Executar no pacote:
 * bun build playground/verificar-nuvens-aventura-browser.ts --target=node --external playwright-core --outfile .cache/verificar-nuvens-aventura-browser.mjs
 * node .cache/verificar-nuvens-aventura-browser.mjs
 * ARQUIPELAGO_CHROMIUM escolhe o navegador; ARQUIPELAGO_PRINTS a pasta dos prints;
 * ARQUIPELAGO_TELA (computador ou celular) roda uma tela só.
 *
 * Os saltos vão de parada em parada pelo transporte de conferência (os pulos de verdade entre as
 * plataformas são do `verificar-nuvens-browser.ts`): aqui se confere a corrida em volta deles.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { type Browser, type BrowserContext, chromium, type Page } from 'playwright-core'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'
import { LARGADA_DOS_SALTOS } from '../src/mundo/saltos-das-nuvens'
import { FALA_DE_DIA, FIGURAS } from '../src/sistemas/constelacoes'
import { CORPO } from '../src/sistemas/corpo'
import { ARGOLAS, argolasNaIlha } from '../src/sistemas/corrida-de-balao'

type P = { x: number; y: number; z: number }
type Desenho = {
  posicao: P
  ilhasCompletas: number
  modo: string
  noChao: boolean
  plataformasDasNuvens: { numero: number; topoY: number; x: number; z: number }[]
  balao: { fase: string; pousado: boolean; pe: P } | null
  corrida: { percurso: string | null; deque: number; situacao: string } | null
  mira: { naMira: number; posicao: P } | null
  constelacoes: number
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
  process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-29-nuvens-aventura')
mkdirSync(prints, { recursive: true })
const achada = ilhasEmVolta().find((i) => i.ilha.id === 'nuvens')
if (!achada) throw new Error('Nuvens fora do anel')
const nuvens = achada
const giro = giroDaIlha(nuvens.ilha)
const carregar = async (arquivo: string) => {
  const bytes = readFileSync(arquivo)
  return (
    await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      '',
    )
  ).scene
}
const modelo = await carregar('src/assets/ilhas/nuvens.glb')
const mirante = await carregar('src/assets/ilhas/nuvens-constelacoes.glb')
mirante.updateMatrixWorld(true)
const local = (nome: string, de = modelo) => {
  const no = de.getObjectByName(nome)
  if (!no) throw new Error(`Sem o nó ${nome}`)
  return no.getWorldPosition(no.position.clone())
}
const mundo = (p: P): P => ({
  x: nuvens.centro.x + p.x * Math.cos(giro) + p.z * Math.sin(giro),
  y: p.y + 7,
  z: nuvens.centro.z - p.x * Math.sin(giro) + p.z * Math.cos(giro),
})
const rumo = (a: P, b: P) => Math.atan2(b.x - a.x, b.z - a.z)
const PE = CORPO.doCentroAoPe + CORPO.folga
const argolas = argolasNaIlha(1).map((g) => ({ ...mundo(g), rumo: g.rumo + giro }))

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
let prazo: ReturnType<typeof setTimeout> | undefined

const ler = (page: Page) =>
  page.evaluate(() => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho)
/** Espera a medida do desenho cumprir `fn` (escrita aqui, sem nada de fora: vai como texto). */
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
/** Leva e espera os pés no ponto (o transporte larga o corpo 1,2 m acima). */
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

async function abrir(context: BrowserContext, celular: boolean, url: string) {
  const page = await context.newPage()
  const erros: string[] = []
  page.on('pageerror', (e) => {
    erros.push(e.message)
    console.error('pageerror', e.message)
  })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await esperar(page, (d) => d.ilhasCompletas > 0 && d.balao !== null, undefined, 180_000)
  await page.locator('canvas').click()
  const usar = async () => {
    if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
    else await page.keyboard.press('KeyE')
  }
  return { page, erros, usar }
}

/** As partes 1 e 2, de dia: os saltos entre nuvens, o aviso da luneta e a corrida de balão. */
async function diaNasNuvens(context: BrowserContext, celular: boolean, tipo: string, luneta: P) {
  // ── 1. Os saltos entre nuvens (de dia) ───────────────────────────────────────────────────
  const largada = mundo(LARGADA_DOS_SALTOS)
  const dia = await abrir(
    context,
    celular,
    `${baseURL}/?novo=1&persistir=0&posicao=7&em=${largada.x},${largada.z},${largada.y + 1.2}`,
  )
  const { page } = dia
  const degrau = mundo({ x: -14.1, y: 3.13, z: -2.9 })
  await dePe(page, largada, rumo(largada, degrau))
  await page.locator('.arq-acao').filter({ hasText: 'Começar os saltos entre nuvens' }).waitFor()
  await dia.usar()
  await page.getByRole('timer', { name: 'Saltos entre nuvens' }).waitFor()
  await esperar(page, (d) => d.corrida?.percurso === 'nuvens-saltos')
  console.log(`${tipo}: saltos começaram`)
  // O terceiro degrau fica embaixo da beira da plataforma 1: daqui vai direto para ela.
  /** Leva para o tampo de uma plataforma onde ele estiver agora e espera a parada contar. */
  const naPlataforma = async (n: number, deque: number) => {
    const d = await ler(page)
    const p = d?.plataformasDasNuvens.find((q) => q.numero === n)
    if (!p) throw new Error(`Sem a plataforma ${n}`)
    await levar(page, { x: p.x, y: p.topoY + 0.3, z: p.z }, 0)
    await esperar(page, (m, a) => m.corrida !== null && m.corrida.deque >= (a as number), deque)
  }
  await naPlataforma(1, 1)
  await naPlataforma(2, 2)
  // Uma queda no chão da ilha volta, pelo corte, para a plataforma 2 (onde ela estiver).
  const chao = mundo({ x: -12, y: 1, z: 4 })
  await levar(page, chao, 0)
  await esperar(
    page,
    (m, a) => {
      const p = m.plataformasDasNuvens.find((q) => q.numero === 2)
      const r = a as { pe: number }
      return (
        !!p &&
        m.noChao &&
        m.corrida?.deque === 2 &&
        Math.hypot(m.posicao.x - p.x, m.posicao.z - p.z) < 1.4 &&
        Math.abs(m.posicao.y - r.pe - p.topoY) < 0.2
      )
    },
    { pe: PE },
  )
  console.log(`${tipo}: caiu e voltou para a plataforma 2`)
  await naPlataforma(3, 3)
  await page.screenshot({ scale: 'css', path: path.join(prints, `saltos-${tipo}-alto.png`) })
  // A chegada: o tampo da plataforma 4.
  const d4 = (await ler(page))?.plataformasDasNuvens.find((q) => q.numero === 4)
  if (!d4) throw new Error('Sem a plataforma 4')
  await levar(page, { x: d4.x, y: d4.topoY + 0.3, z: d4.z }, 0)
  const resultado = page.getByRole('dialog', { name: 'Saltos entre nuvens' })
  await resultado.waitFor()
  await resultado.getByText('As 3 fitas do arco-íris').waitFor()
  if ((await resultado.getByText('Recordes da família').count()) > 0)
    throw new Error('Os saltos ainda não são gravados: sem recordes da família')
  await page.screenshot({ scale: 'css', path: path.join(prints, `saltos-${tipo}-resultado.png`) })
  await resultado.getByRole('button', { name: 'Continuar' }).click()
  console.log(`${tipo}: saltos chegaram, resultado sem gravar`)

  // De dia, a luneta do mirante diz que as estrelas só aparecem à noite.
  await dePe(page, luneta, rumo(luneta, mundo(local('luneta-tubo', mirante))))
  await page.locator('.arq-acao').filter({ hasText: 'Olhar pela luneta' }).waitFor()
  if (!celular) await page.locator('canvas').click()
  await dia.usar()
  await page.getByText(FALA_DE_DIA).first().waitFor()
  if ((await page.getByLabel('Vista pela luneta do mirante').count()) > 0)
    throw new Error('De dia a vista não abre')
  console.log(`${tipo}: de dia a luneta avisa`)

  // ── 2. A corrida de balão: começa na argola vermelha, passa a laranja e para ─────────────
  const casa = mundo(local('balao'))
  const meio = { x: nuvens.centro.x, y: casa.y, z: nuvens.centro.z }
  const m = Math.hypot(meio.x - casa.x, meio.z - casa.z)
  const encosto = {
    x: casa.x + ((meio.x - casa.x) / m) * 1.2,
    y: casa.y,
    z: casa.z + ((meio.z - casa.z) / m) * 1.2,
  }
  await dePe(page, encosto, rumo(encosto, casa))
  await page.locator('.arq-acao').filter({ hasText: 'Subir no balão' }).waitFor()
  await dia.usar()
  await esperar(page, (d) => d.modo === 'balao' && d.balao?.fase === 'voo')
  /** Pilota até o ponto (meio do balão), como uma criança: acende e solta o fogo, freia chegando. */
  const pilotar = (alvo: P) =>
    page.evaluate(
      async ({ alvo, meioDoBalao, pe }) => {
        const g = globalThis as unknown as {
          __arquipelagoLerCorpo: () => P & { giro: number }
          qaPad: { axes: number[]; buttons: { pressed: boolean }[] }
          qaStep?: () => void
        }
        let antes: (P & { t: number }) | null = null
        let concluiu = false
        let falha: Error | undefined
        const fim = performance.now() + 120_000
        const passo = () => {
          const c = g.__arquipelagoLerCorpo()
          const agora = performance.now()
          const meio = { x: c.x, y: c.y - pe + meioDoBalao, z: c.z }
          const v = antes
            ? {
                x: (meio.x - antes.x) / Math.max(0.001, (agora - antes.t) / 1000),
                y: (meio.y - antes.y) / Math.max(0.001, (agora - antes.t) / 1000),
                z: (meio.z - antes.z) / Math.max(0.001, (agora - antes.t) / 1000),
              }
            : { x: 0, y: 0, z: 0 }
          antes = { ...meio, t: agora }
          const dx = alvo.x - meio.x
          const dz = alvo.z - meio.z
          const dist = Math.hypot(dx, dz)
          if (dist < 1 && Math.abs(alvo.y - meio.y) < 1.2) {
            concluiu = true
            return
          }
          if (agora > fim) throw new Error(`O balão não chegou: ${JSON.stringify({ alvo, meio })}`)
          const qx = (dx / Math.max(dist, 0.001)) * Math.min(3, dist) - v.x
          const qz = (dz / Math.max(dist, 0.001)) * Math.min(3, dist) - v.z
          const q = Math.max(1, Math.hypot(qx, qz))
          const x = qx / q
          const z = qz / q
          g.qaPad.axes[0] = x * Math.cos(c.giro) - z * Math.sin(c.giro)
          g.qaPad.axes[1] = x * Math.sin(c.giro) + z * Math.cos(c.giro)
          g.qaPad.buttons[0]!.pressed = meio.y + Math.max(0, v.y) ** 2 / 3 < alvo.y
        }
        g.qaStep = () => {
          if (concluiu || falha) return
          try {
            passo()
          } catch (e) {
            falha = e instanceof Error ? e : new Error(String(e))
          }
        }
        try {
          while (!concluiu && !falha) await new Promise((r) => setTimeout(r, 16))
          if (falha) throw falha
        } finally {
          g.qaStep = undefined
          g.qaPad.axes[0] = g.qaPad.axes[1] = 0
          g.qaPad.buttons[0]!.pressed = false
        }
      },
      { alvo, meioDoBalao: ARGOLAS.meioDoBalao, pe: PE },
    )
  const antesE = (i: number, metros: number) => {
    const g = argolas[i]
    if (!g) throw new Error(`Sem a argola ${i}`)
    return { x: g.x + Math.sin(g.rumo) * metros, y: g.y, z: g.z + Math.cos(g.rumo) * metros }
  }
  // Primeiro sobe em cima do lugar do balão (os lampiões ficam perto do poste), depois vai.
  const primeira = argolas[0]
  if (!primeira) throw new Error('Sem a argola vermelha')
  await pilotar({ x: casa.x, y: primeira.y + 3, z: casa.z })
  await pilotar(antesE(0, -3))
  await pilotar(antesE(0, 3))
  await page.getByRole('timer', { name: 'Corrida de balão' }).waitFor()
  await esperar(page, (d) => d.corrida?.percurso === 'nuvens-balao' && d.corrida.deque === 0)
  console.log(`${tipo}: a argola vermelha começou a corrida`)
  await pilotar(antesE(1, -3))
  await pilotar(antesE(1, 3))
  await esperar(page, (d) => d.corrida?.deque === 1)
  await page.screenshot({ scale: 'css', path: path.join(prints, `balao-corrida-${tipo}.png`) })
  await page
    .getByRole('timer', { name: 'Corrida de balão' })
    .getByRole('button', { name: 'Parar' })
    .click()
  await esperar(page, (d) => d.corrida === null)
  if ((await page.getByRole('timer').count()) > 0) throw new Error('O cronômetro ficou na tela')
  console.log(`${tipo}: passou a argola laranja e parou`)
  // Volta para cima do chão da ilha (fora dele o ar segura o cesto), desce e sai do balão.
  await pilotar({ x: encosto.x, y: casa.y + ARGOLAS.meioDoBalao + 2, z: encosto.z })
  await esperar(page, (d) => !!d.balao?.pousado, undefined, 120_000)
  if (!celular) await page.locator('canvas').click()
  await dia.usar()
  await esperar(page, (d) => d.modo === 'chao')
  if (dia.erros.length) throw new Error(dia.erros.join('\n'))
  await page.close()
}

/** Um contexto novo do navegador para cada parte: o WebGL do dia não pesa na noite. */
async function novoContexto(navegador: Browser, celular: boolean): Promise<BrowserContext> {
  const context = await navegador.newContext({
    viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
    deviceScaleFactor: 0.5,
    reducedMotion: celular ? 'reduce' : 'no-preference',
    isMobile: celular,
    hasTouch: celular,
  })
  context.setDefaultTimeout(120_000)
  await context.addInitScript((celular) => {
    localStorage.setItem('arquipelago:medir', '1')
    localStorage.setItem(
      'arquipelago:conforto',
      JSON.stringify({ menosMovimento: celular, qualidade: 'leve' }),
    )
    const g = globalThis as unknown as {
      qaPad: { axes: number[]; buttons: { pressed: boolean }[] }
      qaStep?: () => void
    }
    g.qaPad = {
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 12 }, () => ({ pressed: false })),
    }
    Object.assign(g.qaPad, { connected: true, mapping: 'standard' })
    Object.defineProperty(navigator, 'getGamepads', {
      value: () => {
        g.qaStep?.()
        return [g.qaPad]
      },
    })
  }, celular)
  return context
}

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
  prazo = setTimeout(() => {
    void browser?.close()
    server.kill()
  }, 20 * 60_000)
  for (const celular of [false, true].filter(
    (c) =>
      !process.env.ARQUIPELAGO_TELA ||
      process.env.ARQUIPELAGO_TELA === (c ? 'celular' : 'computador'),
  )) {
    const tipo = celular ? 'celular' : 'computador'
    const contextoDoDia = await novoContexto(browser, celular)
    // ARQUIPELAGO_PARTE=noite roda só as constelações (para conferir uma parte sozinha).
    const soNoite = process.env.ARQUIPELAGO_PARTE === 'noite'
    const luneta = mundo(local('luneta', mirante))
    if (!soNoite) await diaNasNuvens(contextoDoDia, celular, tipo, luneta)
    await contextoDoDia.close()
    const context = await novoContexto(browser, celular)

    // ── 3. As constelações, de noite ──────────────────────────────────────────────────────────
    const noite = await abrir(
      context,
      celular,
      `${baseURL}/?novo=1&persistir=0&posicao=7&adiantar=12&em=${luneta.x},${luneta.z},${luneta.y + 1.2}`,
    )
    const pn = noite.page
    await dePe(pn, luneta, rumo(luneta, mundo(local('luneta-tubo', mirante))))
    await pn.locator('.arq-acao').filter({ hasText: 'Olhar pela luneta' }).waitFor()
    await noite.usar()
    const visor = pn.getByLabel('Vista pela luneta do mirante')
    await visor.waitFor()
    await visor.getByText('Constelações: 0 de 6').waitFor()
    // Mira a arara: o direcional gira e sobe a mira até o meio dela ficar no centro.
    const tubo = mundo(local('luneta-tubo', mirante))
    // A mira aponta para o centro das estrelas da arara (o pivô do nó fica fora do desenho).
    const filhas = mirante
      .getObjectByName('constelacao-1')
      ?.children.filter((c) => c.name.includes('-estrela-'))
    if (!filhas?.length) throw new Error('Sem as estrelas da arara')
    const soma = { x: 0, y: 0, z: 0 }
    for (const c of filhas) {
      const w = c.getWorldPosition(c.position.clone())
      soma.x += w.x / filhas.length
      soma.y += w.y / filhas.length
      soma.z += w.z / filhas.length
    }
    const arara = mundo(soma)
    const alvo = {
      giro: Math.atan2(arara.x - tubo.x, arara.z - tubo.z),
      inclinacao: Math.atan2(arara.y - tubo.y, Math.hypot(arara.x - tubo.x, arara.z - tubo.z)),
    }
    if (celular) {
      // No toque, os botões do visor: segurar "para cima" sobe a mira.
      const cima = visor.getByRole('button', { name: 'Mirar para cima' })
      const antes = (await ler(pn))?.mira?.posicao
      await cima.hover()
      await pn.mouse.down()
      await pn.waitForTimeout(500)
      await pn.mouse.up()
      const depois = (await ler(pn))?.mira?.posicao
      if (!antes || !depois || depois.y <= antes.y)
        throw new Error('O botão de mirar não subiu a mira')
    }
    await pn.evaluate(
      async ({ alvo, tubo, olhoAFrente }) => {
        const g = globalThis as unknown as {
          __arquipelagoDesenho: Desenho
          __arquipelagoLerCorpo: () => { olho: P | null }
          qaPad: { axes: number[]; buttons: { pressed: boolean }[] }
          qaStep?: () => void
        }
        const fim = performance.now() + 90_000
        let concluiu = false
        let falha: Error | undefined
        g.qaStep = () => {
          if (concluiu || falha) return
          if (g.__arquipelagoDesenho.constelacoes & 1) {
            concluiu = true
            g.qaPad.axes[0] = g.qaPad.axes[1] = 0
            return
          }
          if (performance.now() > fim) {
            falha = new Error(
              `A mira não achou a arara: ${JSON.stringify(g.__arquipelagoDesenho.mira)}`,
            )
            return
          }
          // O olho da vista fica à frente do tubo, na direção da mira.
          const olho = g.__arquipelagoLerCorpo().olho
          if (!olho) return
          const dx = (olho.x - tubo.x) / olhoAFrente
          const dy = (olho.y - tubo.y) / olhoAFrente
          const dz = (olho.z - tubo.z) / olhoAFrente
          let dg = alvo.giro - Math.atan2(dx, dz)
          dg = Math.atan2(Math.sin(dg), Math.cos(dg))
          const di = alvo.inclinacao - Math.asin(Math.max(-1, Math.min(1, dy)))
          // O direcional para a direita diminui o giro; para cima, sobe a mira.
          g.qaPad.axes[0] = Math.max(-1, Math.min(1, -dg * 2))
          g.qaPad.axes[1] = Math.max(-1, Math.min(1, -di * 2))
        }
        try {
          while (!concluiu && !falha) await new Promise((r) => setTimeout(r, 16))
          if (falha) throw falha
        } finally {
          g.qaStep = undefined
          g.qaPad.axes[0] = g.qaPad.axes[1] = 0
        }
      },
      { alvo, tubo, olhoAFrente: 1.6 },
    )
    await visor.getByText(FIGURAS[0].fala).waitFor()
    await visor.getByText('Constelações: 1 de 6').waitFor()
    await pn.waitForTimeout(1200)
    await pn.screenshot({ scale: 'css', path: path.join(prints, `estrelas-${tipo}-arara.png`) })
    await visor.getByRole('button', { name: 'Voltar' }).click()
    await visor.waitFor({ state: 'detached' })
    await esperar(pn, (d) => d.mira === null)
    await pn.screenshot({ scale: 'css', path: path.join(prints, `estrelas-${tipo}-ceu.png`) })
    console.log(`${tipo}: achou a constelação da arara e voltou`)
    if (celular && (await pn.evaluate(() => document.documentElement.scrollWidth > innerWidth)))
      throw new Error('A interface ultrapassa a largura do celular')
    if (noite.erros.length) throw new Error(noite.erros.join('\n'))
    writeFileSync(
      path.join(prints, `resultado-${tipo}.json`),
      JSON.stringify(
        { tipo, saltos: !soNoite, corridaDeBalao: !soNoite, constelacoes: 1 },
        null,
        2,
      ),
    )
    await context.close()
  }
  console.log('aventura das Nuvens aprovada')
} catch (erro) {
  for (const c of browser?.contexts() ?? [])
    for (const p of c.pages()) {
      console.error('Última medida', await ler(p).catch(() => null))
      await p.screenshot({ path: path.join(prints, 'falha.png') }).catch(() => {})
    }
  throw erro
} finally {
  clearTimeout(prazo)
  await browser?.close()
  server.kill()
}
