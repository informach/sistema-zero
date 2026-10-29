/** bun build playground/verificar-aparencias-browser.ts --target=node --external playwright-core --outfile .cache/verificar-aparencias-browser.mjs */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'
import { PerspectiveCamera, Vector3 } from 'three'

const porta = process.env.ARQUIPELAGO_TEST_PORT ?? '4632'
const base = `http://127.0.0.1:${porta}`
const prints =
  process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-29-molda-no-mundo')
mkdirSync(prints, { recursive: true })
const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: porta },
  stdio: 'ignore',
  windowsHide: true,
})
type Janela = typeof globalThis & {
  __arquipelagoDesenho?: { camera: { x: number; y: number; z: number } }
  __arquipelagoLevar?: (x: number, y: number, z: number, giro?: number) => void
  __arquipelagoAparencias: {
    ativas: number
    carregadas: number
    liberadas: number
    molda: number
    pinta: number
  }
}
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const resultados: unknown[] = []
const esperarAtivas = (p: Page, n: number) =>
  p.waitForFunction((n) => (globalThis as Janela).__arquipelagoAparencias?.ativas === n, n, {
    timeout: 30000,
  })
const doisQuadros = (p: Page) =>
  p.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  )

async function abrirObjeto(p: Page) {
  // Prepara a proximidade. A colocação, a oficina e as trocas usam os controles reais.
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('arquipelago-playground') ?? '{}')
    const o = s.salvamento.construcao.casa.objetos.find((o: { id: string }) => o.id === 'geladeira')
    ;(globalThis as Janela).__arquipelagoLevar?.(o.x + 1.7, 2.3, o.z + 0.6, Math.PI / 2)
  })
  await p.locator('.arq-acao').filter({ hasText: 'Abrir a geladeira' }).waitFor()
  if ((p.viewportSize()?.width ?? 0) < 500)
    await p.getByRole('button', { name: 'Usar', exact: true }).click()
  else await p.keyboard.press('e')
  await p.getByRole('dialog', { name: 'Geladeira', exact: true }).waitFor()
}
async function fecharObjeto(p: Page) {
  await p
    .getByRole('dialog', { name: 'Geladeira', exact: true })
    .getByRole('button', { name: 'Voltar ao jogo', exact: true })
    .click()
}
async function criar(p: Page, ferramenta: 'Molda' | 'Pinta') {
  const tipo = ferramenta === 'Molda' ? 'molda' : 'pinta'
  const antes = await p.evaluate((t) => {
    const m = (globalThis as Janela).__arquipelagoAparencias
    return t === 'molda' ? m.molda : m.pinta
  }, tipo)
  await p
    .getByRole('button', { name: ferramenta === 'Molda' ? /Modelar no Molda/ : /Pintar no Pinta/ })
    .click()
  await p.getByRole('heading', { name: `Exemplo do ${ferramenta}` }).waitFor()
  await p.getByRole('button', { name: 'Usar no jogo', exact: true }).click()
  await p.waitForFunction(
    ({ tipo, antes }) => {
      const m = (globalThis as Janela).__arquipelagoAparencias
      return m.ativas === 1 && (tipo === 'molda' ? m.molda : m.pinta) > antes
    },
    { tipo, antes },
  )
}

async function usarMoldaGuardada(p: Page) {
  const antes = await p.evaluate(() => (globalThis as Janela).__arquipelagoAparencias.molda)
  await p.getByRole('button', { name: 'Modelada no Molda', exact: true }).click()
  await p.waitForFunction((n) => {
    const m = (globalThis as Janela).__arquipelagoAparencias
    return m.ativas === 1 && m.molda > n
  }, antes)
}
async function enquadrar(p: Page, distancia: number) {
  await p.getByRole('button', { name: /Construir/ }).click()
  await p.getByRole('button', { name: /Olhar/ }).click()
  await esperarCamera(p, 0, -3, distancia)
  // Arrasta pelo controle real. A câmera começa no alvo (0,-3); a geladeira está em (-4.5,2.5).
  const dx = (4.5 * 700) / distancia
  const dy = (-8 * 700) / distancia
  for (let i = 0; i < 3; i++) {
    await p.mouse.move(100, 360)
    await p.mouse.down()
    await p.mouse.move(100 + dx / 3, 360 + dy / 3, { steps: 8 })
    await p.mouse.up()
  }
  if (distancia === 24)
    for (let i = 0; i < 2; i++)
      await p.getByRole('button', { name: 'Aproximar', exact: true }).click()
  await esperarCamera(p, -4.5, 5, 16)
}
async function esperarCamera(p: Page, x: number, z: number, d: number) {
  await p.waitForFunction(
    ({ x, y, z }) => {
      const c = (globalThis as Janela).__arquipelagoDesenho?.camera
      return c && Math.hypot(c.x - x, c.y - y, c.z - z) < 0.03
    },
    { x, y: 1.02 + Math.sin(0.95) * d, z: z + Math.cos(0.95) * d },
  )
}
function pontoDaGeladeira(largura: number, altura: number) {
  const camera = new PerspectiveCamera(55, largura / altura, 0.1, 600)
  camera.position.set(-4.5, 1.02 + Math.sin(0.95) * 16, 5 + Math.cos(0.95) * 16)
  camera.lookAt(-4.5, 1.02, 5)
  camera.updateMatrixWorld(true)
  const ponto = new Vector3(-4.5, 1.02, 2.5).project(camera)
  return { x: ((ponto.x + 1) * largura) / 2, y: ((1 - ponto.y) * altura) / 2 }
}

