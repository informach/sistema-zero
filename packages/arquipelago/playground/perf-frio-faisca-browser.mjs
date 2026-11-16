import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

// Uma execução por vez: o perfil inclui carregamento e primeira visita à horta, sem aquecimento.
const nome = process.argv[2] ?? 'depois',
  base = process.env.ARQUIPELAGO_QA_URL ?? 'http://127.0.0.1:4530',
  dir = resolve(import.meta.dirname, '../../../output/faisca-concepts/qa')
mkdirSync(dir, { recursive: true })
const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  }),
  contexto = await browser.newContext({ viewport: { width: 1280, height: 800 } }),
  page = await contexto.newPage(),
  cdp = await contexto.newCDPSession(page),
  erros = []
page.on('pageerror', (e) => erros.push(e.message))
await contexto.addInitScript(() => {
  window.faiscaGaps = []
  window.faiscaLongs = []
  let anterior
  const frame = (t) => {
    if (anterior && t - anterior > 50) window.faiscaGaps.push({ t, ms: t - anterior })
    anterior = t
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
  new PerformanceObserver((lista) => {
    for (const e of lista.getEntries()) window.faiscaLongs.push({ t: e.startTime, ms: e.duration })
  }).observe({ type: 'longtask', buffered: true })
})
try {
  await cdp.send('Profiler.enable')
  await cdp.send('Profiler.start')
  await page.goto(`${base}/macro?noite=1`)
  await page.waitForFunction(
    () => document.querySelector('.macro-topo')?.getAttribute('data-arte') === 'pronto',
    {},
    { timeout: 60000 },
  )
  const pronto = await page.evaluate(() => performance.now())
  await page.getByText('Medidas e pontos de teste', { exact: true }).click()
  await page.waitForTimeout(2200)
  await page.getByRole('button', { name: 'Campos da Íris', exact: true }).click()
  const horta = await page.evaluate(() => performance.now())
  await page.waitForTimeout(7000)
  const { profile } = await cdp.send('Profiler.stop'),
    dados = await page.evaluate(() => ({ gaps: window.faiscaGaps, longs: window.faiscaLongs })),
    nodes = new Map(profile.nodes.map((n) => [n.id, n])),
    self = new Map(),
    inclusive = new Map(),
    parents = new Map()
  for (const n of profile.nodes) for (const id of n.children ?? []) parents.set(id, n.id)
  for (let i = 0; i < (profile.samples?.length ?? 0); i++) {
    let id = profile.samples[i]
    const dt = profile.timeDeltas[i] / 1000
    self.set(id, (self.get(id) ?? 0) + dt)
    while (id) {
      inclusive.set(id, (inclusive.get(id) ?? 0) + dt)
      id = parents.get(id)
    }
  }
  const top = (map) =>
      [...map]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([id, ms]) => ({ ms, ...nodes.get(id).callFrame })),
    resultado = { pronto, horta, ...dados, topSelf: top(self), topInclusive: top(inclusive), erros }
  writeFileSync(resolve(dir, `cpu-${nome}.cpuprofile`), JSON.stringify(profile))
  writeFileSync(resolve(dir, `cpu-${nome}-resumo.json`), JSON.stringify(resultado, null, 2))
  console.log(
    JSON.stringify(
      { pronto, horta, gapsDepoisDePronto: dados.gaps.filter((g) => g.t > pronto), erros },
      null,
      2,
    ),
  )
  if (erros.length) throw Error(erros.join('\n'))
} finally {
  await browser.close()
}
