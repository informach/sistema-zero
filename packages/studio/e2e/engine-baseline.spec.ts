import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { type CDPSession, expect, type Page, test } from '@playwright/test'

/**
 * Linha de base da etapa 0 (plano de 20/11): um jogo de cada motor JavaScript do Estúdio clássico,
 * medido do mesmo jeito: abrir (do clique no cartão até a prévia com tela), editar um campo de
 * número de um bloco (a maior tarefa longa da edição), rodar de novo (do Rodar até a tela do jogo)
 * e a memória JS da página depois de 10 ciclos de Parar e Rodar, com coleta de lixo forçada antes
 * de cada leitura. É registro, não teto: os números vão para o relatório com SHA e data.
 * Só no Chromium (a memória vem do protocolo de depuração dele).
 */

const GAMES = [
  { engine: 'Jogo 2D', name: 'Mini plataforma', twoD: true },
  { engine: 'Jogo 2D Avançado', name: 'Meu primeiro jogo', twoD: false },
  { engine: 'Jogo 3D', name: 'Cubo girando', twoD: false },
  { engine: 'Mundo 3D', name: 'Meu Mundo', twoD: false },
  { engine: 'Jogo 3D Avançado', name: 'Defesa da Torre Profissional', twoD: false },
] as const

const OUTPUT = resolve(
  process.env.STUDIO_ENGINE_BASELINE_OUTPUT ?? '.cache/mission/engine-baseline.json',
)
const rows: unknown[] = []

async function heapAfterGc(session: CDPSession): Promise<number> {
  await session.send('HeapProfiler.collectGarbage')
  const { metrics } = await session.send('Performance.getMetrics')
  return metrics.find((metric) => metric.name === 'JSHeapUsedSize')?.value ?? Number.NaN
}

async function longestTaskDuring(page: Page, action: () => Promise<void>): Promise<number> {
  await page.evaluate(() => {
    const target = window as unknown as { __szTasks?: number[]; __szObserver?: PerformanceObserver }
    target.__szTasks = []
    target.__szObserver?.disconnect()
    target.__szObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) target.__szTasks?.push(entry.duration)
    })
    target.__szObserver.observe({ type: 'longtask' })
  })
  await action()
  await page.waitForTimeout(500)
  return page.evaluate(() => {
    const target = window as unknown as { __szTasks?: number[]; __szObserver?: PerformanceObserver }
    target.__szObserver?.disconnect()
    return Math.max(0, ...(target.__szTasks ?? []))
  })
}

async function canvasShown(page: Page, timeout: number) {
  const preview = page.frameLocator('iframe[title="Pré-visualização"]')
  await expect(preview.locator('canvas').first()).toBeVisible({ timeout })
}

for (const game of GAMES)
  test(`linha de base do ${game.engine}: ${game.name}`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'A memória vem do protocolo de depuração do Chromium.')
    test.setTimeout(240_000)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    const card = page
      .locator('button')
      .filter({ has: page.getByText(game.name, { exact: true }) })
      .first()
    if (game.twoD && !(await card.isVisible()))
      await page.getByRole('button', { name: 'Ver todos os jogos 2D' }).click()
    await expect(card).toBeVisible()
    const openedAt = Date.now()
    await card.click()
    await expect(page).toHaveURL(/\/editor\//, { timeout: 30_000 })
    await canvasShown(page, 90_000)
    const openMs = Date.now() - openedAt

    // O primeiro campo de número que está À VISTA na área de blocos (o primeiro da lista pode
    // estar fora dela, e um campo fora da área não recebe clique).
    const numbers = page
      .locator('svg.blocklySvg .blocklyBlockCanvas .blocklyEditableField')
      .filter({ hasText: /^-?\d+(?:[.,]\d+)?$/ })
    await numbers.first().waitFor({ state: 'attached', timeout: 30_000 })
    // À vista = o que a página tem de fato sob o centro do campo é o próprio campo (a área de
    // blocos passa por baixo do painel do jogo, então estar dentro da caixa dela não basta).
    const target = await page.evaluate(() => {
      const fields = document.querySelectorAll(
        'svg.blocklySvg .blocklyBlockCanvas .blocklyEditableField',
      )
      for (const element of fields) {
        if (!/^-?\d+(?:[.,]\d+)?$/.test(element.textContent ?? '')) continue
        const box = element.getBoundingClientRect()
        if (!box.width) continue
        const x = box.x + box.width / 2
        const y = box.y + box.height / 2
        if (document.elementFromPoint(x, y)?.closest('.blocklyEditableField') === element)
          return { x, y, text: element.textContent ?? '0' }
      }
      return null
    })
    if (!target) throw new Error('Nenhum campo de número à vista na área de blocos.')
    const field = target
    const before = Number(field.text.replace(',', '.'))
    const editLongestTaskMs = await longestTaskDuring(page, async () => {
      // O clique do mouse no centro do campo, como a criança faz: se algo cobrir o campo, o
      // editor de número não abre e o preenchimento abaixo falha.
      await page.mouse.click(field.x, field.y)
      await page.locator('input.blocklyHtmlInput').fill(String(before + 1))
      await page.keyboard.press('Enter')
    })

    const run = page.locator('[data-live-target="studio-run"]')
    const stop = page.locator('[data-live-target="studio-stop"]')
    const session = await page.context().newCDPSession(page)
    await session.send('Performance.enable')
    const heapBefore = await heapAfterGc(session)
    const runs: number[] = []
    for (let cycle = 0; cycle < 10; cycle++) {
      await stop.click()
      await expect(
        page.frameLocator('iframe[title="Pré-visualização"]').locator('canvas'),
      ).toHaveCount(0, {
        timeout: 30_000,
      })
      const startedAt = Date.now()
      await run.click()
      await canvasShown(page, 90_000)
      runs.push(Date.now() - startedAt)
    }
    const heapAfter = await heapAfterGc(session)
    const sorted = [...runs].sort((a, b) => a - b)
    const row = {
      engine: game.engine,
      game: game.name,
      openMs,
      editLongestTaskMs,
      runMs: { p50: sorted[4], p95: sorted[9], max: sorted[9], samples: runs },
      heapBeforeCyclesMb: Math.round((heapBefore / 1024 / 1024) * 10) / 10,
      heapAfterTenCyclesMb: Math.round((heapAfter / 1024 / 1024) * 10) / 10,
      errors,
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
          note: 'Página do editor; a memória do quadro do jogo não entra quando o Chromium o põe em outro processo.',
          rows,
        },
        null,
        2,
      )}\n`,
    )
    expect(errors).toEqual([])
  })
