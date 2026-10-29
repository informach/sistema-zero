/**
 * As animações do avatar (os clipes do Mixamo, `arte/avatar/mixamo.py`) no jogo de verdade: um
 * print de cada uma, na cena em que ela aparece. Executar no pacote:
 * bun build playground/verificar-animacoes-browser.ts --target=node --external playwright-core --outfile .cache/verificar-animacoes-browser.mjs
 * node .cache/verificar-animacoes-browser.mjs
 * ARQUIPELAGO_CHROMIUM escolhe o navegador; ARQUIPELAGO_PRINTS, a pasta dos prints;
 * ARQUIPELAGO_CENAS=bosque,descanso,pico,vale roda só algumas cenas.
 *
 * No Bosque: parado, andar, correr, o pulo inteiro, nadar no lago, o cipó, o tronco de escalar, o
 * tronco caído, a escada, a borda (pendurada e subindo) e o escorregador. Em casa e na Vila: deitar
 * na cama e sentar no banco. No Pico, o planador; no Vale, a montaria. Para cada pose a câmera vai
 * para a frente do avatar, um pouco de lado (`__arquipelagoCameraEmVolta` do medidor).
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import {
  criarSalvamentoInicial,
  NINHOS_DO_VALE,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { chromium, type Page } from 'playwright-core'
import type { Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { ALTURA_DA_TERRA, CENTRO_DA_CASA, giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'
import { CORPO } from '../src/sistemas/corpo'
import { lugarNaCama, lugarNoBanco } from '../src/sistemas/descanso'
import { BORDA } from '../src/sistemas/modos/borda'
import { MONTARIA_NO_VALE } from '../src/sistemas/montaria'

type P = { x: number; y: number; z: number }
type Desenho = { posicao: P; ilhasCompletas: number; noChao: boolean; modo: string }
type Global = {
  __arquipelagoDesenho?: Desenho
  __arquipelagoLevar?: (...a: number[]) => void
  __arquipelagoCameraEmVolta?: (desvio: number) => void
  __arquipelagoMovimento?: () => {
    cipos: { id: string; pivo: P; pegada: number }[]
    troncos: { id: string; tronco: { base: P; topo: P; raioBase: number } }[]
    aguas: { id: string; x: number; z: number; y: number }[]
    equilibrios: { id: string; a: P; b: P }[]
    escadas: { id: string; base: P; topo: P; saida: P }[]
    escorregadores: { id: string; pontos: P[] }[]
    bordas: { id: string; a: P; b: P; fora: P }[]
    pedido: unknown
    modo: string
  }
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
  process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-29-animacoes-mixamo')
mkdirSync(prints, { recursive: true })
const cenas = (process.env.ARQUIPELAGO_CENAS ?? 'bosque,descanso,pico,vale').split(',')
const PE = CORPO.doCentroAoPe + CORPO.folga

/** Uma ilha do anel: as âncoras do GLB dela, no mundo. */
async function ilha(id: string, arquivo: string) {
  const anel = ilhasEmVolta().find((i) => i.ilha.id === id)
  if (!anel) throw new Error(`${id} fora do anel`)
  const giro = giroDaIlha(anel.ilha)
  const glb = readFileSync(path.resolve('src/assets/ilhas', arquivo))
  const modelo: Object3D = (
    await new GLTFLoader().parseAsync(
      glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength),
      '',
    )
  ).scene
  const mundo = (p: P): P => ({
    x: anel.centro.x + p.x * Math.cos(giro) + p.z * Math.sin(giro),
    y: p.y,
    z: anel.centro.z - p.x * Math.sin(giro) + p.z * Math.cos(giro),
  })
  const ancora = (nome: string): P => {
    const o = modelo.getObjectByName(nome)
    if (!o) throw new Error(`${arquivo} sem a âncora ${nome}`)
    return mundo(o.position)
  }
  return { anel, giro, modelo, mundo, ancora }
}

const rumo = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.atan2(b.x - a.x, b.z - a.z)

