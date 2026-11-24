import { expect, test } from '@playwright/test'
import { configurePreviewInputDiagnostics } from './helpers/previewInputDiagnostics'

configurePreviewInputDiagnostics()

// Qualify the actual Chromium renderer/process arrangement, not headless-shell.
test.use({ channel: 'chromium' })

test('a carga leve conserva título e viewport do documento salvo', async ({ page }) => {
  await page.goto('/')
  await page
    .locator('button')
    .filter({ has: page.getByText('Vale Ensolarado (na mão)', { exact: true }) })
    .first()
    .click()
  await expect(page).toHaveURL(/\/editor\//)
  const preview = page.frameLocator('iframe[title="Pré-visualização"]')
  await expect(preview.locator('canvas').first()).toBeVisible()
  // Observe the completed opening, including the existing source debounce.
  await page.waitForTimeout(2000)
  const metadata = await preview.locator('body').evaluate(() => ({
    title: document.title,
    viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content'),
  }))
  expect(metadata).toEqual({
    title: 'Vale Ensolarado',
    viewport: 'width=device-width, initial-scale=1.0',
  })
})

for (const width of [390, 1280]) {
  for (const example of ['Desvie dos blocos', 'Duelo de Heróis', 'Vale Ensolarado (na mão)']) {
    test(`${example}: hidratação preserva o jogo e recursos em ${width}px`, async ({ page }) => {
      const documents: number[] = []
      page.on('console', (message) => {
        const prefix = 'sz-preview-document:'
        const text = message.text()
        if (!text.startsWith(prefix)) return
        const size = Number(text.slice(prefix.length))
        if (Number.isSafeInteger(size) && size >= 0) documents.push(size)
      })
      await page.addInitScript(() => {
        if (window !== window.top) return
        const record = (frame: HTMLIFrameElement) => {
          if (frame.title === 'Pré-visualização')
            console.debug(`sz-preview-document:${frame.srcdoc.length}`)
        }
        new MutationObserver((records) => {
          for (const mutation of records) {
            if (mutation.type === 'attributes' && mutation.target instanceof HTMLIFrameElement)
              record(mutation.target)
            for (const node of mutation.addedNodes) {
              if (!(node instanceof Element)) continue
              if (node instanceof HTMLIFrameElement) record(node)
              for (const frame of node.querySelectorAll('iframe')) record(frame)
            }
          }
        }).observe(document, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ['srcdoc'],
        })
      })
      await page.setViewportSize({ width, height: 844 })
      await page.goto('/')
      const card = page
        .locator('button')
        .filter({
          has: page.getByText(example, { exact: true }),
        })
        .first()
      if (!(await card.isVisible()))
        await page.getByRole('button', { name: 'Ver todos os jogos 2D' }).click()
      await card.click()
      await expect(page).toHaveURL(/\/editor\//)
      const gameTab = page.getByRole('tab', { name: 'Jogo', exact: true })
      if (await gameTab.isVisible()) await gameTab.click()
      const preview = page.frameLocator('iframe[title="Pré-visualização"]')
      await expect(preview.locator('canvas').first()).toBeVisible()
      // Deliberate observation window for ABSENCE of navigation after first load,
      // covering the existing 800ms source debounce. Not a readiness workaround.
      await page.waitForTimeout(2000)
      const changes = await page.evaluate(() => Reflect.get(window, 'sz-e2e-preview-input'))
      expect(
        documents.filter((size) => size > 54).length,
        JSON.stringify({ documents, changes }),
      ).toBe(1)
      if (example === 'Desvie dos blocos') {
        await expect(preview.getByRole('heading', { name: example })).toBeVisible()
        return
      }
      if (example !== 'Duelo de Heróis') return
      // Exercise a real resource change instead of relying on a spurious rewrite
      // that only inserted the generator's comment into an unchanged program.
      await page.getByRole('button', { name: 'Ponte', exact: true }).click()
      const codeTab = page.getByRole('tab', { name: 'Código', exact: true })
      if (width === 390) await codeTab.click()
      await page
        .getByRole('button', { name: /script\.js/ })
        .first()
        .click()
      await expect(preview.locator('canvas').first()).toBeAttached()
      // Switching editor modes has its own preview lifecycle. Observe resource
      // replacement only after the Bridge preview is running.
      const beforeFont = documents.length
      const input = page.locator('.monaco-editor textarea.inputarea').first()
      await input.focus()
      await input.press('Control+End')
      await input.press('Enter')
      await page.keyboard.type('SZGame2D.useFont("bungee");')
      if (await gameTab.isVisible()) await gameTab.click()
      await expect
        .poll(() => preview.locator('body').evaluate(() => Reflect.get(window, 'SZGameUIFont')?.id))
        .toBe('bungee')
      await expect
        .poll(() => documents.slice(beforeFont).filter((size) => size > 54).length)
        .toBe(1)
      expect(
        documents.slice(beforeFont - 1).every((size) => size > 54),
        JSON.stringify(documents),
      ).toBe(true)
      await expect(preview.locator('canvas').first()).toBeVisible()
      await expect
        .poll(() =>
          preview
            .locator('canvas')
            .first()
            .evaluate((node) => {
              if (!(node instanceof HTMLCanvasElement)) throw new Error('Canvas ausente')
              return node.getContext('2d')?.getImageData(0, 0, 1, 1).data[3]
            }),
        )
        .toBeGreaterThan(0)
    })
  }
}
