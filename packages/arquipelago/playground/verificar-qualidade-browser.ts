/** Prova funcional local. Não mede a capacidade de um celular real com GPU própria.
 * Executar com Node (script test:qualidade-browser); ARQUIPELAGO_CHROMIUM aceita o Chromium Linux.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { existsSync, mkdirSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'
import { ilhasEmVolta } from '../src/mundo/medidas'
import type { MedidaDoDesenho } from '../src/mundo/medidor'

const port = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4615)
const baseURL = `http://127.0.0.1:${port}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.join(tmpdir(), 'arquipelago-qualidade')
mkdirSync(prints, { recursive: true })
const reserva = createServer()
reserva.listen(port, '127.0.0.1')
await once(reserva, 'listening')
await new Promise<void>((resolve, reject) =>
  reserva.close((erro) => (erro ? reject(erro) : resolve())),
)
const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
})
server.stdout.on('data', () => {})
server.stderr.on('data', (d) => process.stderr.write(d))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const erros: string[] = []
const linux = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const executablePath = process.env.ARQUIPELAGO_CHROMIUM ?? (existsSync(linux) ? linux : undefined)
const bosque = ilhasEmVolta().find((i) => i.ilha.id === 'bosque')!
const em = `${bosque.centro.x},${bosque.centro.z},8`

type GlobalMedido = typeof globalThis & {
  __arquipelagoDesenho?: MedidaDoDesenho
  __arquipelagoLevar?: (...a: number[]) => void
}
const ler = (p: Page) => p.evaluate(() => (globalThis as GlobalMedido).__arquipelagoDesenho!)
async function esperar(p: Page, nivel: string | null, bosqueAtivo = true) {
  await p.waitForFunction(
    ({ nivel, bosqueAtivo }) => {
      const d = (globalThis as GlobalMedido).__arquipelagoDesenho
      return (
        d &&
        (nivel === null || d.qualidade === nivel) &&
        (!bosqueAtivo || (d.ilhasCompletas > 0 && d.vento.materiais > 0))
      )
    },
    { nivel, bosqueAtivo },
    { timeout: 120_000 },
  )
}
async function escolher(p: Page, nome: string, nivel: string) {
  await p.getByRole('button', { name: 'Abrir o menu', exact: true }).click()
  // A qualidade mora em "Conforto e controles" no menu de pausa.
  await p.getByRole('button', { name: 'Conforto e controles', exact: true }).click()
  const escolha = p.getByRole('group', { name: 'Qualidade', exact: true })
  assert.ok(
    await escolha.evaluate((el) => el.getBoundingClientRect().width > 200),
    'O grupo de Conforto não herda a largura de uma miniatura do Construir',
  )
  await escolha.getByRole('button', { name: nome, exact: true }).click()
  assert.equal(
    await escolha.getByRole('button', { name: nome, exact: true }).getAttribute('aria-pressed'),
    'true',
  )
  await esperar(p, nivel)
  await p.getByRole('button', { name: 'Continuar jogando', exact: true }).click()
  await p.waitForTimeout(600)
  assert.equal((await ler(p)).dpr, nivel === 'leve' ? 0.75 : 1.75, 'DPR preservado ao fechar menu')
}

try {
  const deadline = Date.now() + 30_000
  while (true) {
    if (server.exitCode !== null) throw new Error('Playground encerrou antes de iniciar')
    try {
      if ((await fetch(baseURL)).ok) break
    } catch {}
    if (Date.now() > deadline) throw new Error('Playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(executablePath
      ? { executablePath }
      : { channel: process.env.ARQUIPELAGO_BROWSER_CHANNEL ?? 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  console.log('Navegador:', browser.version(), executablePath ?? 'canal chrome no Windows')
  const novaSessao = async () => {
    const context = await browser!.newContext({
      viewport: { width: 960, height: 600 },
      deviceScaleFactor: 2,
    })
    context.setDefaultTimeout(30_000)
    await context.addInitScript(() => {
      localStorage.setItem('arquipelago:medir', '1')
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
    })
    const page = await context.newPage()
    page.on('pageerror', (e) => erros.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error') erros.push(m.text())
    })
    return { context, page }
  }
  for (const [parametro, nivel, vento, ondas, dpr] of [
    ['completa', 'completo', 1, true, 1.75],
    ['leve', 'leve', 0, false, 0.75],
  ] as const) {
    const { context, page } = await novaSessao()
    await page.goto(`${baseURL}/?novo=1&em=${em}&qualidade=${parametro}`, {
      waitUntil: 'domcontentloaded',
    })
    await esperar(page, nivel)
    await page.waitForFunction(
      ({ vento, ondas }) => {
        const d = (globalThis as GlobalMedido).__arquipelagoDesenho
        return d?.vento.qualidadeAplicada === vento && d.ondas.ligadas === ondas
      },
      { vento, ondas },
    )
    const d = await ler(page)
    assert.equal(d.metaDeQuadros, 60)
    assert.equal(d.dpr, dpr)
    if (!ondas) assert.equal(d.ondas.ativas, 0)
    assert.equal(await page.evaluate(() => localStorage.getItem('arquipelago:conforto')), null)
    await page.screenshot({ path: path.join(prints, `qualidade-${nivel}.png`) })
    console.log(
      'Bosque:',
      JSON.stringify({
        nivel: d.qualidade,
        meta: d.metaDeQuadros,
        dpr: d.dpr,
        vento: d.vento,
        ondas: d.ondas,
      }),
    )
    await context.close()
  }

  // Preferência real no menu, sem URL forçada, e persistência ao reabrir.
  const { context, page } = await novaSessao()
  await page.goto(`${baseURL}/?novo=1&em=${em}`, { waitUntil: 'domcontentloaded' })
  await esperar(page, null)
  await escolher(page, 'Leve', 'leve')
  // A plataforma falsa só persiste seu estado remoto depois do PUT do autosave (20 s).
  // Reabrir antes disso criaria outro jogo remoto e um conflito legítimo com a cópia local.
  await page.waitForFunction(
    () => {
      const salvo = localStorage.getItem('arquipelago-playground')
      return salvo !== null && JSON.parse(salvo).revisao >= 2
    },
    undefined,
    { timeout: 45_000 },
  )
  // Reabrir o mesmo jogo, sem os parâmetros que criam outro salvamento.
  await page.evaluate(() => history.replaceState(null, '', '/'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await esperar(page, 'leve', false)
  assert.equal(
    await page.locator('dialog[open]').count(),
    0,
    'Reabertura sem conflito de salvamento',
  )
  // O ponto salvo pode ser anterior à chegada ao Bosque. Esta prova é da preferência, não do autosave.
  await page.evaluate(
    ({ x, z }) => (globalThis as GlobalMedido).__arquipelagoLevar?.(x, 8, z),
    bosque.centro,
  )
  await esperar(page, 'leve')
  await escolher(page, 'Completa', 'completo')
  await page.waitForFunction(
    () => (globalThis as GlobalMedido).__arquipelagoDesenho?.ondas.ligadas === true,
  )
  await escolher(page, 'Leve', 'leve')
  await page.waitForFunction(
    () => (globalThis as GlobalMedido).__arquipelagoDesenho?.ondas.ligadas === false,
  )
  // Caminho livre na central; o personagem e o Rapier são os do jogo, sem simular movimento.
  await page.evaluate(() => (globalThis as GlobalMedido).__arquipelagoLevar?.(0, 3, 12, Math.PI))
  await page.waitForFunction(() => {
    const d = (globalThis as GlobalMedido).__arquipelagoDesenho
    return d?.noChao === true && Math.abs(d.posicao.x) < 0.25 && Math.abs(d.posicao.z - 12) < 0.25
  })
  const antes = await ler(page)
  await page.keyboard.down('KeyW')
  await page.waitForTimeout(1800)
  await page.keyboard.up('KeyW')
  const depois = await ler(page)
  assert.ok(Math.hypot(depois.posicao.x - antes.posicao.x, depois.posicao.z - antes.posicao.z) > 1)
  await page.keyboard.press('Space')
  await page.waitForFunction((altura) => {
    const d = (globalThis as GlobalMedido).__arquipelagoDesenho
    return d && d.posicao.y > altura + 0.4
  }, depois.posicao.y)
  await page.waitForFunction(
    () => (globalThis as GlobalMedido).__arquipelagoDesenho?.noChao === true,
  )
  console.log('Leve: andou, pulou e pousou com física real')
  await context.close()

  const toque = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  await toque.addInitScript(() => {
    localStorage.setItem('arquipelago:medir', '1')
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
  })
  const celular = await toque.newPage()
  celular.on('pageerror', (e) => erros.push(e.message))
  await celular.goto(`${baseURL}/?novo=1&em=0,12`, { waitUntil: 'domcontentloaded' })
  await esperar(celular, null, false)
  assert.equal((await ler(celular)).metaDeQuadros, 30)
  assert.equal(await celular.evaluate(() => matchMedia('(pointer: coarse)').matches), true)
  console.log('Toque emulado:', (await ler(celular)).qualidade, 'meta 30')
  await toque.close()
  assert.deepEqual(erros, [])
} catch (erro) {
  for (const context of browser?.contexts() ?? []) {
    for (const page of context.pages()) {
      console.error('Diagnóstico:', await ler(page).catch(() => null))
      console.error(
        'Diálogos:',
        await page
          .locator('dialog')
          .allTextContents()
          .catch(() => []),
      )
    }
  }
  throw erro
} finally {
  try {
    await browser?.close()
  } finally {
    if (server.exitCode === null) {
      const saiu = once(server, 'exit')
      server.kill()
      await saiu
    }
  }
}