function salvar(onde: P, extra: Partial<Salvamento> = {}): string {
  const s = criarSalvamentoInicial(new Date())
  return JSON.stringify({
    revisao: 1,
    salvamento: { ...s, posicao: { x: onde.x, y: onde.y + 1.2, z: onde.z }, ...extra },
    atualizadoEm: new Date().toISOString(),
  })
}

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
const feitos: string[] = []
const faltaram: string[] = []

/** Uma cena: página nova (com o salvamento semeado, se houver) e as ferramentas de medir. */
async function abrir(url: string, guardado?: string) {
  if (!browser) throw new Error('sem navegador')
  // `ARQUIPELAGO_LEVE=1`: tela menor e a qualidade leve do jogo, para passar de 1 quadro por segundo
  // no SwiftShader (o pulo inteiro cabia num quadro só).
  const leve = process.env.ARQUIPELAGO_LEVE === '1'
  const context = await browser.newContext({
    viewport: leve ? { width: 800, height: 450 } : { width: 1280, height: 720 },
  })
  context.setDefaultTimeout(180_000)
  await context.addInitScript(
    ({ guardado, leve }) => {
      localStorage.setItem('arquipelago:medir', '1')
      if (leve)
        localStorage.setItem(
          'arquipelago:conforto',
          JSON.stringify({ menosMovimento: true, qualidade: 'leve' }),
        )
      if (guardado && !localStorage.getItem('qa-semeado')) {
        localStorage.setItem('qa-semeado', '1')
        localStorage.setItem('arquipelago-playground', guardado)
      }
    },
    { guardado: guardado ?? '', leve },
  )
  const page = await context.newPage()
  const erros: string[] = []
  page.on('pageerror', (e) => erros.push(e.message))
  await page.goto(`${baseURL}${url}`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => ((globalThis as Global).__arquipelagoDesenho?.ilhasCompletas ?? 0) > 0,
    undefined,
    { timeout: 240_000 },
  )
  await page.locator('canvas').click()
  // A câmera mais perto do avatar (a rodinha), para ver a pose.
  await page.mouse.move(leve ? 400 : 640, leve ? 225 : 360)
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, -400)
    await page.waitForTimeout(150)
  }
  return { page, context, erros }
}

const ler = (page: Page) =>
  page.evaluate(
    () => (globalThis as Global).__arquipelagoDesenho ?? null,
  ) as Promise<Desenho | null>
/** Leva o corpo (o centro `y` acima do chão `chao`) olhando para `olhar`, a câmera nas costas. */
const levar = (page: Page, p: { x: number; z: number }, y: number, olhar: number) =>
  page.evaluate(({ x, y, z, g }) => (globalThis as Global).__arquipelagoLevar?.(x, y, z, g), {
    x: p.x,
    y,
    z: p.z,
    g: olhar + Math.PI,
  })
/** Aperta e solta uma tecla devagar: a poucos quadros por segundo o jogo lê a cada quadro. */
async function apertar(page: Page, tecla: string) {
  await page.keyboard.down(tecla)
  await page.waitForTimeout(250)
  await page.keyboard.up(tecla)
}
const esperarModo = (page: Page, modo: string, ms = 60_000) =>
  page
    .waitForFunction((m) => (globalThis as Global).__arquipelagoDesenho?.modo === m, modo, {
      timeout: ms,
    })
    .then(() => true)
    .catch(() => false)

/** O print de uma animação: a câmera de frente, um pouco de lado, e uns quadros para assentar. */
async function foto(page: Page, nome: string, desvio = 0.75, assentar = 1500) {
  await page.evaluate((d) => (globalThis as Global).__arquipelagoCameraEmVolta?.(d), desvio)
  await page.waitForTimeout(assentar)
  await page.screenshot({ path: path.join(prints, `animacao-${nome}.png`) })
  feitos.push(nome)
  console.log(`print: ${nome}`, (await ler(page))?.modo)
}

/** `ARQUIPELAGO_SO=pulo,borda` tira só esses prints (o resto da cena fica de fora). */
const so = process.env.ARQUIPELAGO_SO?.split(',')

