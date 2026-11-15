import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const momento = process.argv[2] ?? 'depois',
  base = process.env.ARQUIPELAGO_QA_URL ?? 'http://127.0.0.1:4530',
  saida = resolve(import.meta.dirname, '../../../output/faisca-gate21/placas', momento),
  erros = []
assert.ok(['antes', 'depois'].includes(momento))
mkdirSync(saida, { recursive: true })
const b = await chromium.launch({ channel: 'chrome', headless: true }),
  c = await b.newContext({ viewport: { width: 1280, height: 800 } }),
  p = await c.newPage()
p.on('pageerror', (e) => erros.push(e.message))
try {
  for (const nome of ['costa', 'horta', 'patio', ...(momento === 'depois' ? ['horta-verso'] : [])])
    for (const noite of [false, ...(momento === 'depois' ? [true] : [])]) {
      await p.goto(`${base}/macro?vista=placa-${nome}${noite ? '&noite=1' : ''}`)
      await p.waitForFunction(
        () => document.querySelector('.macro-topo')?.getAttribute('data-arte') === 'pronto',
        {},
        { timeout: 60000 },
      )
      await p.waitForTimeout(1500)
      await p.screenshot({ path: resolve(saida, `${nome}${noite ? '-noite' : ''}.png`) })
    }
  assert.equal(erros.length, 0, erros.join('\n'))
  writeFileSync(resolve(saida, 'capturas.json'), JSON.stringify({ momento, erros }, null, 2))
} finally {
  await b.close()
}
