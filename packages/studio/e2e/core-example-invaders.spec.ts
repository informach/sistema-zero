import { expect, type Page, test } from '@playwright/test'

/**
 * O exemplo do NÚCLEO "Invasores do Espaço (na mão)" abre pela vitrine com os
 * blocos renderizados (0 raw, contrato do fixture) e o preview roda com o
 * FUNDO por CSS resolvido (url('background.png') → data:URL do asset).
 */

async function expectBlocksVisibleInPanel(page: Page): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const panel = document.querySelector('.blocklySvg')
          if (!panel) return 'sem-svg'
          const panelRect = panel.getBoundingClientRect()
          const blocks = Array.from(
            document.querySelectorAll('.blocklyBlockCanvas .blocklyDraggable'),
          )
          if (blocks.length === 0) return 'sem-blocos'
          return blocks.some((el) => {
            const r = el.getBoundingClientRect()
            return (
              r.width > 0 &&
              r.height > 0 &&
              r.left < panelRect.right &&
              r.right > panelRect.left &&
              r.top < panelRect.bottom &&
              r.bottom > panelRect.top
            )
          })
            ? 'ok'
            : 'fora-da-viewport'
        }),
      { timeout: 15_000 },
    )
    .toBe('ok')
}

test.describe('Exemplo do núcleo — Invasores do Espaço (na mão)', () => {
  test('abre pela vitrine com blocos visíveis e fundo por CSS no preview', async ({ page }) => {
    const restoreFailures: string[] = []
    page.on('console', (message) => {
      const text = message.text()
      if (/blocksState|could not connect|Connection checks failed/i.test(text)) {
        restoreFailures.push(text)
      }
    })
    await page.goto('/')
    // Lista vazia (perfil e2e fresco): a vitrine É o onboarding.
    await page
      .getByRole('button', { name: /Invasores do Espaço \(na mão\)/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/editor\//, { timeout: 15_000 })

    await expectBlocksVisibleInPanel(page)

    // Regressão: a restauração abortava no primeiro `sz_val_arg` e deixava só
    // cerca de 15 blocos na tela. O exemplo completo tem centenas de nós.
    await expect
      .poll(() => page.locator('.blocklyBlockCanvas .blocklyDraggable').count(), {
        timeout: 15_000,
      })
      .toBeGreaterThan(100)
    await expect(
      page
        .locator('.blocklyBlockCanvas .blocklyDraggable')
        .filter({ hasText: 'parâmetro' })
        .first(),
    ).toBeAttached()

    // O CSS do iframe do preview resolve url('background.png') → data:URL.
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const iframe = document.querySelector('iframe')
            const srcdoc = iframe?.getAttribute('srcdoc') ?? ''
            if (!srcdoc) return 'sem-preview'
            if (srcdoc.includes('url("data:image/png;base64,')) return 'ok'
            if (srcdoc.includes("url('background.png')")) return 'nao-resolvido'
            return 'sem-css-de-fundo'
          }),
        { timeout: 15_000 },
      )
      .toBe('ok')

    // Nenhum bloco de código avançado no projeto do exemplo.
    const hasRaw = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.blocklyBlockCanvas .blocklyDraggable')).some((el) =>
        (el.textContent ?? '').includes('Código avançado'),
      ),
    )
    expect(hasRaw).toBe(false)
    expect(restoreFailures).toEqual([])
  })
})