async function tentar(nome: string, f: () => Promise<void>) {
  if (so && !so.includes(nome)) return
  try {
    await f()
  } catch (e) {
    faltaram.push(`${nome}: ${(e as Error).message.split('\n')[0]}`)
    console.log(`faltou ${nome}:`, (e as Error).message.split('\n')[0])
  }
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

  // ── O Bosque: o chão, o pulo, a água e os modos do movimento ──────────────────────────────────
  if (cenas.includes('bosque')) {
    const bosque = await ilha('bosque', 'bosque.glb')
    const chegada = bosque.ancora('chegada')
    const em = `${chegada.x.toFixed(2)},${chegada.z.toFixed(2)},${(chegada.y + 1.2).toFixed(2)}`
    const { page, context, erros } = await abrir(`/?novo=1&persistir=0&posicao=8&em=${em}`)
    const mov = () =>
      page.evaluate(() => {
        const m = (globalThis as Global).__arquipelagoMovimento?.()
        if (!m) return null
        return JSON.parse(
          JSON.stringify({
            cipos: m.cipos.map((c) => ({ id: c.id, pivo: c.pivo, pegada: c.pegada })),
            troncos: m.troncos,
            aguas: m.aguas,
            equilibrios: m.equilibrios,
            escadas: m.escadas,
            escorregadores: m.escorregadores.map((e) => ({ id: e.id, pontos: e.pontos })),
            bordas: m.bordas,
          }),
        ) as Omit<ReturnType<NonNullable<Global['__arquipelagoMovimento']>>, 'pedido' | 'modo'>
      })
    await page.waitForFunction(
      () => ((globalThis as Global).__arquipelagoMovimento?.().cipos.length ?? 0) > 0,
    )
    const m = await mov()
    if (!m) throw new Error('sem o movimento do Bosque')
    console.log(
      'Bosque:',
      Object.entries(m)
        .map(([k, v]) => `${k} ${(v as unknown[]).length}`)
        .join(', '),
    )
    const voltar = async () => {
      await levar(page, chegada, chegada.y + 1.2, 0)
      await page.waitForFunction(
        ({ x, z }) => {
          const d = (globalThis as Global).__arquipelagoDesenho
          return (
            d?.modo === 'chao' && d.noChao && Math.hypot(d.posicao.x - x, d.posicao.z - z) < 1.5
          )
        },
        { x: chegada.x, z: chegada.z },
      )
    }

    await tentar('parado', async () => {
      await page.waitForTimeout(3000)
      await foto(page, 'parado')
    })
    // Andando para o lado da câmera (o D anda para a direita dela): o avatar passa de perfil.
    const deLado = async (nome: string, correr = false) => {
      await page.keyboard.down('KeyD')
      if (correr) await page.keyboard.down('ShiftLeft')
      await page.waitForTimeout(2500)
      await page.screenshot({ path: path.join(prints, `animacao-${nome}.png`) })
      feitos.push(nome)
      console.log(`print: ${nome}`, (await ler(page))?.modo)
      if (correr) await page.keyboard.up('ShiftLeft')
      await page.keyboard.up('KeyD')
    }
    await tentar('andar', async () => {
      await page.evaluate(() => (globalThis as Global).__arquipelagoCameraEmVolta?.(Math.PI))
      await deLado('andar')
      await voltar()
      await page.evaluate(() => (globalThis as Global).__arquipelagoCameraEmVolta?.(Math.PI))
      await deLado('correr', true)
    })
    await tentar('nado', async () => {
      // No mar, ao lado da ponte: da chegada, um pouco para fora da ilha e girado.
      const c = bosque.anel.centro
      const r = Math.hypot(chegada.x - c.x, chegada.z - c.z) + 3.5
      const a = Math.atan2(chegada.x - c.x, chegada.z - c.z) + 0.45
      const mar = { x: c.x + Math.sin(a) * r, z: c.z + Math.cos(a) * r }
      await levar(page, mar, 1.5, a)
      await page.waitForFunction(
        () => (globalThis as Global).__arquipelagoDesenho?.noChao === false,
      )
      await page.waitForTimeout(4000)
      await foto(page, 'nado-parado', 0.75, 500)
      await page.evaluate(() => (globalThis as Global).__arquipelagoCameraEmVolta?.(Math.PI))
      await deLado('nado')
      await voltar()
    })
    await tentar('cipo', async () => {
      // O segundo cipó fica longe do tronco grosso, que tapava a vista do primeiro.
      const cipo = m.cipos[1] ?? m.cipos[0]
      if (!cipo) throw new Error('sem cipó')
      const embaixo = cipo.pivo.y - cipo.pegada
      await levar(page, cipo.pivo, embaixo, 0)
      await page.waitForTimeout(800)
      await page.evaluate((id) => {
        const mv = (globalThis as Global).__arquipelagoMovimento?.()
        if (mv) mv.pedido = { tipo: 'cipo', id }
      }, cipo.id)
      if (!(await esperarModo(page, 'cipo'))) throw new Error('não pegou o cipó')
      await page.waitForTimeout(3000)
      await foto(page, 'cipo', 0.9)
      await foto(page, 'cipo-de-lado', Math.PI / 2, 300)
      await page.keyboard.press('Space')
      await voltar()
    })
    await tentar('escalar', async () => {
      const t = m.troncos[0]
      if (!t) throw new Error('sem tronco de escalar')
      const { base, raioBase } = t.tronco
      // Do lado do tronco longe dos cipós (perto deles as mãos pegam um no caminho).
      let lx = 0
      let lz = 0
      for (const c of m.cipos) {
        lx += base.x - c.pivo.x
        lz += base.z - c.pivo.z
      }
      const ln = Math.hypot(lx, lz) || 1
      const longe = raioBase + CORPO.raio + 0.1
      const de = { x: base.x + (lx / ln) * longe, z: base.z + (lz / ln) * longe }
      await levar(page, de, base.y + 1.2, rumo(de, base))
      await page.waitForTimeout(1500)
      await page.evaluate((id) => {
        const mv = (globalThis as Global).__arquipelagoMovimento?.()
        if (mv) mv.pedido = { tipo: 'tronco', id }
      }, t.id)
      if (!(await esperarModo(page, 'escalada'))) {
        const d = await page.evaluate(() => {
          const g = globalThis as Global & { __arquipelagoLerCorpo?: () => unknown }
          return JSON.stringify({
            pedido: g.__arquipelagoMovimento?.().pedido ?? null,
            modo: g.__arquipelagoDesenho?.modo,
            corpo: g.__arquipelagoLerCorpo?.(),
          })
        })
        throw new Error(`não agarrou o tronco ${t.id}: ${d}`)
      }
      await page.evaluate(() => (globalThis as Global).__arquipelagoCameraEmVolta?.(Math.PI))
      await page.keyboard.down('KeyW')
      await page.waitForTimeout(800)
      await foto(page, 'escalar', Math.PI * 0.6, 0)
      await page.keyboard.up('KeyW')
      await page.keyboard.press('Space')
      await voltar()
    })
    await tentar('equilibrio', async () => {
      const e = m.equilibrios[0]
      if (!e) throw new Error('sem tronco caído')
      const p = { x: e.a.x + (e.b.x - e.a.x) * 0.25, z: e.a.z + (e.b.z - e.a.z) * 0.25 }
      const y = e.a.y + (e.b.y - e.a.y) * 0.25
      await levar(page, p, y + PE + 0.15, rumo(e.a, e.b))
      await page.waitForTimeout(1500)
      await page.keyboard.down('KeyW')
      const entrou = await esperarModo(page, 'equilibrio', 20_000)
      await page.keyboard.up('KeyW')
      if (!entrou) throw new Error('não entrou no equilíbrio')
      await page.waitForTimeout(2500)
      await foto(page, 'equilibrio', 0.9)
      // A câmera de lado do tronco: o D anda ao longo dele.
      await page.evaluate(() => (globalThis as Global).__arquipelagoCameraEmVolta?.(Math.PI / 2))
      await deLado('equilibrio-andando')
      await voltar()
    })
    await tentar('escada', async () => {
      const esc = m.escadas[0]
      if (!esc) throw new Error('sem escada')
      // Na frente da escada, do lado de fora (o contrário da saída lá em cima), olhando para ela.
      const fx = esc.base.x - esc.saida.x
      const fz = esc.base.z - esc.saida.z
      const n = Math.hypot(fx, fz) || 1
      const de = { x: esc.base.x + (fx / n) * 0.7, z: esc.base.z + (fz / n) * 0.7 }
      await levar(page, de, esc.base.y + 1.2, rumo(de, esc.base))
      await page.waitForTimeout(1500)
      await page.keyboard.down('KeyW')
      const pegou = await esperarModo(page, 'escada', 20_000)
      if (!pegou) {
        await page.keyboard.up('KeyW')
        throw new Error('não pegou a escada')
      }
      await page.waitForTimeout(600)
      await foto(page, 'escada', Math.PI * 0.65, 0)
      await foto(page, 'escada-de-lado', Math.PI / 2, 0)
      await page.keyboard.up('KeyW')
      await page.keyboard.press('Space')
      await voltar()
    })
    await tentar('borda', async () => {
      // Junto da pedra de agarrar, a 0,45 m da quina: sem pedir direção, porque perto da pedra a
      // câmera gira para o lado livre e a frente da tela deixa de ser a frente da pedra.
      let agarrou = false
      for (const b of m.bordas) {
        const meio = { x: (b.a.x + b.b.x) / 2, y: (b.a.y + b.b.y) / 2, z: (b.a.z + b.b.z) / 2 }
        // `fora` é um ponto do lado de fora da quina.
        const fx = b.fora.x - meio.x
        const fz = b.fora.z - meio.z
        const n = Math.hypot(fx, fz) || 1
        const de = { x: meio.x + (fx / n) * 0.45, z: meio.z + (fz / n) * 0.45 }
        // Logo abaixo de pendurada: cai e as mãos agarram a quina (pular dali é soltar).
        await levar(page, de, meio.y - BORDA.maosAcimaDoCentro + 0.15, rumo(de, meio))
        agarrou = await esperarModo(page, 'borda', 15_000)
        if (agarrou) break
      }
      if (!agarrou) throw new Error('não agarrou nenhuma borda')
      await page.waitForTimeout(2500)
      await foto(page, 'pendurada-na-borda', Math.PI * 0.7)
      await foto(page, 'pendurada-de-lado', Math.PI / 2, 300)
      // Subir: a câmera nas costas dela (virada para a pedra), a frente sobe.
      await page.evaluate(() => (globalThis as Global).__arquipelagoCameraEmVolta?.(Math.PI))
      await page.keyboard.down('KeyW')
      await page.screenshot({ path: path.join(prints, 'animacao-subindo-a-borda.png') })
      feitos.push('subindo-a-borda')
      await page.keyboard.up('KeyW')
      console.log('print: subindo-a-borda', (await ler(page))?.modo)
      await voltar()
    })
    await tentar('escorregar', async () => {
      const esc = m.escorregadores[0]
      const [a, b] = esc?.pontos ?? []
      if (!a || !b) throw new Error('sem escorregador')
      const p = { x: a.x + (b.x - a.x) * 0.5, z: a.z + (b.z - a.z) * 0.5 }
      await levar(page, p, a.y + (b.y - a.y) * 0.5 + PE + 0.2, rumo(a, b))
      if (!(await esperarModo(page, 'escorregar', 20_000))) throw new Error('não escorregou')
      await foto(page, 'escorregar', 0.9, 0)
    })
    await tentar('pulo', async () => {
      // A poucos quadros por segundo o pulo inteiro cabe em dois quadros (e a regra nem vê o
      // pulo). Com o relógio virtual do navegador o jogo anda 1/30 s por quadro, como numa tela de
      // verdade, e cada quadro vira um print; depois a altura do corpo escolhe os três. Fica por
      // último na cena: o relógio virtual não volta ao tempo real.
      await voltar()
      await page.waitForTimeout(1200)
      await page.evaluate(() => (globalThis as Global).__arquipelagoCameraEmVolta?.(0.9))
      await page.locator('canvas').click()
      const cdp = await context.newCDPSession(page)
      const corpo = () =>
        page.evaluate(() =>
          (
            globalThis as { __arquipelagoLerCorpo?: () => { y: number; noChao: boolean } }
          ).__arquipelagoLerCorpo?.(),
        )
      const chao = (await corpo())?.y ?? 0
      await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pause' })
      const quadro = async () => {
        const fim = new Promise<void>((r) =>
          cdp.once('Emulation.virtualTimeBudgetExpired', () => r()),
        )
        await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: 1000 / 30 })
        await fim
      }
      await page.keyboard.down('Space')
      await quadro()
      await page.keyboard.up('Space')
      const fotos: { y: number; noChao: boolean; dados: string }[] = []
      for (let i = 0; i < 45; i++) {
        await quadro()
        const c = await corpo()
        const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
        fotos.push({ y: (c?.y ?? 0) - chao, noChao: !!c?.noChao, dados: data })
        if (i > 5 && c?.noChao && fotos.length > 3 && fotos[fotos.length - 4]?.noChao) break
      }
      await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'advance' })
      console.log(
        'pulo: alturas',
        fotos.map((f) => `${f.y.toFixed(2)}${f.noChao ? 'c' : ''}`).join(' '),
      )
      const guardar = (nome: string, f?: { dados: string }) => {
        if (!f) throw new Error(`sem quadro para ${nome}`)
        writeFileSync(path.join(prints, `animacao-${nome}.png`), Buffer.from(f.dados, 'base64'))
        feitos.push(nome)
        console.log(`print: ${nome}`)
      }
      const alto = fotos.reduce(
        (a, b) => (b.y > a.y ? b : a),
        fotos[0] ?? { y: 0, noChao: true, dados: '' },
      )
      const iAlto = fotos.indexOf(alto)
      // Subindo, na metade da altura; descendo, na metade de novo; e dois quadros depois do toque.
      guardar(
        'pulo',
        fotos.find((f, i) => i < iAlto && f.y > alto.y * 0.5),
      )
      guardar(
        'queda',
        fotos.find((f, i) => i > iAlto && !f.noChao && f.y < alto.y * 0.6),
      )
      const toque = fotos.findIndex((f, i) => i > iAlto && f.noChao)
      guardar('aterrissagem', fotos[toque + 2] ?? fotos[toque])
    })
    if (erros.length) console.log('erros na página do Bosque:', erros.join(' | '))
    await context.close()
  }

  // ── Descanso: a cama de casa e o banco da Vila ─────────────────────────────────────────────────
  if (cenas.includes('descanso')) {
    const vila = await ilha('vila-doce', 'vila-doce.glb')
    const chegada = vila.ancora('chegada')
    const o = vila.modelo.getObjectByName('col-banco-1')
    if (!o) throw new Error('sem o col-banco-1')
    const meio = vila.ancora('col-banco-1')
    const yaw = 2 * Math.atan2(o.quaternion.y, o.quaternion.w)
    const fx = -Math.sin(yaw)
    const fz = -Math.cos(yaw)
    const c = Math.cos(vila.giro)
    const s = Math.sin(vila.giro)
    const banco = lugarNoBanco(
      'banco-1',
      { x: meio.x, y: meio.y - o.scale.y / 2, z: meio.z },
      Math.atan2(fx * c + fz * s, -fx * s + fz * c),
    )
    const cama = lugarNaCama(
      { x: CENTRO_DA_CASA.x - 5, y: ALTURA_DA_TERRA + 0.02, z: CENTRO_DA_CASA.z - 1.5 },
      0,
    )
    const em = `${chegada.x.toFixed(2)},${chegada.z.toFixed(2)},${(chegada.y + 1.2).toFixed(2)}`
    const { page, context } = await abrir(`/?novo=1&persistir=0&posicao=8&energia=20&em=${em}`)
    await tentar('sentar', async () => {
      await levar(page, banco.corpo, chegada.y + 1.2, banco.giro)
      await page.getByText('Sentar no banco').first().waitFor({ timeout: 60_000 })
      await page.keyboard.press('KeyE')
      if (!(await esperarModo(page, 'descanso'))) throw new Error('não sentou')
      await page.waitForTimeout(3500)
      await foto(page, 'sentar', 0.6)
      await page.keyboard.down('KeyS')
      await page.waitForTimeout(1500)
      await page.keyboard.up('KeyS')
    })
    await tentar('deitar', async () => {
      await levar(page, cama.corpo, ALTURA_DA_TERRA + 1.2, cama.giro - Math.PI / 2)
      await page.getByText('Deitar na cama').first().waitFor({ timeout: 60_000 })
      await page.keyboard.press('KeyE')
      if (!(await esperarModo(page, 'descanso'))) throw new Error('não deitou')
      await page.waitForTimeout(3500)
      await foto(page, 'deitar', 1.2)
    })
    await context.close()
  }

  // ── O planador no vento da parede de gelo do Pico ──────────────────────────────────────────────
  if (cenas.includes('pico')) {
    const pico = await ilha('pico', 'pico.glb')
    const corrente = pico.ancora('corrente-de-ar')
    const topo = pico.ancora('topo-da-parede')
    const inicial = criarSalvamentoInicial(new Date())
    const guardado = salvar(pico.ancora('chegada'), {
      inventario: { ...inicial.inventario, planador: 1 },
    } as Partial<Salvamento>)
    const { page, context } = await abrir('/?posicao=8', guardado)
    await tentar('planar', async () => {
      const noAlto = { ...corrente, y: corrente.y + 20 }
      for (let i = 0; i < 6 && (await ler(page))?.modo !== 'planar'; i++) {
        await levar(page, noAlto, noAlto.y, rumo(corrente, topo))
        const caindo = await page
          .waitForFunction(
            ({ alto, chao, pe }) => {
              const d = (globalThis as Global).__arquipelagoDesenho
              const y = (d?.posicao.y ?? 0) - pe
              return d?.noChao === false && y < alto - 0.3 && y > chao + 1.5
            },
            { alto: noAlto.y, chao: corrente.y, pe: PE },
            { timeout: 20_000, polling: 'raf' },
          )
          .then(() => true)
          .catch(() => false)
        if (!caindo) continue
        await page.keyboard.press('Space')
        await page.waitForTimeout(1500)
      }
      if ((await ler(page))?.modo !== 'planar') throw new Error('o planador não abriu')
      await page.waitForTimeout(2500)
      await foto(page, 'planar', 0.7)
      await foto(page, 'planar-de-lado', Math.PI / 2, 300)
    })
    await context.close()
  }

  // ── A montaria do Vale ─────────────────────────────────────────────────────────────────────────
  if (cenas.includes('vale')) {
    const vale = await ilha('vale-dos-dinos', 'vale-dos-dinos.glb')
    const TAMPO = 1
    const dino = vale.mundo({ x: MONTARIA_NO_VALE.x, y: TAMPO, z: MONTARIA_NO_VALE.z })
    const aoLado = vale.mundo({ x: MONTARIA_NO_VALE.x, y: TAMPO, z: MONTARIA_NO_VALE.z - 1.6 })
    const guardado = salvar(aoLado, {
      vale: { pegadas: true, escavacao: 3, ninhos: [...NINHOS_DO_VALE], filhote: null },
    } as Partial<Salvamento>)
    const { page, context } = await abrir('/?posicao=8', guardado)
    await tentar('montar', async () => {
      await levar(page, aoLado, TAMPO + 1.2, rumo(aoLado, dino))
      await page.getByText('Montar no dino').first().waitFor({ timeout: 60_000 })
      // O E vale quando a ilha terminou de aparecer; tenta de novo até montar.
      let montou = false
      for (let i = 0; i < 5 && !montou; i++) {
        await apertar(page, 'KeyE')
        montou = await esperarModo(page, 'montar', 15_000)
      }
      if (!montou) throw new Error('não montou')
      await page.waitForTimeout(3500)
      await foto(page, 'montar', 0.9)
      await foto(page, 'montar-de-lado', Math.PI / 2, 300)
    })
    await context.close()
  }

  console.log(`Prints (${feitos.length}) em ${prints}: ${feitos.join(', ')}`)
  if (faltaram.length) {
    console.log(`Faltaram: ${faltaram.join(' | ')}`)
    process.exitCode = 1
  }
} finally {
  await browser?.close()
  server.kill()
}
