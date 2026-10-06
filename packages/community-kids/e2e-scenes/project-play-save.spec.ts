import { expect, type Page, test } from '@playwright/test'

/**
 * O jogo pronto não mexe o layout ao se guardar (04/10/2026). No clique que concluía o jogo, o
 * botão "Tentar guardar descoberta" entrava durante a espera do servidor e saía na resposta: a
 * linha de status descia 32px e, com o jogo ampliado, o PALCO encolhia e crescia de volta. A aula
 * de verdade do ensaio (`/lesson-video`) guarda a tentativa com 700ms de atraso de rede.
 */
type Shift = { value: number; nodes: string[] }

async function observarDeslocamentos(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __shifts: Shift[] }
    w.__shifts = []
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as Array<{
        value: number
        sources?: Array<{ node?: Element }>
      }>)
        w.__shifts.push({
          value: entry.value,
          nodes: (entry.sources ?? []).map((s) => s.node?.className?.toString() ?? '?'),
        })
    }).observe({ type: 'layout-shift' })
  })
}
const deslocamentos = (page: Page) =>
  page.evaluate(() => (window as unknown as { __shifts: Shift[] }).__shifts)

for (const ampliado of [false, true]) {
  test(`guardar o jogo pronto não desloca nada ${ampliado ? 'com o jogo ampliado' : 'na aula'}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto('/lesson-video')
    const canvas = page
      .frameLocator('iframe[title="Cadê Todo Mundo? (jogo pronto)"]')
      .locator('canvas')
    await expect(canvas).toBeVisible()
    if (ampliado) await page.getByRole('button', { name: 'Ampliar jogo' }).click()
    const palco = page.locator('.sz-project-play-stage')
    await expect(palco).toBeVisible()
    await page.waitForTimeout(500)
    await observarDeslocamentos(page)
    const antes = await palco.boundingBox()
    const tocar = async (x: number, y: number) => {
      const size = await canvas.evaluate((el) => ({ w: el.clientWidth, h: el.clientHeight }))
      await canvas.click({ position: { x: (x / 640) * size.w, y: (y / 360) * size.h } })
    }
    await tocar(137, 224)
    await tocar(310, 226)
    await tocar(483, 210)
    const status = page.locator('.sz-project-play-card p[role="status"]').last()
    await expect(status).toHaveText('Guardado.', { timeout: 10_000 })
    expect(await deslocamentos(page)).toEqual([])
    expect(await palco.boundingBox()).toEqual(antes)

    // Anti-vácuo: o observador enxerga um deslocamento de verdade (sem isto, um observador que
    // nunca dispara passaria no `toEqual([])` acima).
    await page.evaluate(() => {
      const card = document.querySelector('.sz-project-play-card')
      const empurra = document.createElement('div')
      empurra.style.height = '40px'
      card?.prepend(empurra)
    })
    await expect.poll(async () => (await deslocamentos(page)).length).toBeGreaterThan(0)
  })
}