try {
  const prazo = Date.now() + 30000
  while (true) {
    try {
      if ((await fetch(base)).ok) break
    } catch {}
    if (Date.now() > prazo) throw new Error('Playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  for (const mobile of [false, true]) {
    const nome = mobile ? 'celular' : 'computador'
    const viewport = mobile ? { width: 390, height: 844 } : { width: 1280, height: 720 }
    const contexto = await browser.newContext({
      viewport,
      isMobile: mobile,
      hasTouch: mobile,
      reducedMotion: 'reduce',
    })
    const p = await contexto.newPage()
    p.setDefaultTimeout(30000)
    const erros: string[] = []
    p.on('pageerror', (e) => erros.push(e.message))
    await p.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    const url = `${base}/?novo=1&obra=exemplo&posicao=5&em=-3.2,1.5,3&aparencias=pronto`
    await p.goto(url)
    await p.getByRole('button', { name: /Construir/ }).waitFor()
    await enquadrar(p, 24)
    const ponto = pontoDaGeladeira(viewport.width, viewport.height)
    await p.getByRole('button', { name: /Apagar/ }).click()
    await doisQuadros(p)
    await p.mouse.click(ponto.x, ponto.y)
    await p.waitForFunction(() => {
      const s = JSON.parse(localStorage.getItem('arquipelago-playground') ?? '{}')
      return s.salvamento?.construcao.casa.objetos.every(
        (o: { id: string }) => o.id !== 'geladeira',
      )
    })
    await p.getByRole('button', { name: /Objetos/ }).click()
    await p.getByRole('button', { name: 'Geladeira', exact: true }).click()
    await doisQuadros(p)
    await p.mouse.click(ponto.x, ponto.y)
    await p.waitForFunction(() => {
      const s = JSON.parse(localStorage.getItem('arquipelago-playground') ?? '{}')
      return s.salvamento?.construcao.casa.objetos.some((o: { id: string }) => o.id === 'geladeira')
    })
    await p.screenshot({ path: path.join(prints, `${nome}-01-projeto-azul.png`) })
    await p.getByRole('button', { name: 'Pronto', exact: true }).click()
    await abrirObjeto(p)
    await criar(p, 'Molda')
    await fecharObjeto(p)
    await enquadrar(p, 16)
    await p.screenshot({ path: path.join(prints, `${nome}-02-molda.png`) })
    await p.getByRole('button', { name: 'Pronto', exact: true }).click()
    await abrirObjeto(p)
    await criar(p, 'Pinta')
    await fecharObjeto(p)
    await enquadrar(p, 16)
    await p.screenshot({ path: path.join(prints, `${nome}-03-pinta.png`) })
    await p.getByRole('button', { name: 'Pronto', exact: true }).click()
    await abrirObjeto(p)
    await usarMoldaGuardada(p)
    // Reabrir a mesma criação deve recarregar mesmo que o id continue igual.
    const antes = await p.evaluate(() => (globalThis as Janela).__arquipelagoAparencias.carregadas)
    await criar(p, 'Molda')
    await p.waitForFunction(
      (n) => (globalThis as Janela).__arquipelagoAparencias.carregadas > n,
      antes,
    )
    await p.getByRole('button', { name: 'Comprar', exact: true }).click()
    await p.getByRole('button', { name: 'Comprar', exact: true }).click()
    await esperarAtivas(p, 0)
    await usarMoldaGuardada(p)
    const medicao = await p.evaluate(() => (globalThis as Janela).__arquipelagoAparencias)
    assert.equal(medicao.carregadas - medicao.liberadas, 1)
    assert.ok(medicao.molda >= 3 && medicao.pinta >= 1)
    await fecharObjeto(p)
    await p.waitForTimeout(1800)
    for (const falha of ['falha', 'sem-metodo']) {
      await p.goto(`${base}/?aparencias=${falha}&posicao=5`)
      await p.getByRole('button', { name: /Construir/ }).waitFor()
      await enquadrar(p, 24)
      await esperarAtivas(p, 0)
      await p.screenshot({ path: path.join(prints, `${nome}-04-${falha}.png`) })
      assert.equal(await p.locator('canvas').count(), 1)
    }
    assert.deepEqual(erros, [])
    resultados.push({
      aparelho: nome,
      viewport,
      medicao,
      erros,
      casos: ['colocar', 'Molda', 'Pinta', 'trocar', 'mesmo id', 'galeria', 'falha', 'sem método'],
    })
    await contexto.close()
  }
  writeFileSync(path.join(prints, 'resultado.json'), JSON.stringify(resultados, null, 2))
  console.log(JSON.stringify(resultados, null, 2))
} finally {
  for (const c of browser?.contexts() ?? [])
    for (const p of c.pages()) {
      await p.screenshot({ path: path.join(prints, 'ultima-tela.png') }).catch(() => {})
      console.log(
        'Última tela',
        await p
          .locator('body')
          .innerText()
          .catch(() => 'fechada'),
      )
    }
  await browser?.close()
  servidor.kill()
}
