import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { expect, type Frame, type Page, test } from '@playwright/test'
import { buildProHostBridgeScript } from '@sistemazero/core/studio/pro-runtime-bridge'

// O Chromium completo põe a prévia em outro processo: é o processo do jogo que se mede.
test.use({ channel: 'chromium' })

/**
 * O custo das abas Desempenho e Investigar (lote 3 da conclusão, 22/11/2026). A proposta aprovada
 * (`docs/estudio-evolucao/paineis-proposta.md`) diz: "O custo da medida fica abaixo de 5% do
 * quadro, conferido por teste antes de ligar". Aqui ele é medido no navegador, no processo do jogo.
 *
 * Três braços alternados na mesma rodada, cada um num documento novo da prévia: a gaveta fechada
 * (o documento de sempre), a medida do Desempenho ligada e o Investigar ligado. Em cada janela:
 * - o tempo de tarefa do processo do jogo (`Performance.getMetrics` numa sessão de depuração do
 *   quadro do jogo, que no Chromium completo é um processo à parte) dividido pelos quadros que o
 *   navegador desenhou na janela;
 * - os intervalos entre quadros (um relógio de `requestAnimationFrame` instalado igual nos três
 *   braços, pelo `requestAnimationFrame` do protótipo, fora de qualquer embrulho da ponte).
 * Custo = (tempo por quadro com a aba − sem a aba) ÷ 16,7 ms, na mediana das rodadas, para cada
 * braço contra as janelas da gaveta fechada da MESMA rodada.
 *
 * O Pro (JavaScript) não abre no playground sem o WebContainer: a medida dele usa a mesma ponte
 * que a prévia do Pro põe em toda página (`buildProHostBridgeScript`, do core) num jogo de canvas
 * sintético, numa prévia com sandbox, ligando e desligando a medida no mesmo documento (no Pro a
 * medida não recarrega o jogo, e o Investigar é o mesmo ouvinte de erro da prévia de sempre). O
 * Python é medido na suíte do runtime (`e2e-runtime/python-devtools-cost.spec.ts`).
 *
 * Fora da suíte que barra o merge: roda no `studio-engines.yml` e localmente com
 * `bunx playwright test --config playwright.engines.config.ts e2e/devtools-cost.spec.ts`.
 */

const FRAME_MS = 1000 / 60
const LIMIT = 0.05
const ROUNDS = Number(process.env.STUDIO_DEVTOOLS_COST_ROUNDS ?? 3)
const WARMUP_MS = 2500
const WINDOW_MS = 4000

const GAMES = [
  { key: 'jogo-2d', engine: 'Jogo 2D', name: 'Pegue a moeda', twoD: true },
  { key: 'jogo-2d-avancado', engine: 'Jogo 2D Avançado', name: 'Pong Profissional', twoD: false },
  { key: 'jogo-3d', engine: 'Jogo 3D', name: 'Desvie dos blocos', twoD: false },
  { key: 'mundo-3d', engine: 'Mundo 3D', name: 'Meu Mundo', twoD: false },
  {
    key: 'jogo-3d-avancado',
    engine: 'Jogo 3D Avançado',
    name: 'Defesa da Torre Profissional',
    twoD: false,
  },
] as const

type Arm = 'fechada' | 'desempenho' | 'investigar'

interface Sample {
  arm: Arm
  round: number
  frames: number
  taskMsPerFrame: number
  scriptMsPerFrame: number
  intervalP50: number
  intervalP95: number
}

const OUTPUT = resolve(
  process.env.STUDIO_DEVTOOLS_COST_OUTPUT ?? '.cache/mission/devtools-cost.json',
)

function provenance(): { sha: string | null; dirty: boolean | null } {
  try {
    const sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
    const dirty =
      execSync('git status --porcelain -- src e2e', { encoding: 'utf8' }).trim().length > 0
    return { sha, dirty }
  } catch {
    return { sha: null, dirty: null }
  }
}

