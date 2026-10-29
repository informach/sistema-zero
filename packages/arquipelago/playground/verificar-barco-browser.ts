/**
 * Barco real no playground. Executar no pacote:
 * bun build playground/verificar-barco-browser.ts --target=node --external playwright-core --outfile .cache/verificar-barco-browser.mjs
 * node .cache/verificar-barco-browser.mjs
 * ARQUIPELAGO_CHROMIUM escolhe o navegador; ARQUIPELAGO_PRINTS escolhe a pasta dos prints.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium } from 'playwright-core'

type P = { x: number; y: number; z: number }
type Desenho = {
  posicao: P
  camera: P
  ilhasCompletas: number
  modo: string
  noChao: boolean
  avatar: P | null
  quadrosPorSegundo: number
  barco: {
    fase: string
    distancia: number
    comprimento: number
    recifePronto: boolean
    devolvendo: boolean
    visual: P
    pose: P
  } | null
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
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-29-barco')
mkdirSync(prints, { recursive: true })
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
  const resultados: unknown[] = []
  for (const celular of process.env.ARQUIPELAGO_CENARIO === 'celular' ? [true] : [false, true]) {
    const tipo = celular ? 'celular' : 'computador'
    const context = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      isMobile: celular,
      hasTouch: celular,
      reducedMotion: celular ? 'reduce' : 'no-preference',
    })
    context.setDefaultTimeout(120_000)
    await context.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    let cargasDoRecife = 0
    await context.route(/recife[^/]*\.glb/, async (rota) => {
      cargasDoRecife++
      // A primeira leitura é só das âncoras. A segunda é a ilha pelo ciclo real.
      if (cargasDoRecife === 2) await new Promise((r) => setTimeout(r, 8000))
      await rota.continue()
    })
    const page = await context.newPage()
    const erros: string[] = []
    page.on('pageerror', (e) => {
      erros.push(e.message)
      console.error(e.message)
    })
    const ler = () =>
      page.evaluate(() => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho)
    if (process.env.ARQUIPELAGO_CENARIO !== 'fechado') {
      await page.goto(`${baseURL}/?novo=1&persistir=0&barco=central`, {
        waitUntil: 'domcontentloaded',
      })
      await page.waitForFunction(
        () => {
          const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
          return d?.barco && d.noChao
        },
        undefined,
        { timeout: 180_000 },
      )
      await page.waitForTimeout(1500)
      console.log(tipo, 'antes', await ler())
      resultados.push({ tipo, sentido: 'antes', desenho: await ler() })
      await page.screenshot({ path: path.join(prints, `${tipo}-embarque.png`) })
      for (const sentido of ['ida', 'volta']) {
        if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).click()
        else {
          await page.locator('canvas').click()
          await page.keyboard.press('KeyE')
        }
        await page.waitForFunction(
          () =>
            (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.modo ===
            'barco',
        )
        if (sentido === 'ida') {
          await page.waitForFunction(
            () =>
              ((globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.barco
                ?.distancia ?? 0) > 30,
          )
          // As teclas de movimento não tiram a criança do barco.
          await page.keyboard.down('KeyW')
          await page.keyboard.press('Space')
          await page.waitForTimeout(1000)
          await page.keyboard.up('KeyW')
          const viajando = await ler()
          console.log(tipo, 'viagem', viajando)
          if (!viajando?.avatar || !viajando.barco) throw new Error('Sem passageiro no medidor')
          const a = viajando.avatar,
            v = viajando.barco.visual
          if (Math.hypot(a.x - v.x, a.y - v.y, a.z - v.z) > 0.2)
            throw new Error('Passageiro fora da âncora animada')
          const casco = viajando.barco.pose
          const junto = Math.hypot(v.x - casco.x, v.z - casco.z)
          if (junto < 0.85 || junto > 1.15)
            throw new Error('Âncora do passageiro ficou um quadro atrás do barco')
          resultados.push({ tipo, sentido: 'viagem', desenho: viajando })
          await page.screenshot({ path: path.join(prints, `${tipo}-viagem.png`) })
          await page.keyboard.press('Escape')
          await page.waitForTimeout(500)
          const pausa = await ler()
          await page.waitForTimeout(1200)
          const depois = await ler()
          if (pausa?.barco?.distancia !== depois?.barco?.distancia)
            throw new Error('Pausa moveu o barco')
          if (JSON.stringify(pausa?.barco?.visual) !== JSON.stringify(depois?.barco?.visual))
            throw new Error('Pausa não congelou o balanço')
          await page.keyboard.press('Escape')
          if (process.env.ARQUIPELAGO_CENARIO === 'embarque') break
          await page.waitForFunction(
            () =>
              (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.barco
                ?.fase === 'espera',
            undefined,
            { timeout: 180_000 },
          )
          resultados.push({ tipo, sentido: 'espera', desenho: await ler() })
        }
        await page.waitForFunction(
          () => {
            const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
            return d?.modo === 'chao' && d.noChao && d.barco?.fase === 'atracado'
          },
          undefined,
          { timeout: 240_000 },
        )
        const d = await ler()
        if (!d || (sentido === 'ida' ? d.posicao.z > -70 : d.posicao.z < 30))
          throw new Error(`Desembarque fora do destino: ${JSON.stringify(d)}`)
        if (d.barco?.devolvendo) throw new Error('A viagem devolveu em vez de chegar')
        resultados.push({ tipo, sentido, desenho: d })
        console.log(tipo, sentido, d)
        await page.screenshot({ path: path.join(prints, `${tipo}-${sentido}-chegada.png`) })
        await page.waitForTimeout(1000)
      }
    }
    if (erros.length) throw new Error(erros.join('\n'))
    await context.close()
    // Outro posto é outra massa de teste. Um contexto novo também isola a fila local do IndexedDB.
    const fechado = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      isMobile: celular,
      hasTouch: celular,
    })
    await fechado.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    const paginaFechada = await fechado.newPage()
    paginaFechada.on('pageerror', (e) => erros.push(e.message))
    await paginaFechada.goto(`${baseURL}/?novo=1&persistir=0&barco=central&posicao=2`)
    await paginaFechada.waitForFunction(
      () => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.noChao,
      undefined,
      { timeout: 180_000 },
    )
    const desenhoFechado = await paginaFechada.evaluate(
      () => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho,
    )
    if (desenhoFechado?.barco) throw new Error('Barco disponível com Recife fechado')
    await paginaFechada.screenshot({ path: path.join(prints, `${tipo}-fechado.png`) })
    if (erros.length) throw new Error(erros.join('\n'))
    await fechado.close()
  }
  writeFileSync(path.join(prints, 'medidas.json'), JSON.stringify(resultados, null, 2))
  console.log('Conferência do barco concluída')
} finally {
  await browser?.close()
  server.kill()
}
