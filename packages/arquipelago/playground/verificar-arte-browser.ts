/** Conferência local, sem conta ou banco. Compilar para Node no Windows. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { ELEVACAO_DOS_PATINS } from '../src/sistemas/ajustes-da-arte'

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4598)
const base = `http://127.0.0.1:${porta}`
const prints = path.resolve(
  process.env.ARQUIPELAGO_PRINTS ?? '../../docs/qa/assets/2026-10-29-ajustes-arte',
)
mkdirSync(prints, { recursive: true })
const probe = createServer()
await new Promise<void>((resolve, reject) => {
  probe.once('error', reject)
  probe.listen(porta, '127.0.0.1', resolve)
})
await new Promise<void>((resolve) => probe.close(() => resolve()))
const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))
const terminou = new Promise<void>((resolve) => servidor.once('exit', () => resolve()))
const linux = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const resultados: string[] = []
try {
  const limite = Date.now() + 30_000
  for (;;) {
    if (servidor.exitCode !== null) throw Error('Playground encerrou')
    try {
      if ((await fetch(base)).ok) break
    } catch {}
    if (Date.now() > limite) throw Error('Playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  const executablePath = process.env.ARQUIPELAGO_CHROMIUM ?? (existsSync(linux) ? linux : undefined)
  browser = await chromium.launch({
    ...(executablePath ? { executablePath } : { channel: 'chrome' }),
    headless: true,
  })
  for (const largura of [1280, 390]) {
    const context = await browser.newContext({
      viewport: { width: largura, height: 844 },
      hasTouch: largura === 390,
    })
    const page = await context.newPage()
    page.setDefaultTimeout(30_000)
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    await page.goto(`${base}/arte`, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => globalThis.__arte?.objetos['arte-estrelinha']?.luzes.length)
    for (const caso of [
      'lumis',
      'recife',
      'lanternas',
      'bau',
      'borrao',
      'fogos',
      'voo',
      'pinguim',
      'barco',
      'iris',
      'patins',
    ]) {
      await page.getByLabel('Peça', { exact: true }).selectOption(caso)
      const id =
        caso === 'lumis'
          ? 'arte-estrelinha'
          : caso === 'voo'
            ? 'arte-borboleta'
            : caso === 'patins'
              ? 'avatar-visual'
              : `arte-${caso}`
      await page.waitForFunction((id) => Boolean(globalThis.__arte?.objetos[id]), id)
      if (['lumis', 'recife', 'lanternas'].includes(caso)) {
        await page.waitForFunction(
          (id) => globalThis.__arte?.objetos[id]?.luzes.every((n) => n === 0),
          id,
        )
        await page.getByRole('button', { name: 'Mostrar noite', exact: true }).click()
        await page.waitForFunction(
          (id) => globalThis.__arte?.objetos[id]?.luzes.some((n) => n > 0),
          id,
        )
        await page.screenshot({ path: path.join(prints, `${caso}-noite-${largura}.png`) })
        await page.getByRole('button', { name: 'Mostrar dia', exact: true }).click()
        await page.waitForFunction(
          (id) => globalThis.__arte?.objetos[id]?.luzes.every((n) => n === 0),
          id,
        )
      }
      if (caso === 'voo') {
        const objetos = await page.evaluate(() => globalThis.__arte?.objetos)
        for (const id of ['arte-borboleta', 'arte-bem-te-vi', 'arte-passaro-das-nuvens'])
          assert((objetos?.[id]?.minimo[1] ?? 0) > 0.9)
      }
      if (caso === 'barco') {
        await page.waitForTimeout(800)
        assert.deepEqual(
          await page.evaluate(() => globalThis.__arte?.objetos['arte-barco']?.posicao),
          [3, 0, -2],
        )
      }
      if (caso === 'pinguim') {
        await page.waitForFunction(() => globalThis.__arte?.colisores.length === 1)
        const pe = await page.evaluate(() => globalThis.__arte?.colisores[0])
        assert(pe && Math.abs(pe.giro.x) < 0.001)
        await page.getByRole('button', { name: 'Deslizar', exact: true }).click()
        await page.waitForFunction(() => (globalThis.__arte?.colisores[0]?.giro.x ?? 0) > 0.7)
        const deitado = await page.evaluate(() => globalThis.__arte?.colisores)
        assert.equal(deitado?.length, 1)
        assert(deitado?.[0] && deitado[0].posicao.y < pe.posicao.y)
        await page.screenshot({ path: path.join(prints, `pinguim-deslizando-${largura}.png`) })
        await page.getByRole('button', { name: 'Voltar ao normal', exact: true }).click()
        await page.waitForFunction(
          () => Math.abs(globalThis.__arte?.colisores[0]?.giro.x ?? 1) < 0.001,
        )
      }
      if (caso === 'patins') {
        await page.waitForTimeout(1000)
        const antes = await page.evaluate(() => globalThis.__arte)
        await page.getByRole('button', { name: 'Elevar com patins', exact: true }).click()
        await page.waitForFunction(
          (elevacao) =>
            Math.abs((globalThis.__arte?.objetos['avatar-visual']?.posicao[1] ?? 0) - elevacao) <
            0.001,
          ELEVACAO_DOS_PATINS,
        )
        const depois = await page.evaluate(() => globalThis.__arte)
        assert.deepEqual(depois?.colisores, antes?.colisores)
        assert((depois?.objetos['arte-rodas']?.minimo[1] ?? -1) > -0.002)
      }
      if (caso === 'iris') {
        await page.getByRole('button', { name: 'Recomeçar', exact: true }).click()
        await page.waitForFunction(() =>
          globalThis.__arte?.objetos['arte-iris']?.bocas.some((n) => n > 0.1),
        )
        const bocas = await page.evaluate(() => globalThis.__arte?.objetos['arte-iris']?.bocas)
        assert.equal(bocas?.length, 9)
        assert.deepEqual(bocas?.slice(0, 3), bocas?.slice(3, 6))
        assert.deepEqual(bocas?.slice(0, 3), bocas?.slice(6, 9))
        await page.screenshot({ path: path.join(prints, `iris-falando-${largura}.png`) })
        await page.waitForTimeout(5000)
        assert(
          (await page.evaluate(() => globalThis.__arte?.objetos['arte-iris']?.bocas))?.every(
            (n) => n === 0,
          ),
        )
      }
      if (['bau', 'borrao', 'fogos'].includes(caso)) await page.waitForTimeout(3000)
      if (['voo', 'barco', 'patins', 'bau'].includes(caso))
        await page.screenshot({ path: path.join(prints, `${caso}-${largura}.png`) })
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      resultados.push(`${largura}: ${caso}`)
    }
    await page.close()
    for (const adiantar of [5, 13]) {
      // Cada serviço falso tem seu próprio salvamento. Não herdar a fila IndexedDB de outro.
      const gameContext = await browser.newContext({
        viewport: { width: largura, height: 844 },
        hasTouch: largura === 390,
      })
      await gameContext.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
      const page = await gameContext.newPage()
      page.setDefaultTimeout(30_000)
      page.on('pageerror', (e) => erros.push(e.message))
      await page.goto(`${base}/?novo=1&persistir=0&posicao=1&em=0,24,2&adiantar=${adiantar}`, {
        waitUntil: 'networkidle',
      })
      await page.waitForFunction(() => {
        const g = globalThis as typeof globalThis & {
          __arquipelagoDesenho?: { luzesDosLumis: Record<string, number[]> }
        }
        return g.__arquipelagoDesenho?.luzesDosLumis.estrelinha?.length
      })
      const leitura = () =>
        page.evaluate(
          () =>
            (
              globalThis as typeof globalThis & {
                __arquipelagoDesenho?: {
                  luzesDosLumis: Record<string, number[]>
                  posicao: { x: number; y: number; z: number }
                }
              }
            ).__arquipelagoDesenho,
        )
      const s = await leitura()
      assert(s)
      for (const valores of Object.values(s.luzesDosLumis))
        assert(valores.length > 0 && valores.every((v) => (adiantar === 13 ? v > 0 : v === 0)))
      await page.screenshot({ path: path.join(prints, `praia-${adiantar}-${largura}.png`) })
      await page.locator('canvas').click({ position: { x: 120, y: 250 } })
      await page.keyboard.down('w')
      await page.waitForTimeout(700)
      await page.keyboard.up('w')
      const t = await leitura()
      assert(t && Math.hypot(t.posicao.x - s.posicao.x, t.posicao.z - s.posicao.z) > 0.2)
      resultados.push(`${largura}: praia ${adiantar}, luzes e caminhada`)
      await gameContext.close()
    }
    assert.deepEqual(erros, [])
    await context.close()
  }
  writeFileSync(
    path.join(prints, 'resultado.json'),
    JSON.stringify(
      { casos: resultados, navegador: await browser.version(), aparelhoFisico: false },
      null,
      2,
    ),
  )
  console.log(`PASS ${resultados.length} casos. Prints em ${prints}`)
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
  await Promise.race([
    terminou,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(Error('Playground não encerrou')), 5000).unref(),
    ),
  ])
}
