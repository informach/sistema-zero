/** Jogo real e serviço falso local. As mudanças de posição são estímulos QA, não uma partida humana. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { percursoNoMundo } from '../src/mundo/bosque'
import { giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'
import { NOMES_DAS_ANCORAS_DOS_TELHADOS, telhadosNoModelo } from '../src/mundo/telhados'
import { CHAVE_DOS_FANTASMAS_FALSOS } from '../src/plataforma/fantasmas-falsos'

const prints = process.env.ARQUIPELAGO_PRINTS
if (!prints) throw new Error('Defina uma pasta inédita em ARQUIPELAGO_PRINTS.')
await mkdir(prints, { recursive: false })
const porta = await new Promise<number>((resolve, reject) => {
  const s = createServer().once('error', reject)
  s.listen(0, '127.0.0.1', () => {
    const a = s.address()
    if (!a || typeof a === 'string') return reject(new Error('Sem porta local'))
    s.close(() => resolve(a.port))
  })
})
const base = `http://127.0.0.1:${porta}`
const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
const encerrado = new Promise<void>((r) => server.once('close', () => r()))
let logs = ''
server.stdout.on('data', (s) => {
  logs += s
})
server.stderr.on('data', (s) => {
  logs += s
})
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const terminal = setTimeout(() => {
  void browser?.close()
  server.kill()
}, 12 * 60_000)
type Ponto = { x: number; y: number; z: number }
type Medida = {
  corrida: { deque: number; tempoMs: number; situacao: string } | null
  fantasma: {
    visivel: boolean
    x: number
    y: number
    z: number
    malhas: number
    opacidade: number | null
    esqueletoProprio: boolean
  } | null
}
type Janela = typeof globalThis & {
  __arquipelagoDesenho?: Medida
  __arquipelagoLevar?: (x: number, y: number, z: number, g: number) => void
}
const medir = (page: Page) => page.evaluate(() => (globalThis as Janela).__arquipelagoDesenho)
const levar = (page: Page, p: Ponto, giro = 0) =>
  page.evaluate(
    ({ p, giro }) =>
      (globalThis as Janela).__arquipelagoLevar?.(p.x, p.y + 1.2, p.z, giro + Math.PI),
    { p, giro },
  )
const resultados: unknown[] = []
try {
  const prazo = Date.now() + 45000
  while (true) {
    if (server.exitCode !== null) throw new Error(logs)
    if (logs.includes('Arquipélago no ar') && (await fetch(base)).ok) break
    if (Date.now() > prazo) throw new Error('O playground não iniciou.')
    await new Promise((r) => setTimeout(r, 100))
  }
  const bytes = await readFile(path.resolve('src/assets/ilhas/vila-doce.glb'))
  const glb = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  )
  const ancoras = Object.fromEntries(
    NOMES_DAS_ANCORAS_DOS_TELHADOS.map((nome) => {
      const p = glb.scene.getObjectByName(nome)?.position
      if (!p) throw new Error(`Sem âncora ${nome}`)
      return [nome, { x: p.x, y: p.y, z: p.z }]
    }),
  )
  const ler = (nome: (typeof NOMES_DAS_ANCORAS_DOS_TELHADOS)[number]) => {
    const p = ancoras[nome]
    if (!p) throw new Error(nome)
    return p
  }
  const vila = ilhasEmVolta().find((i) => i.ilha.id === 'vila-doce')
  if (!vila) throw new Error('Sem a Vila')
  const pontos = percursoNoMundo(
    telhadosNoModelo({
      fonte: ler('fonte'),
      'telhados-inicio': ler('telhados-inicio'),
      'telhados-1': ler('telhados-1'),
      'telhados-2': ler('telhados-2'),
      'telhados-3': ler('telhados-3'),
      'telhados-fim': ler('telhados-fim'),
    }),
    { ...vila.centro, y: 0 },
    giroDaIlha(vila.ilha),
  )
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  for (const celular of process.env.ARQUIPELAGO_TIPO === 'computador' ? [false] : [false, true]) {
    const tipo = celular ? 'celular' : 'computador'
    const ctx = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      isMobile: celular,
      hasTouch: celular,
      reducedMotion: celular ? 'reduce' : 'no-preference',
    })
    const page = await ctx.newPage()
    page.setDefaultTimeout(90000)
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error') erros.push(m.text())
    })
    await ctx.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    const inicio = pontos.largada
    await page.goto(
      `${base}/?novo=1&posicao=8&familia=irmaos&fantasma=1&qualidade=leve&em=${inicio.x},${inicio.z},${inicio.y + 1.2}`,
    )
    await page.waitForFunction(
      () => typeof (globalThis as Janela).__arquipelagoLevar === 'function',
    )
    await levar(page, inicio, pontos.rumoDaLargada)
    await page.getByText('Começar a entrega pelos telhados').first().waitFor()
    if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).click()
    else await page.keyboard.press('KeyE')
    await page.getByRole('timer', { name: 'Entrega pelos telhados' }).waitFor()
    // Primeiro recorde deliberadamente mais lento para o reinício produzir um novo melhor.
    await page.waitForTimeout(12000)
    for (const [i, d] of pontos.deques.entries()) {
      await levar(page, d, d.rumoDaVolta)
      await page.waitForFunction(
        (indice) => ((globalThis as Janela).__arquipelagoDesenho?.corrida?.deque ?? -1) >= indice,
        i,
      )
    }
    await levar(page, pontos.chegada)
    const resultado = page.getByRole('dialog', { name: 'Entrega pelos telhados' })
    await resultado.waitFor()
    await page.waitForFunction(
      (chave) => localStorage.getItem(chave) !== null,
      CHAVE_DOS_FANTASMAS_FALSOS,
    )
    const primeiro = await page.evaluate(
      (chave) => JSON.parse(localStorage.getItem(chave) ?? '[]')[0] as { tempoMs: number },
      CHAVE_DOS_FANTASMAS_FALSOS,
    )
    await resultado.getByRole('button', { name: 'Seguir trajeto de Ana', exact: true }).click()
    await resultado.getByText('A silhueta mostra o caminho', { exact: false }).waitFor()
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    )
    await page.screenshot({ path: path.join(prints, `${tipo}-selecao.png`) })
    await resultado.getByRole('button', { name: 'Correr de novo', exact: true }).click()
    await page.waitForFunction(() => {
      const f = (globalThis as Janela).__arquipelagoDesenho?.fantasma
      return f?.visivel && f.malhas > 0 && f.opacidade === 0.35 && f.esqueletoProprio
    })
    const antes = await medir(page)
    await page.waitForFunction(
      (t) => ((globalThis as Janela).__arquipelagoDesenho?.corrida?.tempoMs ?? 0) > t + 300,
      antes?.corrida?.tempoMs ?? 0,
    )
    const andando = await medir(page)
    assert.notDeepEqual(andando?.fantasma, antes?.fantasma)
    await page.screenshot({ path: path.join(prints, `${tipo}-trajeto.png`) })
    await page.getByRole('button', { name: 'Abrir o menu', exact: true }).click()
    await page.getByRole('dialog', { name: 'Menu do jogo' }).waitFor()
    // Deixar o medidor publicar o quadro pausado e observar uma janela sem avançar o relógio.
    await page.waitForTimeout(350)
    const pausa = await medir(page)
    // A pausa atravessa uma revalidação periódica sem baixar novamente o vetor de amostras.
    await page.waitForTimeout(16_000)
    const depois = await medir(page)
    assert.equal(depois?.corrida?.tempoMs, pausa?.corrida?.tempoMs)
    assert.deepEqual(depois?.fantasma, pausa?.fantasma)
    await page.getByRole('button', { name: 'Continuar jogando', exact: true }).click()
    for (const [i, d] of pontos.deques.entries()) {
      await levar(page, d, d.rumoDaVolta)
      await page.waitForFunction(
        (indice) => ((globalThis as Janela).__arquipelagoDesenho?.corrida?.deque ?? -1) >= indice,
        i,
      )
    }
    await levar(page, pontos.chegada)
    await resultado.waitFor()
    await page.waitForFunction(
      ({ chave, tempo }) => {
        const f = JSON.parse(localStorage.getItem(chave) ?? '[]')[0] as
          | { tempoMs: number }
          | undefined
        return f && f.tempoMs < tempo
      },
      { chave: CHAVE_DOS_FANTASMAS_FALSOS, tempo: primeiro.tempoMs },
    )
    const reinicio = await page.evaluate(
      (chave) =>
        JSON.parse(localStorage.getItem(chave) ?? '[]')[0] as {
          tempoMs: number
          amostras: number[][]
        },
      CHAVE_DOS_FANTASMAS_FALSOS,
    )
    const pontoInicial = reinicio.amostras[0]
    assert.ok(pontoInicial)
    assert.ok(
      Math.hypot(
        pontoInicial[0]! / 100 - pontos.largada.x,
        pontoInicial[2]! / 100 - pontos.largada.z,
      ) < 0.03,
      `O reinício gravou a chegada antiga: ${JSON.stringify(pontoInicial)}`,
    )
    await resultado.getByRole('button', { name: 'Correr sem trajeto', exact: true }).click()
    await resultado
      .getByRole('button', { name: 'Correr sem trajeto', exact: true })
      .waitFor({ state: 'detached' })
    await resultado.getByRole('button', { name: 'Correr de novo', exact: true }).click()
    await page.waitForFunction(() => {
      const d = (globalThis as Janela).__arquipelagoDesenho
      return (d?.corrida?.tempoMs ?? 0) > 1000 && d?.fantasma === null
    })
    await page.screenshot({ path: path.join(prints, `${tipo}-sem-trajeto.png`) })
    assert.equal(erros.length, 0, JSON.stringify(erros))
    resultados.push({
      tipo,
      antes,
      andando,
      pausa,
      depois,
      primeiroTempo: primeiro.tempoMs,
      reinicio,
      retirado: await medir(page),
      erros,
    })
    await ctx.close()
    console.log(`PASS ${tipo}: recorde, seleção, silhueta, movimento, pausa e retirada`)
  }
  await writeFile(path.join(prints, 'resultado.json'), `${JSON.stringify(resultados, null, 2)}\n`)
} catch (e) {
  await writeFile(path.join(prints, 'falha.txt'), `${String(e)}\n${logs}`)
  for (const c of browser?.contexts() ?? [])
    for (const p of c.pages())
      await p.screenshot({ path: path.join(prints, 'falha.png') }).catch(() => {})
  throw e
} finally {
  clearTimeout(terminal)
  await browser?.close()
  server.kill()
  await encerrado
}
