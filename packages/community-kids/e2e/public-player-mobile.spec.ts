import { devices, expect, test } from '@playwright/test'

test.use({ ...devices['Pixel 7'] })

test('controles automáticos do player móvel podem ser ocultados e reexibidos', async ({ page }) => {
  const id = '11111111-1111-4111-8111-111111111111'
  const now = Date.now()
  const project = {
    id,
    name: 'Meu primeiro jogo',
    createdAt: now,
    updatedAt: now,
    mode: 'blocks',
    files: {
      'index.html': '<!doctype html><html><body><h1>Meu primeiro jogo</h1></body></html>',
      'style.css': '',
      'script.js': '',
    },
    extraFiles: [],
    assets: [],
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: { start: [], events: [], loops: [] },
      extensions: [],
    },
    blocksState: { blocks: { languageVersion: 0, blocks: [] } },
    installedExtensions: [],
  }

  await page.route(`**/api/studio/play/${id}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'X-Author-Name': encodeURIComponent('Sofia') },
      body: JSON.stringify(project),
    })
  })

  await page.goto(`/jogar/${id}`)
  await expect(page.getByText('Meu primeiro jogo')).toBeVisible()

  const hideControls = page.getByRole('button', { name: 'Ocultar controles' })
  await expect(hideControls).toBeVisible()
  await hideControls.click()
  await expect(page.getByRole('button', { name: 'Mostrar controles' })).toBeVisible()

  await page.getByRole('button', { name: 'Mostrar controles' }).click()
  await expect(page.getByRole('button', { name: 'Ocultar controles' })).toBeVisible()
})
