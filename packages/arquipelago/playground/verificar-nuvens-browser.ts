/**
 * Nuvens real no playground (fase4-06). Executar no pacote:
 * bun build playground/verificar-nuvens-browser.ts --target=node --external playwright-core --outfile .cache/verificar-nuvens-browser.mjs
 * node .cache/verificar-nuvens-browser.mjs
 * ARQUIPELAGO_CHROMIUM escolhe o navegador; ARQUIPELAGO_PRINTS escolhe a pasta dos prints.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { giroDaIlha, ilhasEmVolta, trajetoDaPonte } from '../src/mundo/medidas'
import { CORPO } from '../src/sistemas/corpo'
import { APRESENTACAO_DA_IRIE } from '../src/sistemas/irie'

type P = { x: number; y: number; z: number }
type Desenho = {
  posicao: P
  camera: P
  giro: number
  ilhasCompletas: number
  modo: string
  noChao: boolean
  plataformasDasNuvens: {
    numero: number
    corpoY: number
    desenhoY: number
    topoY: number
    x: number
    z: number
  }[]
}
const port = process.env.ARQUIPELAGO_TEST_PORT
  ? Number(process.env.ARQUIPELAGO_TEST_PORT)
  : await new Promise<number>((resolve, reject) => {
      const reserva = createServer()
      reserva.once('error', reject)
      reserva.listen(0, '127.0.0.1', () => {
        const endereco = reserva.address()
        if (!endereco || typeof endereco === 'string') return reject(new Error('Sem porta local'))
        reserva.close(() => resolve(endereco.port))
      })
    })
const baseURL = `http://127.0.0.1:${port}`
const resultados: unknown[] = []
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-29-nuvens')
mkdirSync(prints, { recursive: true })
const nuvens = ilhasEmVolta().find((i) => i.ilha.id === 'nuvens')
if (!nuvens) throw new Error('Nuvens fora do anel')
const giro = giroDaIlha(nuvens.ilha)
const bytes = readFileSync('src/assets/ilhas/nuvens.glb')
const modelo = (
  await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  )
).scene
const local = (nome: string) => {
  const no = modelo.getObjectByName(nome)
  if (!no) throw new Error(`Sem âncora ${nome}`)
  return no.position.clone()
}
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
let prazo: ReturnType<typeof setTimeout> | undefined
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
  }, 12 * 60_000)
  for (const celular of [false, true].filter(
    (c) =>
      !process.env.ARQUIPELAGO_TELA ||
      process.env.ARQUIPELAGO_TELA === (c ? 'celular' : 'computador'),
  )) {
    const tipo = celular ? 'celular' : 'computador'
    const context = await browser.newContext({
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
    const page = await context.newPage()
    const erros: string[] = []
    page.on('pageerror', (e) => {
      erros.push(e.message)
      console.error('pageerror', e.message)
    })
    const ponte = trajetoDaPonte(nuvens.ilha)
    const inicio = ponte[ponte.length - 5]
    if (!inicio) throw new Error('Ponte sem começo')
    await page.goto(`${baseURL}/?novo=1&posicao=7&em=${inicio.x},${inicio.z},${inicio.y + 1.2}`, {
      waitUntil: 'domcontentloaded',
    })
    const ler = () =>
      page.evaluate(() => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho)
    const conferirPlataformas = async () => {
      const d = await ler()
      if (d?.plataformasDasNuvens.length !== 4) throw new Error('Faltam plataformas no mundo')
      for (const p of d.plataformasDasNuvens) {
        // O desenho fica 17,5 cm acima do centro do cilindro. A âncora fica 2 cm acima.
        // A posição física e a interpolada podem diferir por até um passo (1 cm).
        if (
          Math.abs(p.desenhoY - p.corpoY - 0.175) > 0.04 ||
          Math.abs(p.topoY - p.desenhoY - 0.02) > 0.005
        )
          throw new Error(`Desenho fora do tampo: ${JSON.stringify(p)}`)
      }
    }
    const levar = (p: P, olhar: number) =>
      page.evaluate(
        ({ p, g }) => {
          const ir = (globalThis as { __arquipelagoLevar?: (...args: number[]) => void })
            .__arquipelagoLevar
          if (!ir) throw new Error('Sem transporte de conferência')
          ir(p.x, p.y + 1.2, p.z, g)
        },
        { p, g: olhar + Math.PI },
      )
    await page.waitForFunction(
      () =>
        ((globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.ilhasCompletas ??
          0) > 0,
      undefined,
      { timeout: 180_000 },
    )
    await page.locator('canvas').click()
    // Em ?novo=1, as tábuas são montadas durante 4,5 s. A ilha pronta não significa
    // que a animação da ponte já terminou. Só começar a caminhada com apoio confirmado.
    await page.waitForTimeout(5000)
    await levar(inicio, rumo(inicio, mundo(local('chegada'))))
    await page.waitForFunction(
      ({ inicio, pe }) => {
        const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
        return (
          d?.noChao &&
          Math.hypot(d.posicao.x - inicio.x, d.posicao.z - inicio.z) < 0.3 &&
          Math.abs(d.posicao.y - pe - inicio.y) < 0.15
        )
      },
      { inicio, pe: PE },
    )
    const chegada = mundo(local('chegada'))
    await page.keyboard.down('KeyW')
    try {
      await page.waitForFunction(
        ({ chegada }) => {
          const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
          return (
            d &&
            Math.hypot(d.posicao.x - chegada.x, d.posicao.z - chegada.z) < 1 &&
            d.noChao &&
            d.posicao.y > chegada.y + 0.8
          )
        },
        { chegada },
        { timeout: 90_000 },
      )
    } finally {
      await page.keyboard.up('KeyW')
    }
    console.log(`${tipo}: chegada pela ponte`, await ler())
    await page.screenshot({ scale: 'css', path: path.join(prints, `nuvens-${tipo}-chegada.png`) })

    /** Leva e espera o corpo de pé no ponto (o pé a `PE` do centro; `subida`: um degrau a mais). */
    const dePe = async (p: P, olhar: number, rotulo: string, subida = 0) => {
      await levar(p, olhar)
      await page.waitForFunction(
        ({ p, pe, subida }) => {
          const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
          return (
            d?.noChao &&
            Math.hypot(d.posicao.x - p.x, d.posicao.z - p.z) < 0.3 &&
            d.posicao.y - pe - p.y > -0.15 &&
            d.posicao.y - pe - p.y < 0.15 + subida
          )
        },
        { p, pe: PE, subida },
        { timeout: 60_000 },
      )
      console.log(`${tipo}: de pé ${rotulo}`)
    }

    // A Iriê fica no chão. Aproximação pelo rumo da chegada, dentro do alcance da conversa.
    const irie = mundo(local('morador'))
    const direcao = local('chegada').sub(local('morador')).setY(0).normalize()
    const encontro = mundo(local('morador').addScaledVector(direcao, 1.6))
    await dePe(encontro, rumo(encontro, irie), 'diante da Iriê')
    await page.locator('.arq-acao').filter({ hasText: 'Conversar com a Iriê' }).waitFor()
    if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
    else {
      await page.locator('canvas').click()
      await page.keyboard.press('KeyE')
    }
    const conversa = page.getByRole('dialog', { name: 'Iriê', exact: true })
    await conversa.getByText(APRESENTACAO_DA_IRIE[0]).waitFor()
    await page.waitForTimeout(2500)
    await page.screenshot({ scale: 'css', path: path.join(prints, `nuvens-${tipo}-irie.png`) })
    await conversa.getByRole('button', { name: 'Continuar' }).click()
    await conversa.getByText(APRESENTACAO_DA_IRIE[1]).waitFor()
    await conversa.getByRole('button', { name: 'Tchau, Iriê' }).click()
    await conversa.waitFor({ state: 'detached' })
    console.log(`${tipo}: conversa abriu, avançou e fechou`)

    // Preparação no começo dos degraus. Daqui ao topo só comandos de direção, corrida e pulo.
    await page.locator('canvas').click()
    const começo = mundo({ x: -10.3, y: 1, z: -2.2 })
    await dePe(começo, rumo(começo, mundo(local('plataforma-1'))), 'antes dos degraus')
    const controlar = async (alvo: P, saltar: boolean, correr = false) => {
      await page.evaluate(
        async ({ alvo, saltar, correr }) => {
          const g = globalThis as unknown as {
            __arquipelagoLerCorpo: () => P & { giro: number; noChao: boolean }
            qaPad: { axes: number[]; buttons: { pressed: boolean }[] }
            qaStep?: () => void
          }
          const fim = performance.now() + 12_000
          let saiu = false
          try {
            g.qaPad.buttons[0]!.pressed = saltar
            while (true) {
              const d = g.__arquipelagoLerCorpo(),
                dx = alvo.x - d.x,
                dz = alvo.z - d.z,
                dist = Math.hypot(dx, dz)
              if (!d.noChao) saiu = true
              if ((!saltar || saiu) && d.noChao && dist < 0.2) break
              if (performance.now() > fim)
                throw new Error(`Não chegou: ${JSON.stringify({ alvo, d, saiu })}`)
              const intensidade =
                dist < 0.18 ? 0 : correr && dist > 0.7 ? 1 : Math.min(0.8, 0.25 + dist * 0.5)
              const x = (dx / Math.max(dist, 0.001)) * intensidade,
                z = (dz / Math.max(dist, 0.001)) * intensidade
              g.qaPad.axes[0] = x * Math.cos(d.giro) - z * Math.sin(d.giro)
              g.qaPad.axes[1] = x * Math.sin(d.giro) + z * Math.cos(d.giro)
              g.qaPad.buttons[7]!.pressed = correr
              if (saiu) g.qaPad.buttons[0]!.pressed = false
              await new Promise((r) => setTimeout(r, 16))
            }
          } finally {
            g.qaPad.axes[0] = g.qaPad.axes[1] = 0
            g.qaPad.buttons[0]!.pressed = g.qaPad.buttons[7]!.pressed = false
          }
        },
        { alvo, saltar, correr },
      )
    }
    for (const p of [
      { x: -11.6, y: 1.93, z: -2.2 },
      { x: -12.9, y: 2.53, z: -2.6 },
      { x: -14.1, y: 3.13, z: -2.9 },
    ])
      await controlar(mundo(p), true)
    console.log(tipo, 'degraus')
    // A primeira está baixa por quatro segundos. Esperar a fase, sem mudar o relógio do jogo.
    const esperar = async (n: number, baixo: number) =>
      page.waitForFunction(
        ({ n, baixo }) => {
          const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
          const p = d?.plataformasDasNuvens.find((p) => p.numero === n)
          return p && Math.abs(p.topoY - baixo) < 0.04
        },
        { n, baixo },
        { timeout: 90_000 },
      )
    await esperar(1, 10.22)
    await controlar(mundo(local('plataforma-1')), true)
    await conferirPlataformas()
    console.log(tipo, 'plataforma 1')
    await page.screenshot({
      scale: 'css',
      path: path.join(prints, `nuvens-${tipo}-plataforma-1.png`),
    })
    for (let n = 1; n < 4; n++) {
      const a = mundo(local(`plataforma-${n}`)),
        b = mundo(local(`plataforma-${n + 1}`))
      const dx = b.x - a.x,
        dz = b.z - a.z,
        dist = Math.hypot(dx, dz)
      const raios = [1.71, 1.53, 1.44, 1.8]
      // Corrida desde o centro, decolagem na beira e chegada na beira interior da próxima.
      await esperar(n + 1, b.y + 0.02)
      await page.evaluate(
        async ({ a, b, dx, dz, dist, ra, rb }) => {
          const g = globalThis as unknown as {
            __arquipelagoLerCorpo: () => P & { giro: number; noChao: boolean }
            qaPad: { axes: number[]; buttons: { pressed: boolean }[] }
            qaStep?: () => void
          }
          const limite = performance.now() + 12_000
          let pulou = false,
            saiu = false
          const trajeto: unknown[] = []
          const alvo = { x: b.x - (dx / dist) * (rb - 0.1), z: b.z - (dz / dist) * (rb - 0.1) }
          let concluiu = false
          let falha: Error | undefined
          const passo = () => {
            const p = g.__arquipelagoLerCorpo()
            const avancou = ((p.x - a.x) * dx + (p.z - a.z) * dz) / dist
            if (!pulou && avancou > ra - 0.35) {
              g.qaPad.buttons[0]!.pressed = true
              pulou = true
              trajeto.push({ p, evento: 'pedido' })
            }
            if (pulou && !p.noChao && !saiu) {
              saiu = true
              trajeto.push({ p, evento: 'ar' })
            }
            const falta = Math.hypot(alvo.x - p.x, alvo.z - p.z)
            if (saiu && p.noChao && Math.hypot(p.x - b.x, p.z - b.z) < rb + 0.25) {
              concluiu = true
              return
            }
            if (performance.now() > limite || p.y < a.y - 3)
              throw new Error(
                `Salto bloqueado: ${JSON.stringify({ a, b, p, pulou, saiu, avancou, trajeto })}`,
              )
            const intensidade = falta < 0.12 ? 0 : 1
            const x = ((alvo.x - p.x) / Math.max(falta, 0.001)) * intensidade,
              z = ((alvo.z - p.z) / Math.max(falta, 0.001)) * intensidade
            g.qaPad.axes[0] = x * Math.cos(p.giro) - z * Math.sin(p.giro)
            g.qaPad.axes[1] = x * Math.sin(p.giro) + z * Math.cos(p.giro)
            g.qaPad.buttons[7]!.pressed = true
            if (saiu) g.qaPad.buttons[0]!.pressed = false
          }
          try {
            // A decisão é lida junto com o controle, não um timer que chega depois do quadro.
            g.qaStep = () => {
              if (concluiu || falha) return
              try {
                passo()
              } catch (e) {
                falha = e instanceof Error ? e : new Error(String(e))
              }
            }
            while (!concluiu && !falha) await new Promise((r) => setTimeout(r, 16))
            if (falha) throw falha
          } finally {
            g.qaStep = undefined
            g.qaPad.axes[0] = g.qaPad.axes[1] = 0
            g.qaPad.buttons[0]!.pressed = g.qaPad.buttons[7]!.pressed = false
          }
        },
        { a, b, dx, dz, dist, ra: raios[n - 1]!, rb: raios[n]! },
      )
      await controlar(b, false)
      await conferirPlataformas()
      console.log(tipo, `plataforma ${n + 1}`)
    }
    await page.screenshot({ scale: 'css', path: path.join(prints, `nuvens-${tipo}-topo.png`) })
    await page.getByRole('button', { name: 'Abrir o menu' }).click()
    await page.waitForTimeout(350)
    const pausada = await ler()
    await page.waitForTimeout(1200)
    const depois = await ler()
    if (
      JSON.stringify(pausada?.posicao) !== JSON.stringify(depois?.posicao) ||
      JSON.stringify(pausada?.plataformasDasNuvens) !== JSON.stringify(depois?.plataformasDasNuvens)
    )
      throw new Error('Plataforma andou na pausa')
    await page.screenshot({ scale: 'css', path: path.join(prints, `nuvens-${tipo}-pausa.png`) })
    await page.keyboard.press('Escape')
    resultados.push({
      tipo,
      chegada: true,
      conversa: true,
      plataformas: 4,
      pausa: true,
      pausada,
      depois,
      erros,
    })

    // Afastar solta a ilha; voltar monta de novo e a Iriê volta com a ilha.
    await levar({ x: 0, y: 1, z: 20 }, 0)
    await page.waitForFunction(
      () =>
        (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.ilhasCompletas ===
        0,
    )
    await dePe(encontro, rumo(encontro, irie), 'de volta, diante da Iriê')
    await page.locator('.arq-acao').filter({ hasText: 'Conversar com a Iriê' }).waitFor()
    console.log(`${tipo}: saiu, soltou a ilha e voltou à Iriê`)
    // A apresentação também abre depois de soltar o modelo, e Esc libera a câmera.
    if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
    else {
      await page.locator('canvas').click()
      await page.keyboard.press('KeyE')
    }
    await conversa.getByText(APRESENTACAO_DA_IRIE[0]).waitFor()
    await page.keyboard.press('Escape')
    await conversa.waitFor({ state: 'detached' })
    if (celular && (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)))
      throw new Error('A interface ultrapassa a largura do celular')
    if (erros.length) throw new Error(erros.join('\n'))
    writeFileSync(
      path.join(prints, `resultado-${tipo}.json`),
      JSON.stringify({ ...(resultados.at(-1) as object), soltouEVoltou: true }, null, 2),
    )
    await context.close()
  }
} catch (erro) {
  for (const c of browser?.contexts() ?? [])
    for (const p of c.pages()) {
      console.error(
        'Última medida',
        await p
          .evaluate(() => (globalThis as { __arquipelagoDesenho?: unknown }).__arquipelagoDesenho)
          .catch(() => null),
      )
      await p.screenshot({ path: path.join(prints, 'falha.png') }).catch(() => {})
    }
  throw erro
} finally {
  clearTimeout(prazo)
  await browser?.close()
  server.kill()
}
