/**
 * Ciclos de memória das seis ilhas (Q01, 30/10/2026): com a jornada inteira aberta, visita cada
 * ilha do anel (a completa carrega), volta à ilha central (a completa sai) e mede geometrias e
 * texturas do renderer na mesma pose. As três primeiras voltas aquecem os caches; nas seguintes
 * nada pode crescer além de duas geometrias e nenhuma textura. A diferença entre a placa e a cena
 * (o cache compartilhado dos modelos já vistos) também não pode crescer. Plataforma falsa, sem
 * banco.
 *
 * No Windows: `bun build playground/verificar-memoria-das-ilhas-browser.ts --target=node --external
 * playwright-core --outfile .cache/verificar-memoria-das-ilhas-browser.mjs && node
 * .cache/verificar-memoria-das-ilhas-browser.mjs`.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'
import { ALTURA_DAS_NUVENS, ilhasEmVolta } from '../src/mundo/medidas'

type Desenho = {
  ilhasCompletas: number
  geometrias: number
  texturas: number
  geometriasNaCena: number
}
const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4531)
const base = `http://127.0.0.1:${porta}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/memoria-das-ilhas')
mkdirSync(prints, { recursive: true })
const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))

/** A pose da medida, na grama da ilha central, olhando para o mar do sul. */
const MEDIDA = { x: 2, y: 2, z: 12, giro: 0 }
/**
 * Três voltas aquecem: o cache compartilhado termina de encher entre a segunda e a terceira (duas
 * rodadas de 30/10 pararam no mesmo teto, 609 geometrias e 47 texturas).
 */
const AQUECIMENTO = 3
const VOLTAS = 5

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
async function esperar(page: Page, o: string, pronto: (d: Desenho) => boolean, ms = 120_000) {
  const ate = Date.now() + ms
  while (Date.now() < ate) {
    const d = await ler(page)
    if (d && pronto(d)) return d
    await page.waitForTimeout(400)
  }
  throw new Error(`Não aconteceu a tempo: ${o}`)
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

  const medidas: {
    volta: number
    geometrias: number
    texturas: number
    geometriasNaCena: number
  }[] = []
  for (let volta = 1; volta <= VOLTAS; volta++) {
    for (const { ilha, centro } of ilhasEmVolta()) {
      const y = (ilha.id === 'nuvens' ? ALTURA_DAS_NUVENS : 0) + 4
      await levar(page, centro.x, y, centro.z, 0)
      await esperar(page, `a completa de ${ilha.id}`, (d) => d.ilhasCompletas === 1)
      // Fica um pouco: a troca acaba, os moradores e as peças da ilha montam.
      await page.waitForTimeout(3000)
      if (volta === 1) await page.screenshot({ path: path.join(prints, `volta-1-${ilha.id}.png`) })
      await levar(page, MEDIDA.x, MEDIDA.y, MEDIDA.z, MEDIDA.giro)
      await esperar(page, `soltar ${ilha.id}`, (d) => d.ilhasCompletas === 0)
    }
    await page.waitForTimeout(3000)
    const d = await esperar(page, 'a medida', () => true)
    medidas.push({
      volta,
      geometrias: d.geometrias,
      texturas: d.texturas,
      geometriasNaCena: d.geometriasNaCena,
    })
    console.log(
      `volta ${volta}: ${d.geometrias} geometrias (${d.geometriasNaCena} na cena), ${d.texturas} texturas`,
    )
  }
  await page.screenshot({ path: path.join(prints, 'ilha-central-depois.png') })
  writeFileSync(path.join(prints, 'medidas.json'), `${JSON.stringify(medidas, null, 2)}\n`)
  const aquecida = medidas[AQUECIMENTO - 1]
  if (!aquecida) throw new Error('sem medida')
  for (const m of medidas.slice(AQUECIMENTO)) {
    // A diferença entre a placa e a cena são os modelos do cache compartilhado (moradores e peças
    // já vistos): ela pode existir, mas não pode crescer de uma volta para outra.
    assert.ok(
      m.geometrias - m.geometriasNaCena <= aquecida.geometrias - aquecida.geometriasNaCena + 2,
      `o que fica fora da cena cresceu na volta ${m.volta}`,
    )
    assert.ok(
      m.geometrias <= aquecida.geometrias + 2,
      `geometrias cresceram na volta ${m.volta}: ${aquecida.geometrias} para ${m.geometrias}`,
    )
    assert.ok(
      m.texturas <= aquecida.texturas,
      `texturas cresceram na volta ${m.volta}: ${aquecida.texturas} para ${m.texturas}`,
    )
  }
  assert.deepEqual(erros, [])
  console.log('PASS: seis ilhas, cinco voltas, sem acumular geometrias nem texturas')
  console.log(`Prints e medidas: ${prints}`)
  await ctx.close()
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
