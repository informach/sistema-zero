import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { type CDPSession, expect, type Page, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

/**
 * O custo das abas Desempenho e Investigar no Python (lote 3 da conclusão, 22/11/2026; a meta da
 * proposta é "abaixo de 5% do quadro"). O par JavaScript mora em `e2e/devtools-cost.spec.ts`.
 *
 * No Python a medida do Desempenho roda no quadro do Python (o contador de quadros pintados) e o
 * Investigar roda no worker (o observador lendo as variáveis), então a conta aqui é a CPU de TODOS
 * os processos de página do navegador (`SystemInfo.getProcessInfo`): o quadro, o worker dele e a
 * página que recebe as fatias e as leituras. Custo = (CPU por segundo com a aba − sem) ÷ 1000 ms,
 * que é a fração do tempo de cada quadro (16,7 ms) que a aba gasta.
 *
 * Três braços por rodada, no controlador de verdade (`pythonControllerProbe`): o programa rodando
 * sem nada, o mesmo programa com a medida ligada (no Python medir não recomeça o programa), e uma
 * execução no modo de observação com o laço da aba Investigar do editor (`runPythonInvestigation`,
 * lendo as variáveis a cada meio segundo). Pygame Zero, Turtle e Raylib, cada um com um jogo que
 * anda sem parar.
 */

const LIMIT = 0.05
const ROUNDS = Number(process.env.STUDIO_DEVTOOLS_COST_ROUNDS ?? 3)
const WARMUP_MS = 3000
const WINDOW_MS = 4000

const PROGRAMS = [
  {
    key: 'python-pgzero',
    engine: 'Python com Pygame Zero',
    fixture: 'pgzeroGame',
    names: ['quadros', 'pontos'],
  },
  {
    key: 'python-turtle',
    engine: 'Python com Turtle',
    fixture: 'turtleAnimation',
    names: ['quadros'],
  },
  {
    key: 'python-raylib',
    engine: 'Python com Raylib',
    fixture: 'raylibGame',
    names: ['quadros', 'pontos'],
  },
] as const

type Arm = 'fechada' | 'desempenho' | 'investigar'

// Na homologação (`studio-mission.yml`) vai junto com o resto da suíte Python, no artefato dela.
const OUTPUT = resolve(
  process.env.STUDIO_PYTHON_DEVTOOLS_COST_OUTPUT ??
    resolve(process.env.PYTHON_PROBE_OUTPUT_DIR ?? '.cache/mission', 'python-devtools-cost.json'),
)

function provenance(): { sha: string | null; dirty: boolean | null } {
  try {
    const sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
    const dirty =
      execSync('git status --porcelain -- src e2e-runtime', { encoding: 'utf8' }).trim().length > 0
    return { sha, dirty }
  } catch {
    return { sha: null, dirty: null }
  }
}

function saveRow(row: { key: string } & Record<string, unknown>) {
  const previous = existsSync(OUTPUT)
    ? (JSON.parse(readFileSync(OUTPUT, 'utf8')) as { rows: Array<{ key: string }> }).rows
    : []
  const rows = [...previous.filter((item) => item.key !== row.key), row]
  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(
    OUTPUT,
    `${JSON.stringify({ measuredAt: new Date().toISOString(), ...provenance(), rows }, null, 2)}\n`,
  )
}

const median = (values: number[]) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (sorted.length === 0) return Number.NaN
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

const round2 = (value: number) => Math.round(value * 100) / 100

/** CPU (ms) somada dos processos de página numa janela, por segundo de janela. */
async function rendererCpuPerSecond(page: Page, session: CDPSession) {
  type Info = { type: string; id: number; cpuTime: number }
  const read = async () =>
    ((await session.send('SystemInfo.getProcessInfo')) as { processInfo: Info[] }).processInfo
  const before = await read()
  await page.waitForTimeout(WINDOW_MS)
  const after = await read()
  let spent = 0
  for (const process of after)
    if (process.type === 'renderer')
      spent += process.cpuTime - (before.find((item) => item.id === process.id)?.cpuTime ?? 0)
  return (spent * 1000) / (WINDOW_MS / 1000)
}

async function start(page: Page, fixture: string, observation: boolean) {
  await page.evaluate(
    ({ fixture, observation }) =>
      globalThis.pythonControllerProbe.create('custo', fixture, { observation }),
    { fixture, observation },
  )
  await page.evaluate(() => globalThis.pythonControllerProbe.run('custo'))
  await expect
    .poll(() => page.evaluate(() => globalThis.pythonControllerProbe.read('custo').status), {
      timeout: 60_000,
    })
    .toBe('running')
  await page
    .locator('iframe')
    .first()
    .evaluate((frame) => {
      frame.style.cssText = 'width:640px;height:480px;border:0'
    })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.pythonControllerProbe)
})

