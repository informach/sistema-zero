/**
 * As ilhas em três versões no jogo (lacunas, 01/11/2026): com a jornada inteira aberta, em cada ponte
 * do anel a versão média chega antes da completa (no meio da ponte só a média), a completa entra no
 * fim da ponte e as duas saem quando a pessoa volta à ilha central. Tira um print da média vista da
 * ponte. Plataforma falsa, sem banco.
 *
 * No Windows: `bun build playground/verificar-ilhas-medias-browser.ts --target=node --external
 * playwright-core --outfile .cache/verificar-ilhas-medias-browser.mjs && node
 * .cache/verificar-ilhas-medias-browser.mjs`.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'
import {
  DISTANCIA_DA_COMPLETA,
  DISTANCIA_DA_TROCA,
  ilhasEmVolta,
  type PontoDaPonte,
  trajetoDaPonte,
} from '../src/mundo/medidas'

type Desenho = { ilhasCompletas: number; ilhasMedias: number }
const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4532)
const base = `http://127.0.0.1:${porta}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/ilhas-medias')
mkdirSync(prints, { recursive: true })
const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))

/** Na grama da ilha central, longe de todas as pontes. */
const CENTRAL = { x: 2, y: 2, z: 12 }

const ler = (page: Page) =>
  page.evaluate(
    () => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho ?? null,
  )
const levar = (page: Page, x: number, y: number, z: number, giro: number) =>
  page.evaluate(
    ({ x, y, z, giro }) => {
      const ir = (globalThis as { __arquipelagoLevar?: (...a: number[]) => void })
        .__arquipelagoLevar
      if (!ir) throw new Error('Sem transporte de conferência')
      ir(x, y, z, giro)
    },
    { x, y, z, giro },
  )
async function esperar(page: Page, o: string, pronto: (d: Desenho) => boolean, ms = 90_000) {
  const ate = Date.now() + ms
  while (Date.now() < ate) {
    const d = await ler(page)
    if (d && pronto(d)) return d
    await page.waitForTimeout(300)
  }
  throw new Error(`Não aconteceu a tempo: ${o} (${JSON.stringify(await ler(page))})`)
}

/** O ponto da ponte mais perto da distância pedida do centro da ilha. */
function naPonte(pontos: PontoDaPonte[], centro: { x: number; z: number }, distancia: number) {
  let melhor = pontos[0] as PontoDaPonte
  for (const p of pontos)
    if (
      Math.abs(Math.hypot(p.x - centro.x, p.z - centro.z) - distancia) <
      Math.abs(Math.hypot(melhor.x - centro.x, melhor.z - centro.z) - distancia)
    )
      melhor = p
  return melhor
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
  page.setDefaultTimeout(60_000)
  page.on('pageerror', (e) => erros.push(e.message))
  await page.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
  await page.goto(`${base}/?novo=1&posicao=8&qualidade=leve`)
  await esperar(page, 'o medidor', () => true)

  for (const { ilha, centro } of ilhasEmVolta()) {
    const pontos = trajetoDaPonte(ilha, 48)
    // A câmera atrás da criança, olhando para a ilha do anel.
    const giro = Math.atan2(centro.x, centro.z) + Math.PI
    // No meio da ponte, antes do fim: só a média.
    const meio = naPonte(pontos, centro, DISTANCIA_DA_COMPLETA + 5)
    await levar(page, meio.x, meio.y + 1, meio.z, giro)
    await esperar(page, `a média de ${ilha.id}`, (d) => d.ilhasMedias === 1)
    const soMedia = await ler(page)
    assert.equal(soMedia?.ilhasCompletas, 0, `${ilha.id}: a completa baixou no meio da ponte`)
    await page.waitForTimeout(2500)
    await page.screenshot({ path: path.join(prints, `${ilha.id}-media-da-ponte.png`) })
    // No fim da ponte (antes da troca): a completa baixa, a média continua.
    const fim = naPonte(pontos, centro, (DISTANCIA_DA_COMPLETA + DISTANCIA_DA_TROCA) / 2)
    await levar(page, fim.x, fim.y + 1, fim.z, giro)
    await esperar(page, `a completa de ${ilha.id}`, (d) => d.ilhasCompletas === 1)
    assert.equal((await ler(page))?.ilhasMedias, 1, `${ilha.id}: a média saiu antes da hora`)
    // De volta à ilha central: as duas saem.
    await levar(page, CENTRAL.x, CENTRAL.y, CENTRAL.z, 0)
    await esperar(page, `soltar ${ilha.id}`, (d) => d.ilhasCompletas === 0 && d.ilhasMedias === 0)
    console.log(`ok ${ilha.id}`)
  }
  assert.deepEqual(erros, [])
  console.log('PASS: seis pontes, a média antes da completa, e as duas soltas na volta')
  console.log(`Prints: ${prints}`)
  await ctx.close()
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
