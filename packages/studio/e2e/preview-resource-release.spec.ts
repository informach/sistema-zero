import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { type CDPSession, expect, type Frame, type Page, test } from '@playwright/test'

// O Chromium completo põe a prévia em outro processo; é o processo do jogo que se mede aqui.
test.use({ channel: 'chromium' })

/**
 * Liberação de recursos do jogo (seção 5 da missão: "liberar listeners, timers, áudio, workers e
 * recursos gráficos"), medida do lado do JOGO. A linha de base dos motores (`engine-baseline`) só
 * enxerga a página do editor; aqui entram o processo da prévia e a GPU.
 *
 * - CPU de todos os processos do navegador em 2 s com o jogo rodando e em 2 s depois do Parar
 *   (`SystemInfo.getProcessInfo`). Laço de quadros, timers e WebGL do jogo param junto com o
 *   documento: a CPU da prévia e da GPU tem de cair. O ÁUDIO não é medido à parte: o Blockly do
 *   editor mantém os próprios `AudioContext` ligados, e o serviço de áudio fica de fora da soma
 *   (medido em 21/11/2026; ver `docs/estudio-evolucao/isolamento-da-previa.md`).
 * - Quadros na página depois de 10 ciclos de Parar e Rodar: nenhum documento fica para trás. A
 *   contagem de processos vai para a evidência, sem critério: os iframes com sandbox da mesma
 *   página dividem um processo, e o fim de um processo é adiado (revisão do lote 2).
 * - Memória JS do quadro do jogo no 1º e no 10º Rodar, medida no mesmo instante (1,5 s depois do
 *   primeiro quadro): o 10º fica abaixo de 1,5 vez o 1º mais 1 MB de folga para memória pequena.
 *
 * Só Chromium (o protocolo de depuração dele dá os processos).
 */

const GAMES = [
  { engine: 'Jogo 2D', name: 'Mini plataforma', twoD: true },
  { engine: 'Jogo 3D', name: 'Cubo girando', twoD: false },
  { engine: 'Jogo 3D Avançado', name: 'Defesa da Torre Profissional', twoD: false },
] as const

const OUTPUT = resolve(
  process.env.STUDIO_RESOURCE_RELEASE_OUTPUT ?? '.cache/mission/resource-release.json',
)
const rows: unknown[] = []

type ProcessInfo = { type: string; id: number; cpuTime: number }

async function processes(session: CDPSession): Promise<ProcessInfo[]> {
  const { processInfo } = (await session.send('SystemInfo.getProcessInfo')) as {
    processInfo: ProcessInfo[]
  }
  return processInfo
}

/** CPU (ms) de cada tipo de processo numa janela, sem o navegador e sem o serviço de áudio. */
async function cpuDuring(page: Page, session: CDPSession, ms: number) {
  const before = await processes(session)
  await page.waitForTimeout(ms)
  const after = await processes(session)
  let renderers = 0
  let gpu = 0
  for (const process of after) {
    const spent = process.cpuTime - (before.find((item) => item.id === process.id)?.cpuTime ?? 0)
    if (process.type === 'renderer') renderers += spent
    else if (process.type === 'GPU') gpu += spent
  }
  return { renderersMs: Math.round(renderers * 1000), gpuMs: Math.round(gpu * 1000) }
}

async function gameFrame(page: Page): Promise<Frame> {
  await expect
    .poll(() => page.frames().filter((frame) => frame !== page.mainFrame()).length)
    .toBeGreaterThan(0)
  return page.frames().find((frame) => frame !== page.mainFrame()) as Frame
}

/**
 * Memória JS e documentos vivos no processo da prévia, pela sessão de depuração do quadro em outro
 * processo. Os documentos pegam o quadro descartado que fica preso (revisão do lote 2: cada Parar
 * trocava o iframe e deixava um documento a mais).
 */
async function gameProcessMetrics(page: Page): Promise<{ heapMb: number; documents: number }> {
  const session = await page.context().newCDPSession(await gameFrame(page))
  try {
    await session.send('Performance.enable')
    await session.send('HeapProfiler.collectGarbage')
    const { metrics } = await session.send('Performance.getMetrics')
    const used = metrics.find((metric) => metric.name === 'JSHeapUsedSize')?.value ?? Number.NaN
    const documents = metrics.find((metric) => metric.name === 'Documents')?.value ?? Number.NaN
    return { heapMb: Math.round((used / 1024 / 1024) * 10) / 10, documents }
  } finally {
    await session.detach().catch(() => {})
  }
}

const preview = (page: Page) => page.frameLocator('iframe[title="Pré-visualização"]')

