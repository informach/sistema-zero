/** Conferência local. Bun compila para Node, que executa Playwright com SwiftShader. */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'
import { giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'
import { MERGULHO } from '../src/sistemas/mergulho'
import { caminhoSubmerso, type P } from '../tests/ajuda-mergulho'

type Medida = {
  posicao: P
  giro: number
  modo: string
  camera: P
  ilhasCompletas: number
  mergulho: { pronto: boolean; achados: { bau: boolean; pagina: boolean; tesouro: boolean } }
}
const port = await new Promise<number>((resolve, reject) => {
  const s = createServer()
  s.on('error', reject)
  s.listen(0, '127.0.0.1', () => {
    const a = s.address()
    if (!a || typeof a === 'string') return reject(new Error('Sem porta'))
    s.close(() => resolve(a.port))
  })
})
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-29-mergulho')
mkdirSync(prints, { recursive: true })
const recife = ilhasEmVolta().find((i) => i.ilha.id === 'recife')!,
  giro = giroDaIlha(recife.ilha)
const mundo = (p: P): P => ({
  x: recife.centro.x + p.x * Math.cos(giro) + p.z * Math.sin(giro),
  y: p.y,
  z: recife.centro.z + p.z * Math.cos(giro) - p.x * Math.sin(giro),
})
function reduzir(pontos: P[]) {
  return pontos.filter(
    (p, i) =>
      i === 0 ||
      i === pontos.length - 1 ||
      p.x - pontos[i - 1]!.x !== pontos[i + 1]!.x - p.x ||
      p.y - pontos[i - 1]!.y !== pontos[i + 1]!.y - p.y ||
      p.z - pontos[i - 1]!.z !== pontos[i + 1]!.z - p.z,
  )
}
const caminhos = {
  bau: reduzir(
    await caminhoSubmerso('navio', 'bau', path.resolve('src/assets/ilhas/recife-navio.glb')),
  ).map((p) => mundo({ x: p.x + MERGULHO.navio.x, y: p.y, z: p.z + MERGULHO.navio.z })),
  pagina: reduzir(
    await caminhoSubmerso(
      'navio',
      'pagina-diario',
      path.resolve('src/assets/ilhas/recife-navio.glb'),
    ),
  ).map((p) => mundo({ x: p.x + MERGULHO.navio.x, y: p.y, z: p.z + MERGULHO.navio.z })),
  tesouro: reduzir(
    await caminhoSubmerso(
      'labirinto',
      'tesouro',
      path.resolve('src/assets/ilhas/recife-labirinto.glb'),
    ),
  ).map((p) => mundo({ x: p.x + MERGULHO.labirinto.x, y: p.y, z: p.z + MERGULHO.labirinto.z })),
}
const ler = (p: Page) =>
  p.evaluate(() => (globalThis as { __arquipelagoDesenho: Medida }).__arquipelagoDesenho)
const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let pronto = false
server.stdout.on('data', (d) => {
  if (String(d).includes('Arquipélago no ar')) pronto = true
})
server.stderr.on('data', (d) => process.stderr.write(d))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
let prazo: ReturnType<typeof setTimeout> | undefined
const resultados: unknown[] = []
try {
  const fim = Date.now() + 60_000
  while (!pronto) {
    if (server.exitCode !== null || Date.now() > fim) throw new Error('Playground não iniciou')
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
  }, 15 * 60_000)
  for (const celular of [false, true].filter(
    (c) =>
      !process.env.ARQUIPELAGO_TELA ||
      process.env.ARQUIPELAGO_TELA === (c ? 'celular' : 'computador'),
  )) {
    const tipo = celular ? 'celular' : 'computador'
    const context = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      isMobile: celular,
      hasTouch: celular,
    })
    await context.addInitScript(() => {
      localStorage.setItem('arquipelago:medir', '1')
      localStorage.setItem(
        'arquipelago:conforto',
        JSON.stringify({ menosMovimento: true, qualidade: 'leve' }),
      )
      const g = globalThis as unknown as {
        qaPad: {
          axes: number[]
          buttons: { pressed: boolean }[]
          connected: boolean
          mapping: string
        }
      }
      g.qaPad = {
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 12 }, () => ({ pressed: false })),
        connected: true,
        mapping: 'standard',
      }
      Object.defineProperty(navigator, 'getGamepads', { value: () => [g.qaPad] })
    })
    const page = await context.newPage(),
      erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    page.setDefaultTimeout(120_000)
    const entrada = mundo({ x: 4.4, y: 0.35, z: -16.2 })
    await page.goto(
      `http://127.0.0.1:${port}/?novo=1&persistir=0&posicao=4&em=${entrada.x},${entrada.z},${entrada.y}`,
    )
    await page.waitForFunction(
      () => (globalThis as { __arquipelagoDesenho?: Medida }).__arquipelagoDesenho?.mergulho.pronto,
      undefined,
      { timeout: 180_000 },
    )
    console.log(tipo, 'pronto')
    const usar = () =>
      celular
        ? page.getByRole('button', { name: 'Usar', exact: true }).tap()
        : page.keyboard.press('KeyE')
    const cdp = celular ? await context.newCDPSession(page) : null
    const tocar = async (nome: string, acao: () => Promise<void>) => {
      const caixa = await page.getByRole('button', { name: nome, exact: true }).boundingBox()
      if (!caixa || !cdp) throw new Error('Controle de toque indisponível')
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: caixa.x + caixa.width / 2, y: caixa.y + caixa.height / 2 }],
      })
      try {
        await acao()
      } finally {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      }
    }
    // A preparação posiciona na âncora. Deste ponto em diante só entradas do controle.
    await usar()
    await page.waitForFunction(
      () =>
        (globalThis as { __arquipelagoDesenho: Medida }).__arquipelagoDesenho.modo === 'mergulho',
    )
    if (celular) {
      await page.waitForTimeout(1200)
      const antes = (await ler(page)).posicao.y
      await tocar('Descer', () => page.waitForTimeout(800))
      await page.waitForTimeout(350)
      if ((await ler(page)).posicao.y >= antes - 0.2)
        throw new Error('Descer no toque não moveu o corpo')
    }
    const andar = async (alvos: P[]) => {
      for (const alvo of alvos) {
        await page.evaluate(async (alvo) => {
          const g = globalThis as unknown as {
            __arquipelagoDesenho: Medida
            qaPad: { axes: number[]; buttons: { pressed: boolean }[] }
          }
          const limite = performance.now() + 35_000
          try {
            while (true) {
              const d = g.__arquipelagoDesenho,
                dx = alvo.x - d.posicao.x,
                dz = alvo.z - d.posicao.z,
                dy = alvo.y - d.posicao.y
              if (Math.hypot(dx, dz) < 0.16 && Math.abs(dy) < 0.2) break
              if (performance.now() > limite)
                throw new Error(
                  `Caminho bloqueado: ${JSON.stringify({ alvo, atual: d.posicao, modo: d.modo })}`,
                )
              const fator = Math.min(0.7, Math.hypot(dx, dz)) / Math.max(0.001, Math.hypot(dx, dz))
              const x = dx * fator,
                z = dz * fator
              g.qaPad.axes[0] = x * Math.cos(d.giro) - z * Math.sin(d.giro)
              g.qaPad.axes[1] = x * Math.sin(d.giro) + z * Math.cos(d.giro)
              g.qaPad.buttons[0]!.pressed = dy > 0.12
              g.qaPad.buttons[2]!.pressed = dy < -0.12
              await new Promise((r) => setTimeout(r, 70))
            }
          } finally {
            g.qaPad.axes[0] = g.qaPad.axes[1] = 0
            g.qaPad.buttons[0]!.pressed = g.qaPad.buttons[2]!.pressed = false
          }
        }, alvo)
      }
    }
    const guardar = async (id: 'bau' | 'pagina' | 'tesouro') => {
      const nomes = {
        bau: 'Guardar baú do navio',
        pagina: 'Guardar página do recife',
        tesouro: 'Guardar pérolas do labirinto',
      }
      try {
        await page.locator('.arq-acao').filter({ hasText: nomes[id] }).waitFor({ timeout: 5000 })
      } catch (erro) {
        console.error(tipo, id, 'sem ação', await ler(page))
        await page.screenshot({ path: path.join(prints, `${tipo}-${id}-falha.png`) })
        throw erro
      }
      await usar()
      await page.waitForFunction(
        (id) =>
          (globalThis as { __arquipelagoDesenho: Medida }).__arquipelagoDesenho.mergulho.achados[
            id
          ],
        id,
        { timeout: 5000 },
      )
      await page.screenshot({ path: path.join(prints, `${tipo}-${id}.png`) })
      console.log(tipo, id)
    }
    await andar([mundo({ x: 10, y: -2, z: -20 }), ...caminhos.bau])
    await guardar('bau')
    if (celular) await page.getByRole('button', { name: 'Abrir o menu', exact: true }).tap()
    else await page.keyboard.press('Escape')
    await page.getByRole('dialog', { name: 'Menu do jogo' }).waitFor()
    await page.waitForTimeout(500)
    const pausado = (await ler(page)).posicao
    await page.waitForTimeout(1200)
    const depois = (await ler(page)).posicao
    if (Math.hypot(depois.x - pausado.x, depois.y - pausado.y, depois.z - pausado.z) > 0.01)
      throw new Error('Pausa moveu o corpo')
    await page.screenshot({ path: path.join(prints, `${tipo}-pausa.png`) })
    await page.getByRole('button', { name: 'Continuar jogando' }).click()
    await andar([...caminhos.bau].reverse())
    await andar(caminhos.pagina)
    await guardar('pagina')
    await andar([...caminhos.pagina].reverse())
    await andar(
      [
        { x: 0, y: -2, z: -21 },
        { x: -25, y: -2, z: -23 },
        { x: -29, y: -2, z: 0 },
        { x: -25, y: -2, z: 20 },
      ].map(mundo),
    )
    await andar(caminhos.tesouro)
    await guardar('tesouro')
    await andar([...caminhos.tesouro].reverse())
    const emergir = () =>
      page
        .waitForFunction(
          () =>
            (globalThis as { __arquipelagoDesenho: Medida }).__arquipelagoDesenho.modo === 'chao',
          undefined,
          { timeout: 20_000 },
        )
        .then(() => {})
    if (celular) await tocar('Subir', emergir)
    else {
      await page.keyboard.down('Space')
      try {
        await emergir()
      } finally {
        await page.keyboard.up('Space')
      }
    }
    await page.screenshot({ path: path.join(prints, `${tipo}-superficie.png`) })
    const final = await ler(page)
    // Transporte só nesta prova separada de descarte, após terminar o percurso por controles.
    const levar = (p: P) =>
      page.evaluate((p) => {
        ;(
          globalThis as { __arquipelagoLevar: (x: number, y: number, z: number, g: number) => void }
        ).__arquipelagoLevar(p.x, p.y, p.z, 0)
      }, p)
    await levar({ x: 0, y: 2, z: 20 })
    await page.waitForFunction(() => {
      const d = (globalThis as { __arquipelagoDesenho: Medida }).__arquipelagoDesenho
      return d.ilhasCompletas === 0 && !d.mergulho.pronto
    })
    const fora = await ler(page)
    await levar(entrada)
    await page.waitForFunction(
      () => (globalThis as { __arquipelagoDesenho: Medida }).__arquipelagoDesenho.mergulho.pronto,
    )
    const reaberto = await ler(page)
    if (!Object.values(reaberto.mergulho.achados).every(Boolean))
      throw new Error('Achados perdidos na remontagem')
    resultados.push({
      tipo,
      final,
      fora,
      reaberto,
      erros,
      caminho: 'controle analógico emulado, sem transporte no percurso',
      toque: celular ? 'Usar, Descer, Menu e Subir com eventos de toque' : null,
      descarte: 'transporte separado para a ilha central e retorno após emergir',
    })
    writeFileSync(
      path.join(prints, `resultado-${tipo}.json`),
      JSON.stringify(resultados.at(-1), null, 2),
    )
    console.log(tipo, 'completo, descarte e remontagem conferidos')
    if (erros.length) throw new Error(erros.join('\n'))
    await context.close()
  }
} catch (erro) {
  writeFileSync(
    path.join(prints, 'falha.json'),
    JSON.stringify({ erro: String(erro), resultados }, null, 2),
  )
  throw erro
} finally {
  clearTimeout(prazo)
  await browser?.close()
  server.kill()
}