for (const program of PROGRAMS)
  test(`custo das abas no ${program.engine}`, async ({ page, browser }, testInfo) => {
    test.skip(testInfo.project.name === 'edge', 'Uma medida só, no Chrome ou no Chromium.')
    test.setTimeout(15 * 60_000)
    const session = await browser.newBrowserCDPSession()
    const samples: Array<{ arm: Arm; round: number; cpuMsPerSecond: number }> = []
    let slices = 0
    let readings = 0
    for (let round = 0; round < ROUNDS; round++) {
      await start(page, program.fixture, false)
      await page.waitForTimeout(WARMUP_MS)
      // A ordem alterna por rodada (revisão do lote 3): a deriva do programa no tempo não entra
      // sempre do mesmo lado da conta.
      const medir = async (ligada: boolean) => {
        await page.evaluate((on) => globalThis.pythonControllerProbe.measure('custo', on), ligada)
        await page.waitForTimeout(600)
        samples.push({
          arm: ligada ? 'desempenho' : 'fechada',
          round,
          cpuMsPerSecond: await rendererCpuPerSecond(page, session),
        })
      }
      for (const ligada of round % 2 === 0 ? [false, true] : [true, false]) await medir(ligada)
      await page.evaluate(() => globalThis.pythonControllerProbe.measure('custo', false))
      slices += await page.evaluate(
        () => globalThis.pythonControllerProbe.read('custo').perf.length,
      )

      await start(page, program.fixture, true)
      await page.evaluate(
        (names) => globalThis.pythonControllerProbe.investigate('custo', [...names]),
        program.names,
      )
      await page.waitForTimeout(WARMUP_MS)
      samples.push({
        arm: 'investigar',
        round,
        cpuMsPerSecond: await rendererCpuPerSecond(page, session),
      })
      readings += await page.evaluate(() => globalThis.pythonControllerProbe.read('custo').readings)
      await page.evaluate(() => globalThis.pythonControllerProbe.investigate('custo', null))
      await page.evaluate(() => globalThis.pythonControllerProbe.dispose('custo'))
    }
    await session.detach().catch(() => {})

    const cost = (arm: Arm) =>
      median(
        [...new Set(samples.map((sample) => sample.round))].map((round) => {
          const at = (which: Arm) =>
            samples.find((sample) => sample.round === round && sample.arm === which)
              ?.cpuMsPerSecond ?? Number.NaN
          return (at(arm) - at('fechada')) / 1000
        }),
      )
    const result = { desempenho: cost('desempenho'), investigar: cost('investigar') }
    saveRow({
      key: program.key,
      engine: program.engine,
      fixture: program.fixture,
      limit: LIMIT,
      costs: {
        desempenho: { percentP50: round2(result.desempenho * 100) },
        investigar: { percentP50: round2(result.investigar * 100) },
      },
      perfSlices: slices,
      investigationReadings: readings,
      samples: samples.map((sample) => ({
        ...sample,
        cpuMsPerSecond: round2(sample.cpuMsPerSecond),
      })),
    })
    console.log(`[custo] ${program.engine}: ${JSON.stringify(result)}`)
    // As duas abas trabalharam de verdade (senão o braço "ligado" seria igual ao desligado).
    expect(slices).toBeGreaterThan(ROUNDS * 3)
    expect(readings).toBeGreaterThan(ROUNDS * 3)
    expect(result.desempenho).toBeLessThan(LIMIT)
    expect(result.investigar).toBeLessThan(LIMIT)
  })
