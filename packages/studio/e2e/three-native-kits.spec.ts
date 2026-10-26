import { expect, test } from '@playwright/test'

for (const kind of ['teclado', 'toque'])
  test(`Jogo 3D nativo: Torre maluca termina e recomeça com ${kind}`, async ({ page }, info) => {
    await page.goto('/')
    await page
      .locator('button')
      .filter({ has: page.getByText('Torre maluca', { exact: true }) })
      .first()
      .click()
    const preview = page.frameLocator('iframe[title="Pré-visualização"]')
    const canvas = preview.locator('canvas')
    await expect(canvas).toBeVisible()
    const drop = preview.locator('[data-sz-kit-key="Space"]')
    await expect(drop).toBeVisible()
    // The first piece starts outside the base. Drop before it reaches the tower:
    // this exercises a real miss, the terminal screen and the clean factory replay.
    if (kind === 'teclado') await canvas.press('Space')
    else await drop.click()
    const retry = preview.getByRole('button', { name: 'Empilhar de novo', exact: true })
    await expect(retry).toBeVisible()
    await info.attach('layout', {
      body: JSON.stringify(
        await preview.locator('body').evaluate((el) => ({
          bodyHeight: el.getBoundingClientRect().height,
          fixedCanvas: getComputedStyle(el.querySelector('canvas')!).position,
        })),
      ),
      contentType: 'application/json',
    })
    // Fixed engine-owned scenes do not give the body a layout height. Capture
    // the actual viewport iframe, including the fixed canvas and terminal HUD.
    await info.attach('terminal', {
      body: await page.locator('iframe[title="Pré-visualização"]').screenshot(),
      contentType: 'image/png',
    })
    await retry.click()
    await expect(retry).toHaveCount(0)
    await expect(preview.locator('[data-sz-kit-controls]')).toHaveCount(1)
    await expect(preview.locator('canvas')).toHaveCount(1)
    await expect(preview.locator('.szr-layer')).toContainText('⭐ 0')
    await info.attach('restarted', {
      body: await page.locator('iframe[title="Pré-visualização"]').screenshot(),
      contentType: 'image/png',
    })
  })