for (const game of GAMES)
  test(`liberação de recursos do ${game.engine}: ${game.name}`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Os processos vêm do protocolo de depuração do Chromium.')
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    const card = page
      .locator('button')
      .filter({ has: page.getByText(game.name, { exact: true }) })
      .first()
    if (game.twoD && !(await card.isVisible()))
      await page.getByRole('button', { name: 'Ver todos os jogos 2D' }).click()
    await card.click()
    await expect(page).toHaveURL(/\/editor\//, { timeout: 30_000 })
    await expect(preview(page).locator('canvas').first()).toBeVisible({ timeout: 90_000 })
    await page.waitForTimeout(1500)

    const browser = page.context().browser()
    if (!browser) throw new Error('Sem navegador para a sessão de depuração.')
    const session = await browser.newBrowserCDPSession()
    const run = page.locator('[data-live-target="studio-run"]')
    const stop = page.locator('[data-live-target="studio-stop"]')

    const firstRun = await gameProcessMetrics(page)
    const running = await cpuDuring(page, session, 2000)
    await stop.click()
    await expect(preview(page).locator('canvas')).toHaveCount(0, { timeout: 30_000 })
    await page.waitForTimeout(1000)
    const stopped = await cpuDuring(page, session, 2000)
    const renderersAfterFirstStop = (await processes(session)).filter(
      (item) => item.type === 'renderer',
    ).length
    const framesAfterFirstStop = page.frames().length
    // Documentos no processo da prévia com o jogo PARADO (o documento em branco): com o jogo
    // rodando, um motor pode ter um documento passageiro (o 3D Avançado mostrou um a mais no meio
    // da execução, sem memória a mais), e o que interessa é o que sobra dos descartados.
    const documentsAfterFirstStop = (await gameProcessMetrics(page)).documents

    let tenthRun = { heapMb: Number.NaN, documents: Number.NaN }
    for (let cycle = 1; cycle <= 10; cycle++) {
      await run.click()
      await expect(preview(page).locator('canvas').first()).toBeVisible({ timeout: 90_000 })
      if (cycle === 10) {
        await page.waitForTimeout(1500)
        tenthRun = await gameProcessMetrics(page)
      }
      await stop.click()
      await expect(preview(page).locator('canvas')).toHaveCount(0, { timeout: 30_000 })
    }
    await page.waitForTimeout(1000)
    const renderersAfterTenCycles = (await processes(session)).filter(
      (item) => item.type === 'renderer',
    ).length
    const framesAfterTenCycles = page.frames().length
    const documentsAfterTenCycles = (await gameProcessMetrics(page)).documents

    const row = {
      engine: game.engine,
      game: game.name,
      cpuTwoSecondsRunning: running,
      cpuTwoSecondsStopped: stopped,
      framesAfterFirstStop,
      framesAfterTenCycles,
      renderersAfterFirstStop,
      renderersAfterTenCycles,
      gameHeapMb: { firstRun: firstRun.heapMb, tenthRun: tenthRun.heapMb },
      gameProcessDocumentsStopped: {
        afterFirstStop: documentsAfterFirstStop,
        afterTenCycles: documentsAfterTenCycles,
      },
    }
    rows.push(row)
    console.log(JSON.stringify(row))
    mkdirSync(dirname(OUTPUT), { recursive: true })
    writeFileSync(
      OUTPUT,
      `${JSON.stringify(
        {
          commit: process.env.GITHUB_SHA ?? null,
          measuredAt: new Date().toISOString(),
          browser: browser.version(),
          note: 'CPU sem o processo do navegador e sem o serviço de áudio (o Blockly do editor mantém AudioContext próprios).',
          rows,
        },
        null,
        2,
      )}\n`,
    )

    // O jogo parado não gasta: a CPU da prévia e da GPU cai a menos de um quarto da que gastava
    // rodando (com um piso para o ruído do próprio editor, maior num runner lento).
    expect(stopped.renderersMs).toBeLessThan(Math.max(100, running.renderersMs / 4))
    expect(stopped.gpuMs).toBeLessThan(Math.max(30, running.gpuMs / 4))
    // Dez ciclos não deixam documento para trás: a página tem os mesmos quadros do 1º Parar.
    expect(framesAfterTenCycles).toBe(framesAfterFirstStop)
    // Nenhum documento descartado fica preso no processo da prévia.
    expect(documentsAfterTenCycles).toBeLessThanOrEqual(documentsAfterFirstStop)
    // Cada Rodar é um documento novo: o 10º abaixo de 1,5 vez o 1º, mais 1 MB de folga.
    expect(tenthRun.heapMb).toBeLessThan(firstRun.heapMb * 1.5 + 1)
  })