// Um teste que reprova reinicia o processo do Playwright: o relatório é lido do disco e cada
// motor substitui a própria linha.
function saveRow(row: { key: string } & Record<string, unknown>) {
  const previous = existsSync(OUTPUT)
    ? (JSON.parse(readFileSync(OUTPUT, 'utf8')) as { rows: Array<{ key: string }> }).rows
    : []
  const rows = [...previous.filter((item) => item.key !== row.key), row]
  const report = { measuredAt: new Date().toISOString(), ...provenance(), rows }
  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`)
}

const median = (values: number[]) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (sorted.length === 0) return Number.NaN
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

const quantile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)] ?? Number.NaN
}

const round2 = (value: number) => Math.round(value * 100) / 100

/** Mede uma janela no processo do jogo: tempo de tarefa e de script por quadro e os intervalos. */
async function measureWindow(page: Page, frame: Frame, arm: Arm, round: number): Promise<Sample> {
  const session = await page.context().newCDPSession(frame)
  try {
    await session.send('Performance.enable')
    const read = async () => {
      const { metrics } = await session.send('Performance.getMetrics')
      return Object.fromEntries(metrics.map((metric) => [metric.name, metric.value]))
    }
    await frame.evaluate(() => {
      const target = window as typeof window & { __szCostTimes?: number[]; __szCostOn?: boolean }
      target.__szCostTimes = []
      target.__szCostOn = true
      // O do navegador, guardado antes de qualquer script do documento (`keepNativeFrameClock`):
      // a ponte do Pro troca o `window.requestAnimationFrame` com a medida ligada.
      const raf =
        (window as typeof window & { __szCostRaf?: typeof requestAnimationFrame }).__szCostRaf ??
        window.requestAnimationFrame
      const tick = (time: number) => {
        if (!target.__szCostOn) return
        target.__szCostTimes?.push(time)
        raf.call(window, tick)
      }
      raf.call(window, tick)
    })
    const before = await read()
    await page.waitForTimeout(WINDOW_MS)
    const after = await read()
    const times = await frame.evaluate(() => {
      const target = window as typeof window & { __szCostTimes?: number[]; __szCostOn?: boolean }
      target.__szCostOn = false
      return target.__szCostTimes ?? []
    })
    const intervals = times.slice(1).map((time, index) => time - times[index])
    const frames = intervals.length
    const task = ((after.TaskDuration ?? 0) - (before.TaskDuration ?? 0)) * 1000
    const script = ((after.ScriptDuration ?? 0) - (before.ScriptDuration ?? 0)) * 1000
    return {
      arm,
      round,
      frames,
      taskMsPerFrame: frames ? task / frames : Number.NaN,
      scriptMsPerFrame: frames ? script / frames : Number.NaN,
      intervalP50: quantile(intervals, 0.5),
      intervalP95: quantile(intervals, 0.95),
    }
  } finally {
    await session.detach().catch(() => {})
  }
}

/** Guarda o `requestAnimationFrame` do navegador em todo documento, antes dos scripts dele. */
async function keepNativeFrameClock(page: Page) {
  await page.addInitScript(() => {
    ;(window as typeof window & { __szCostRaf?: typeof requestAnimationFrame }).__szCostRaf =
      window.requestAnimationFrame
  })
}

/** Custo de cada braço: mediana das rodadas de (com − fechada da mesma rodada) ÷ 16,7 ms. */
function costs(samples: Sample[]) {
  const result: Record<string, { costP50: number; perRound: number[] }> = {}
  for (const arm of ['desempenho', 'investigar'] as const) {
    const perRound: number[] = []
    for (const round of new Set(samples.map((sample) => sample.round))) {
      const closed = median(
        samples
          .filter((sample) => sample.round === round && sample.arm === 'fechada')
          .map((sample) => sample.taskMsPerFrame),
      )
      const withArm = median(
        samples
          .filter((sample) => sample.round === round && sample.arm === arm)
          .map((sample) => sample.taskMsPerFrame),
      )
      if (Number.isFinite(closed) && Number.isFinite(withArm))
        perRound.push((withArm - closed) / FRAME_MS)
    }
    if (perRound.length > 0) result[arm] = { costP50: median(perRound), perRound }
  }
  return result
}

function exampleCard(page: Page, name: string) {
  return page
    .locator('button')
    .filter({ has: page.getByText(name, { exact: true }) })
    .first()
}

const srcdoc = (page: Page) =>
  page.locator('iframe[title="Pré-visualização"]').getAttribute('srcdoc')

/** O quadro do jogo de um documento novo (sem a marca do documento anterior) com um canvas. */
async function freshGameFrame(page: Page): Promise<Frame> {
  let found: Frame | null = null
  await expect
    .poll(
      async () => {
        for (const frame of page.frames()) {
          if (frame === page.mainFrame()) continue
          const ready = await frame
            .evaluate(
              () =>
                !(window as typeof window & { __szCostMark?: boolean }).__szCostMark &&
                document.querySelector('canvas') !== null,
            )
            .catch(() => false)
          if (ready) {
            found = frame
            return true
          }
        }
        return false
      },
      { timeout: 90_000, intervals: [250] },
    )
    .toBe(true)
  if (!found) throw new Error('Sem o quadro do jogo.')
  return found
}

async function markDocument(page: Page) {
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue
    await frame
      .evaluate(() => {
        ;(window as typeof window & { __szCostMark?: boolean }).__szCostMark = true
      })
      .catch(() => {})
  }
}

/** Começa a partida quando o jogo abre numa tela de Jogar (a mesma conta nos três braços). */
async function startMatch(frame: Frame) {
  const play = frame.getByRole('button', { name: 'Jogar', exact: true })
  if (await play.isVisible({ timeout: 1500 }).catch(() => false))
    await play.click({ timeout: 3000 }).catch(() => {})
}

async function setArm(page: Page, arm: Arm) {
  await markDocument(page)
  const before = await srcdoc(page)
  const close = page.getByRole('button', { name: 'Fechar a gaveta' })
  if (await close.isVisible().catch(() => false)) await close.click()
  if (arm === 'fechada') {
    await expect.poll(() => srcdoc(page), { timeout: 20_000 }).not.toContain('sz:devtools')
    // A gaveta já estava fechada: o documento não troca. O Rodar recomeça o jogo, para todo braço
    // medir um documento que acabou de começar.
    if ((await srcdoc(page)) === before)
      await page.locator('[data-live-target="studio-run"]').click()
  } else if (arm === 'desempenho') {
    await page.getByRole('tab', { name: 'Desempenho' }).click()
    const toggle = page.getByRole('switch', { name: 'Medir o desempenho' })
    if ((await toggle.getAttribute('aria-checked')) !== 'true') await toggle.click()
    await expect.poll(() => srcdoc(page), { timeout: 20_000 }).toContain('sz:devtools:perf')
  } else {
    await page.getByRole('tab', { name: 'Investigar' }).click()
    await page.getByRole('button', { name: 'Investigar o jogo' }).click()
    await expect.poll(() => srcdoc(page), { timeout: 20_000 }).toContain('sz:devtools')
  }
  const frame = await freshGameFrame(page)
  await startMatch(frame)
  await page.waitForTimeout(WARMUP_MS)
  return frame
}

for (const game of GAMES)
  test(`custo das abas no ${game.engine}: ${game.name}`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'O tempo do processo do jogo vem do Chromium.')
    test.setTimeout(20 * 60_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    await keepNativeFrameClock(page)
    await page.goto('/')
    const card = exampleCard(page, game.name)
    if (game.twoD && !(await card.isVisible()))
      await page.getByRole('button', { name: 'Ver todos os jogos 2D' }).click()
    await card.click()
    await expect(page).toHaveURL(/\/editor\//, { timeout: 30_000 })
    await expect(
      page.frameLocator('iframe[title="Pré-visualização"]').locator('canvas').first(),
    ).toBeAttached({ timeout: 90_000 })

    const samples: Sample[] = []
    for (let round = 0; round < ROUNDS; round++)
      for (const arm of ['fechada', 'desempenho', 'fechada', 'investigar'] as const) {
        const frame = await setArm(page, arm)
        samples.push(await measureWindow(page, frame, arm, round))
      }
    const result = costs(samples)
    const row = {
      key: game.key,
      engine: game.engine,
      game: game.name,
      frameMs: round2(FRAME_MS),
      limit: LIMIT,
      costs: Object.fromEntries(
        Object.entries(result).map(([arm, value]) => [
          arm,
          {
            percentP50: round2(value.costP50 * 100),
            perRoundPercent: value.perRound.map((cost) => round2(cost * 100)),
          },
        ]),
      ),
      samples: samples.map((sample) => ({
        ...sample,
        taskMsPerFrame: round2(sample.taskMsPerFrame),
        scriptMsPerFrame: round2(sample.scriptMsPerFrame),
        intervalP50: round2(sample.intervalP50),
        intervalP95: round2(sample.intervalP95),
      })),
    }
    saveRow(row)
    console.log(`[custo] ${game.engine}: ${JSON.stringify(row.costs)}`)
    // Toda janela teve quadros (senão a conta não diz nada).
    expect(samples.every((sample) => sample.frames > 10)).toBe(true)
    expect(result.desempenho?.costP50).toBeLessThan(LIMIT)
    expect(result.investigar?.costP50).toBeLessThan(LIMIT)
  })

/** Um jogo de canvas do tamanho de um jogo Pro pequeno: 300 retângulos que andam por quadro. */
const PRO_GAME = `
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const things = Array.from({ length: 300 }, (_, i) => ({ x: (i * 37) % 640, y: (i * 53) % 480, vx: 1 + (i % 5), vy: 1 + (i % 3) }));
function frame() {
  ctx.fillStyle = '#123';
  ctx.fillRect(0, 0, 640, 480);
  for (const t of things) {
    t.x = (t.x + t.vx) % 640;
    t.y = (t.y + t.vy) % 480;
    ctx.fillStyle = 'hsl(' + ((t.x + t.y) % 360) + ' 70% 60%)';
    ctx.fillRect(t.x, t.y, 12, 12);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
`

test('custo da medida no Pro (JavaScript): a ponte da prévia do Pro num jogo de canvas', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'O tempo do processo do jogo vem do Chromium.')
  test.setTimeout(5 * 60_000)
  await keepNativeFrameClock(page)
  await page.goto('/')
  const origin = new URL(page.url()).origin
  const doc = `<!doctype html><html><body style="margin:0;background:#000"><canvas width="640" height="480"></canvas><script>${buildProHostBridgeScript(origin)}</script><script>${PRO_GAME}</script></body></html>`
  await page.evaluate((html) => {
    document.body.innerHTML = ''
    const frame = document.createElement('iframe')
    frame.title = 'Prévia do Pro'
    frame.setAttribute('sandbox', 'allow-scripts')
    frame.style.cssText = 'width:640px;height:480px;border:0'
    frame.srcdoc = html
    document.body.append(frame)
  }, doc)
  const frame = await freshGameFrame(page)
  await page.waitForTimeout(WARMUP_MS)
  const setPerf = (on: boolean) =>
    page.evaluate((value) => {
      const frame = document.querySelector('iframe')
      frame?.contentWindow?.postMessage({ type: 'sz:perf', on: value }, '*')
    }, on)
  const slices: unknown[] = []
  await page.exposeFunction('__szCostSlice', (data: unknown) => slices.push(data))
  await page.evaluate(() => {
    window.addEventListener('message', (event) => {
      if ((event.data as { type?: unknown } | null)?.type === 'sz:perf')
        (window as typeof window & { __szCostSlice: (data: unknown) => void }).__szCostSlice(
          event.data,
        )
    })
  })

  const samples: Sample[] = []
  for (let round = 0; round < ROUNDS + 2; round++)
    for (const arm of ['fechada', 'desempenho'] as const) {
      await setPerf(arm === 'desempenho')
      await page.waitForTimeout(600)
      samples.push(await measureWindow(page, frame, arm, round))
    }
  await setPerf(false)
  const result = costs(samples)
  saveRow({
    key: 'pro-js',
    engine: 'Pro (JavaScript)',
    game: 'jogo de canvas sintético com a ponte da prévia do Pro',
    frameMs: round2(FRAME_MS),
    limit: LIMIT,
    costs: Object.fromEntries(
      Object.entries(result).map(([arm, value]) => [
        arm,
        {
          percentP50: round2(value.costP50 * 100),
          perRoundPercent: value.perRound.map((cost) => round2(cost * 100)),
        },
      ]),
    ),
    samples: samples.map((sample) => ({
      ...sample,
      taskMsPerFrame: round2(sample.taskMsPerFrame),
      scriptMsPerFrame: round2(sample.scriptMsPerFrame),
      intervalP50: round2(sample.intervalP50),
      intervalP95: round2(sample.intervalP95),
    })),
  })
  console.log(`[custo] Pro: ${JSON.stringify(result)}`)
  // A medida respondeu de verdade (senão o braço "ligado" seria igual ao desligado).
  expect(slices.length).toBeGreaterThan(3)
  expect(samples.every((sample) => sample.frames > 10)).toBe(true)
  expect(result.desempenho?.costP50).toBeLessThan(LIMIT)
})
