/** Jogo real, plataforma falsa local, Chrome serial. Nenhuma chamada a ambiente remoto. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import path from 'node:path'
import { type BrowserContext, chromium, type Page } from 'playwright-core'
import { PORTOS_DA_ARTE } from '../src/mundo/portos-da-arte'
import type { PortoId } from '../src/sistemas/barco'

type Desenho = {
  modo: string
  noChao: boolean
  posicao: { x: number; y: number; z: number }
  ilhasCompletas: number
  barco: {
    fase: string
    distancia: number
    comprimento: number
    devolvendo: boolean
    itinerario: string[]
    visual: { x: number; y: number; z: number }
  } | null
}
const prints = process.env.ARQUIPELAGO_PRINTS
if (!prints) throw Error('Defina uma pasta nova em ARQUIPELAGO_PRINTS.')
await mkdir(prints, { recursive: false })
const porta = await new Promise<number>((resolve, reject) => {
  const s = createServer().once('error', reject)
  s.listen(0, '127.0.0.1', () => {
    const a = s.address()
    if (!a || typeof a === 'string') return reject(Error('Sem porta'))
    s.close(() => resolve(a.port))
  })
})
const origem = `http://127.0.0.1:${porta}`
const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
const encerrado = new Promise<void>((resolve) => server.once('close', () => resolve()))
let logs = ''
server.stdout.on('data', (v) => {
  logs += String(v)
})
server.stderr.on('data', (v) => {
  logs += String(v)
})
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const resultados: unknown[] = []
const timer = setTimeout(() => {
  void browser?.close()
  server.kill()
}, 15 * 60_000)
try {
  const prazo = Date.now() + 45_000
  while (true) {
    if (server.exitCode !== null) throw Error(logs)
    if (logs.includes('Arquipélago no ar') && (await fetch(origem)).ok) break
    if (Date.now() > prazo) throw Error('Playground não iniciou')
    await new Promise((r) => setTimeout(r, 100))
  }
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  for (const celular of process.env.ARQUIPELAGO_CENARIO === 'falha'
    ? [false]
    : process.env.ARQUIPELAGO_TIPO === 'celular'
      ? [true]
      : process.env.ARQUIPELAGO_TIPO === 'computador'
        ? [false]
        : [false, true]) {
    const tipo = celular ? 'adulto-celular' : 'kids-computador'
    const contexto: BrowserContext = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      isMobile: celular,
      hasTouch: celular,
      reducedMotion: celular ? 'reduce' : 'no-preference',
    })
    await contexto.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    const page: Page = await contexto.newPage()
    page.setDefaultTimeout(180_000)
    const erros: string[] = []
    const recusas: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error') {
        if (
          process.env.ARQUIPELAGO_CENARIO === 'falha' &&
          /recife-[^/]+\.glb/.test(m.location().url)
        )
          recusas.push(m.text())
        else erros.push(m.text())
      }
    })
    const ler = (): Promise<Desenho | undefined> =>
      page.evaluate(() => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho)
    const abrir = async (porto: PortoId, jornada = 8) => {
      await page.goto(
        `${origem}/?novo=1&persistir=0&qualidade=leve&posicao=${jornada}&publico=${celular ? 'adulto' : 'kids'}&barco=${porto}`,
      )
      await page.waitForFunction(
        () => {
          const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
          return d?.noChao && d.modo === 'chao'
        },
        undefined,
        { timeout: 45_000 },
      )
      console.log(tipo, 'cais', porto)
    }
    const painel = async () => {
      await page.waitForFunction(() =>
        document.querySelector('.arq-acao')?.textContent?.includes('Embarcar'),
      )
      if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).click()
      else await page.keyboard.press('KeyE')
      await page.getByRole('dialog', { name: 'Viagem de barco' }).waitFor()
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      )
    }
    const escolher = async (destino: PortoId) => {
      const nome =
        destino === 'sua-ilha'
          ? 'Sua ilha'
          : destino === 'recife'
            ? 'Recife Coral'
            : destino === 'pico'
              ? 'Pico Gelado'
              : destino === 'nuvens'
                ? 'Ilha das Nuvens'
                : destino === 'bosque'
                  ? 'Bosque dos Bichos'
                  : destino === 'vila-doce'
                    ? 'Vila Doce'
                    : 'Vale dos Dinos'
      await page.getByRole('button', { name: `Ir para ${nome}`, exact: true }).click()
      await page.waitForFunction(
        () =>
          (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.modo === 'barco',
      )
    }
    const chegar = async (destino: PortoId, devolvido = false) => {
      await page.waitForFunction(
        () => {
          const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
          return d?.modo === 'chao' && d.noChao && d.barco?.fase === 'atracado'
        },
        undefined,
        { timeout: 240_000 },
      )
      const d = await ler()
      assert.ok(d)
      const p = PORTOS_DA_ARTE[destino].embarque
      assert.ok(Math.hypot(d.posicao.x - p.x, d.posicao.z - p.z) < 0.2, JSON.stringify(d))
      assert.equal(d.barco?.devolvendo, devolvido)
      assert.ok(d.ilhasCompletas <= 1)
      resultados.push({ tipo, destino, desenho: d })
      await page.screenshot({ path: path.join(prints, `${tipo}-${destino}.png`) })
      console.log(tipo, 'chegou', destino)
    }
    if (process.env.ARQUIPELAGO_CENARIO === 'falha') {
      const requests: string[] = []
      page.on('requestfailed', (r) => {
        if (/recife-[^/]+\.glb/.test(r.url())) requests.push(r.url())
      })
      await page.route(/recife-[^/]+\.glb/, (r) => r.abort('failed'))
      await abrir('sua-ilha')
      await painel()
      await escolher('recife')
      await page.waitForFunction(
        () =>
          (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.barco
            ?.devolvendo === true,
      )
      resultados.push({ tipo, semCarga: await ler() })
      console.log(tipo, 'falha de carga devolvendo')
      await chegar('sua-ilha', true)
      assert.ok(requests.length > 0)
      assert.equal(erros.length, 0, JSON.stringify(erros))
      resultados.push({ tipo, recusas, requests, erros })
      await contexto.close()
      continue
    }
    if (process.env.ARQUIPELAGO_CENARIO === 'cais') {
      const porto = process.env.ARQUIPELAGO_PORTO
      if (!porto || !(porto in PORTOS_DA_ARTE))
        throw Error('Defina ARQUIPELAGO_PORTO para a massa de cais.')
      const id = Object.keys(PORTOS_DA_ARTE).find((id): id is PortoId => id === porto)
      if (!id) throw Error('Porto desconhecido')
      await abrir(id)
      await painel()
      await page.screenshot({ path: path.join(prints, `${tipo}-${id}-destinos.png`) })
      resultados.push({ tipo, porto: id, desenho: await ler(), erros })
      assert.equal(erros.length, 0, JSON.stringify(erros))
      await contexto.close()
      continue
    }
    if (!celular) {
      let liberarCarga: (() => void) | undefined
      const carga = new Promise<void>((r) => {
        liberarCarga = r
      })
      await page.route(/recife-[^/]+\.glb/, async (r) => {
        await carga
        await r.continue()
      })
      await abrir('sua-ilha')
      await painel()
      await page.screenshot({ path: path.join(prints, `${tipo}-destinos.png`) })
      await page.getByRole('button', { name: 'Agora não', exact: true }).click()
      assert.equal((await ler())?.modo, 'chao')
      await painel()
      await escolher('recife')
      await page.keyboard.press('Space')
      await page.keyboard.press('KeyW')
      assert.equal((await ler())?.modo, 'barco')
      await page.keyboard.press('Escape')
      await page.getByRole('dialog', { name: 'Menu do jogo' }).waitFor()
      const pausa = await ler()
      await page.waitForTimeout(600) // Janela de observação da pausa, não espera de carga.
      assert.equal((await ler())?.barco?.distancia, pausa?.barco?.distancia)
      await page.keyboard.press('Escape')
      await page.waitForFunction(
        () =>
          (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.barco?.fase ===
          'espera',
      )
      resultados.push({ tipo, cargaLenta: await ler() })
      console.log(tipo, 'carga lenta conferida')
      liberarCarga?.()
      await chegar('recife')
      await painel()
      await escolher('pico')
      await chegar('pico')
    } else {
      await abrir('vale-dos-dinos')
      await painel()
      await page.screenshot({ path: path.join(prints, `${tipo}-destinos.png`) })
      await escolher('nuvens')
      await chegar('nuvens')
      await painel()
      await escolher('bosque')
      await chegar('bosque')
    }
    assert.equal(erros.length, 0, JSON.stringify(erros))
    await contexto.close()
    // Outra jornada é uma massa independente. Não apagar o backend falso deixando seu IDB.
    const fechado = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      isMobile: celular,
      hasTouch: celular,
    })
    await fechado.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    const pf = await fechado.newPage()
    pf.on('pageerror', (e) => erros.push(e.message))
    pf.on('console', (m) => {
      if (m.type() === 'error') {
        if (
          process.env.ARQUIPELAGO_CENARIO === 'falha' &&
          /recife-[^/]+\.glb/.test(m.location().url)
        )
          recusas.push(m.text())
        else erros.push(m.text())
      }
    })
    await pf.goto(`${origem}/?novo=1&persistir=0&qualidade=leve&posicao=2&barco=sua-ilha`)
    await pf.waitForFunction(
      () => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.noChao,
      undefined,
      { timeout: 120_000 },
    )
    const d = await pf.evaluate(
      () => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho,
    )
    assert.equal(d?.barco, null)
    assert.equal(await pf.getByRole('dialog', { name: 'Viagem de barco' }).count(), 0)
    assert.equal(erros.length, 0, JSON.stringify(erros))
    resultados.push({ tipo, fechado: d, erros })
    await fechado.close()
  }
  await writeFile(path.join(prints, 'resultado.json'), `${JSON.stringify(resultados, null, 2)}\n`)
  console.log('Conferência da rede do barco concluída. Cenários registrados no recibo.')
} catch (erro) {
  await writeFile(path.join(prints, 'falha.txt'), `${String(erro)}\n${logs}`)
  if (browser)
    for (const c of browser.contexts())
      for (const p of c.pages()) {
        await p.screenshot({ path: path.join(prints, 'falha.png') }).catch(() => {})
        const dado = await p
          .evaluate(() => ({
            url: location.href,
            texto: document.body.innerText,
            desenho: (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho,
          }))
          .catch(() => null)
        await writeFile(path.join(prints, 'falha.json'), `${JSON.stringify(dado, null, 2)}\n`)
      }
  throw erro
} finally {
  clearTimeout(timer)
  await browser?.close()
  server.kill()
  await encerrado
}
