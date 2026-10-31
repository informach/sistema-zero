/**
 * A cor da sua ilha (§6.28 A17) no navegador, com a plataforma falsa e sem banco: no jogo novo a
 * casa, a horta e o píer aparecem desbotados (só o quarto tem cor); com a porta nova aberta, a
 * geladeira ganha e um peixe pescado, voltam a ter cor. Compara a saturação média de recortes das
 * fotos, nas mesmas poses. Também guarda as fotos para conferir a olho.
 *
 * No Windows: `bun build playground/verificar-cor-da-sua-ilha-browser.ts --target=node --external
 * playwright-core --outfile .cache/verificar-cor-da-sua-ilha-browser.mjs && node
 * .cache/verificar-cor-da-sua-ilha-browser.mjs`.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4531)
const base = `http://127.0.0.1:${porta}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/cor-da-sua-ilha')
mkdirSync(prints, { recursive: true })
const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))

/** As poses: de frente para a casa e a horta, e de frente para o píer. */
const POSES = {
  casa: { x: 5, y: 2, z: 11, giro: 0 },
  pier: { x: -5, y: 2, z: 17, giro: Math.PI },
} as const
/** O recorte da foto onde fica a peça (frações da largura e da altura), medido nas fotos. */
const RECORTES = {
  casa: { x: 0.12, y: 0.05, w: 0.43, h: 0.28 },
  pier: { x: 0.46, y: 0.22, w: 0.1, h: 0.14 },
} as const

const levar = (page: Page, p: { x: number; y: number; z: number; giro: number }) =>
  page.evaluate((p) => {
    const ir = (globalThis as { __arquipelagoLevar?: (...a: number[]) => void }).__arquipelagoLevar
    if (!ir) throw new Error('Sem transporte de conferência')
    ir(p.x, p.y, p.z, p.giro)
  }, p)

/** A saturação média (0 a 1) do meio da foto, onde fica o que a pose mira. */
async function saturacao(
  page: Page,
  nome: string,
  r: { x: number; y: number; w: number; h: number },
): Promise<number> {
  const foto = await page.screenshot({ path: path.join(prints, `${nome}.png`) })
  const url = `data:image/png;base64,${foto.toString('base64')}`
  // O canvas do jogo não guarda o quadro (sem preserveDrawingBuffer): lê a própria foto.
  return page.evaluate(
    async ({ url, r }) => {
      const img = new Image()
      img.src = url
      await img.decode()
      const copia = document.createElement('canvas')
      copia.width = 320
      copia.height = 200
      const ctx = copia.getContext('2d')
      if (!ctx) throw new Error('sem 2d')
      const w = img.naturalWidth
      const h = img.naturalHeight
      ctx.drawImage(img, w * r.x, h * r.y, w * r.w, h * r.h, 0, 0, 320, 200)
      const { data } = ctx.getImageData(0, 0, 320, 200)
      let soma = 0
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] ?? 0
        const g = data[i + 1] ?? 0
        const b = data[i + 2] ?? 0
        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        soma += max === 0 ? 0 : (max - min) / max
      }
      return soma / (data.length / 4)
    },
    { url, r },
  )
}

let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  const prazo = Date.now() + 45_000
  while (true) {
    if (servidor.exitCode !== null) throw new Error('O playground encerrou antes de iniciar')
    try {
      if ((await fetch(base)).ok) break
    } catch {}
    if (Date.now() > prazo) throw new Error('O playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const erros: string[] = []
  page.on('pageerror', (e) => erros.push(e.message))
  page.setDefaultTimeout(60_000)
  await page.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
  const pronto = () =>
    page.waitForFunction(
      () =>
        'arquipelago-playground' in localStorage &&
        typeof (globalThis as { __arquipelagoLevar?: unknown }).__arquipelagoLevar === 'function',
      null,
      { timeout: 90_000 },
    )

  // Jogo novo: a porta nova fechada.
  await page.goto(`${base}/?novo=1&posicao=2&qualidade=leve`)
  await pronto()
  const medidas: Record<string, number> = {}
  for (const [nome, pose] of Object.entries(POSES)) {
    await levar(page, pose)
    await page.waitForTimeout(2500)
    medidas[`${nome}-antes`] = await saturacao(
      page,
      `${nome}-antes`,
      RECORTES[nome as keyof typeof RECORTES],
    )
  }

  // A porta nova aberta, a geladeira ganha (a primeira colheita) e um peixe na mochila.
  await page.evaluate(() => {
    const salvo = JSON.parse(localStorage.getItem('arquipelago-playground') ?? '{}')
    const s = salvo.salvamento
    s.casa.portaNova = true
    s.projetos.geladeira = { ganhoEm: s.criadoEm, aparencia: null, aparencias: [] }
    s.inventario['peixe-sardinha'] = 1
    localStorage.setItem('arquipelago-playground', JSON.stringify(salvo))
  })
  await page.goto(`${base}/?posicao=2&qualidade=leve`)
  await pronto()
  // A cópia mexida é a do serviço falso ("online"); a do aparelho ainda é a antiga.
  const continuar = page.getByRole('button', { name: 'Usar a versão online' })
  if (await continuar.isVisible({ timeout: 8000 }).catch(() => false)) await continuar.click()
  await page.waitForTimeout(1500)
  for (const [nome, pose] of Object.entries(POSES)) {
    await levar(page, pose)
    await page.waitForTimeout(3500)
    medidas[`${nome}-depois`] = await saturacao(
      page,
      `${nome}-depois`,
      RECORTES[nome as keyof typeof RECORTES],
    )
  }
  console.log(JSON.stringify(medidas))
  for (const nome of Object.keys(POSES)) {
    const antes = medidas[`${nome}-antes`] ?? 0
    const depois = medidas[`${nome}-depois`] ?? 0
    assert.ok(depois > antes * 1.15, `${nome}: a cor não voltou (${antes} para ${depois})`)
  }
  assert.deepEqual(erros, [])
  console.log('PASS: casa, horta e píer desbotados no começo e com cor depois')
  console.log(`Prints: ${prints}`)
  await ctx.close()
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
