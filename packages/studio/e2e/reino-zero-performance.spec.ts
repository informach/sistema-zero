import { expect, type Page, test } from '@playwright/test'

declare global {
  interface Window {
    __reinoZeroLongTasks?: Array<{ start: number; duration: number }>
  }
}

function reinoZeroCard(page: Page) {
  return page
    .locator('button')
    .filter({ has: page.getByText('Reino Zero', { exact: true }) })
    .first()
}

test('Reino Zero abre, programa e joga dentro dos orçamentos de desempenho', async ({ page }) => {
  await page.addInitScript(() => {
    window.__reinoZeroLongTasks = []
    if (!('PerformanceObserver' in window)) return
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__reinoZeroLongTasks?.push({ start: entry.startTime, duration: entry.duration })
        }
      })
      observer.observe({ type: 'longtask', buffered: true })
    } catch {
      // Firefox não oferece Long Tasks; este caso roda no projeto Chromium.
    }
  })

  await page.goto('/')
  const card = reinoZeroCard(page)
  if (!(await card.isVisible())) {
    await page.getByRole('button', { name: 'Ver todos os jogos 2D' }).click()
  }
  const openedAt = await page.evaluate(() => performance.now())
  await card.click()
  await expect(page).toHaveURL(/\/editor\//, { timeout: 15_000 })
  await expect
    .poll(() => page.locator('.blocklyBlockCanvas .blocklyDraggable').count(), {
      timeout: 15_000,
    })
    .toBeGreaterThan(1000)
  const preview = page.frameLocator('iframe[title="Pré-visualização"]')
  await expect(preview.locator('canvas')).toBeVisible({ timeout: 15_000 })

  const metrics = await page.evaluate((start) => {
    const tasks = (window.__reinoZeroLongTasks ?? []).filter((task) => task.start >= start)
    const iframe = document.querySelector('iframe[title="Pré-visualização"]')
    return {
      openMs: performance.now() - start,
      blocks: document.querySelectorAll('.blocklyBlockCanvas .blocklyDraggable').length,
      blocklyDomNodes: document.querySelectorAll('.blocklySvg *').length,
      srcdocBytes: new TextEncoder().encode(iframe?.getAttribute('srcdoc') ?? '').byteLength,
      maxLongTaskMs: Math.max(0, ...tasks.map((task) => task.duration)),
    }
  }, openedAt)

  const evidence = JSON.stringify(metrics)
  expect(metrics.blocks, evidence).toBeLessThanOrEqual(1600)
  expect(metrics.blocklyDomNodes, evidence).toBeLessThanOrEqual(20_000)
  // O runtime didático completo já ocupa a maior parte do srcdoc; este teto trava
  // o documento total sem confundir bytes de motor com custo de nós no Blockly.
  expect(metrics.srcdocBytes, evidence).toBeLessThanOrEqual(750_000)
  expect(metrics.openMs, evidence).toBeLessThanOrEqual(8_000)
  expect(metrics.maxLongTaskMs, evidence).toBeLessThanOrEqual(2_000)

  const firstBlock = page.locator('.blocklyBlockCanvas .blocklyDraggable').first()
  const box = await firstBlock.boundingBox()
  if (!box) throw new Error('nenhum bloco visível para medir o arrasto')
  const dragStartedAt = await page.evaluate(() => performance.now())
  await page.mouse.move(box.x + 12, box.y + 12)
  await page.mouse.down()
  await page.mouse.move(box.x + 52, box.y + 42, { steps: 3 })
  await page.mouse.up()
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
  const dragMs = await page.evaluate((start) => performance.now() - start, dragStartedAt)
  expect(dragMs).toBeLessThanOrEqual(1_200)
})
