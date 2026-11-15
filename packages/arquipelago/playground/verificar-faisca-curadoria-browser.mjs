import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const base = process.env.ARQUIPELAGO_QA_URL ?? 'http://127.0.0.1:4530'
const saida = resolve(import.meta.dirname, '../../../output/faisca-gate2/curadoria')
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
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } }),
  page = await context.newPage(),
  erros = [],
  evidencias = []
page.on('pageerror', (e) => erros.push(e.message))
page.on('console', (e) => {
  if (e.type() === 'error' && e.text().includes('Shader Error')) erros.push(e.text())
})
async function pronto() {
  await page.waitForFunction(
    () => document.querySelector('.macro-topo')?.getAttribute('data-arte') === 'pronto',
    {},
    { timeout: 60000 },
  )
  await page.waitForTimeout(1800)
}
async function posicao() {
  return page.locator('.macro-painel dl').evaluate((el) => {
    const ds = Object.fromEntries(
      [...el.querySelectorAll('dt')].map((e) => [e.textContent, e.nextElementSibling.textContent]),
    )
    const [x, y, z] = ds.Posição.replace(' m', '')
      .split(', ')
      .map((v) => Number(v.replace(',', '.')))
    return { x, y, z, giro: Number(ds['Giro da câmera'].replace(' rad', '')) }
  })
}
async function segurar(teclas, ms) {
  for (const t of teclas) await page.keyboard.down(t)
  try {
    await page.waitForTimeout(ms)
  } finally {
    for (const t of teclas) await page.keyboard.up(t)
  }
}
async function andar(x, z) {
  for (let i = 0; i < 140; i++) {
    const p = await posicao(),
      dx = x - p.x,
      dz = z - p.z,
      d = Math.hypot(dx, dz)
    if (d < 0.3) {
      await page.waitForTimeout(500)
      return await posicao()
    }
    const lx = dx * Math.cos(p.giro) - dz * Math.sin(p.giro),
      lz = dx * Math.sin(p.giro) + dz * Math.cos(p.giro),
      dt = Math.min(380, Math.max(100, (d / 1.65) * 1000)),
      comum = Math.min(Math.abs(lx), Math.abs(lz))
    const tx = lx > 0 ? 'd' : 'a',
      tz = lz > 0 ? 's' : 'w'
    if ((comum / d) * dt > 20) await segurar([tx, tz], (comum / d) * dt * Math.SQRT2)
    const resto = (Math.abs(Math.abs(lx) - Math.abs(lz)) / d) * dt
    if (resto > 20) await segurar([Math.abs(lx) > Math.abs(lz) ? tx : tz], resto)
    await page.waitForTimeout(180)
  }
  throw Error(`Passagem bloqueada em ${JSON.stringify(await posicao())}`)
}
try {
  for (const versao of ['a', 'b'])
    for (const noite of [false, true]) {
      await page.goto(`${base}/macro?curadoria=${versao}&vista=curadoria${noite ? '&noite=1' : ''}`)
      await pronto()
      const nome = `${versao}-${noite ? 'noite' : 'dia'}`
      await page.screenshot({ path: resolve(saida, `${nome}.png`) })
      console.log(`Captura curadoria ${nome}`)
    }
  await page.goto(`${base}/macro?curadoria=b`)
  await pronto()
  const percurso = []
  for (const [x, z] of [
    [43, 171],
    [50, 171],
    [51.34, 171.27],
    [52.47, 172.03],
    [53.23, 173.16],
    [53.5, 174.5],
    [53.5, 181.5],
  ]) {
    const p = await andar(x, z)
    assert.ok(p.y > 4.5 && p.y < 4.9, JSON.stringify(p))
    percurso.push(p)
  }
  assert.ok(
    percurso.some((p) => p.y > 4.6),
    'O avatar precisa pisar no caminho elevado real, não só no terreno sob ele',
  )
  await page.screenshot({ path: resolve(saida, 'travessia.png') })
  evidencias.push({ versao: 'b', percurso })
  assert.equal(
    await page.evaluate(() => localStorage.getItem('arquipelago:faisca:ensaio')),
    null,
    'A prova não deve substituir o salvamento do ensaio principal',
  )
  assert.equal(erros.length, 0, erros.join('\n'))
  writeFileSync(resolve(saida, 'curadoria.json'), JSON.stringify({ evidencias, erros }, null, 2))
  console.log('PASS: módulos nativos, juntas e curva percorridos com o controlador real')
} finally {
  await context.close()
  await browser.close()
}
