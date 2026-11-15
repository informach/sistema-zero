/** Fotografia com câmeras públicas ?vista=, idênticas nos dois momentos. */
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const base = process.env.ARQUIPELAGO_QA_URL ?? 'http://127.0.0.1:4530'
const momento = process.argv[2] ?? 'depois'
assert.ok(['antes', 'depois'].includes(momento))
const saida = resolve(
  import.meta.dirname,
  process.env.FAISCA_CAPTURAS_DIR ?? '../../../output/faisca-gate2',
  momento,
)
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: [
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
  ],
})
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await context.newPage(),
  erros = [],
  fotos = []
page.on('pageerror', (e) => erros.push(e.message))
page.on('console', (e) => {
  if (e.type() === 'error' && e.text().includes('Shader Error')) erros.push(e.text())
})
try {
  for (const nome of [
    'porta',
    'praca',
    'costa',
    'oficina',
    'farol',
    'subida',
    'ponte-sul',
    'ponte-norte',
    'farol-noite',
    ...(process.env.FAISCA_CAPTURAS_ADICIONAIS === '1'
      ? ['horta', 'piso', 'piso-baixo', 'piso-noite', 'lago-lateral']
      : []),
  ]) {
    const vista = nome.replace('-noite', '')
    await page.goto(
      `${base}/macro?vista=${vista}${nome.endsWith('-noite') ? '&noite=1' : ''}${process.env.FAISCA_CAPTURAS_QUERY ? `&${process.env.FAISCA_CAPTURAS_QUERY}` : ''}`,
    )
    await page.waitForFunction(
      () => document.querySelector('.macro-topo')?.getAttribute('data-arte') === 'pronto',
      {},
      { timeout: 60000 },
    )
    await page.waitForTimeout(2200)
    await page.screenshot({ path: resolve(saida, `${nome}.png`) })
    const medidas = await page
      .locator('.macro-painel dl')
      .evaluate((el) =>
        Object.fromEntries(
          [...el.querySelectorAll('dt')].map((dt) => [
            dt.textContent,
            dt.nextElementSibling.textContent,
          ]),
        ),
      )
    fotos.push({ nome, url: page.url(), medidas })
    console.log(`${momento}: ${nome}`)
  }
  assert.equal(erros.length, 0, erros.join('\n'))
  writeFileSync(resolve(saida, 'capturas.json'), JSON.stringify({ momento, fotos, erros }, null, 2))
} finally {
  await context.close()
  await browser.close()
}
