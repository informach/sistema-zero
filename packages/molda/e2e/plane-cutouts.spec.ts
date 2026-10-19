import { expect, type Locator, test } from '@playwright/test'
import sharp from 'sharp'
import { COPY } from '../src/core/copy'
import { sceneToJson } from '../src/scene/documentJson'
import { makeSceneCutoutPlane } from '../src/testing/sceneCutoutPlane'

/** Inspect the empty border, excluding floating controls and the pivot axes in the center. */
async function contourPixels(canvas: Locator) {
  const screenshot = await canvas.screenshot()
  const dimensions = await sharp(screenshot).metadata()
  const { data, info } = await sharp(screenshot)
    .extract({
      left: 0,
      top: Math.floor(dimensions.height! * 0.28),
      width: dimensions.width!,
      height: Math.floor(dimensions.height! * 0.48),
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  let count = 0
  for (let i = 0; i < data.length; i += info.channels) {
    const x = ((i / info.channels) % info.width) / info.width
    const y =
      (Math.floor(i / info.channels / info.width) + Math.floor(dimensions.height! * 0.28)) /
      dimensions.height!
    if (x > 0.36 && x < 0.64 && y > 0.25 && y < 0.72) continue
    const r = data[i]!,
      g = data[i + 1]!,
      b = data[i + 2]!
    if ((r > 220 && g > 140 && g < 220 && b < 70) || (b > r + 15 && b > g + 5 && r < 225)) count++
  }
  return count
}

for (const atlasBorder of [false, true])
  test(`cutout borders stay empty in model, paint and mesh editing; explicitly selected edges remain editable (atlas border: ${atlasBorder})`, async ({
    page,
  }, info) => {
    const source = makeSceneCutoutPlane(atlasBorder)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/?nivel=god')
    await page.locator('input[name="molda-backup"]').setInputFiles({
      name: 'plano.molda.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
    })
    await page.getByRole('button', { name: 'Modelo Plano vazado', exact: true }).click()
    await page.getByRole('button', { name: COPY.scene.select('Plano'), exact: true }).click()
    await page.getByRole('button', { name: COPY.scene.showGrid, exact: true }).click()
    const canvas = page.locator(
      `canvas[aria-label="${COPY.scene.viewport}"], canvas[aria-label="${COPY.scene.componentViewport}"]`,
    )
    await canvas.screenshot({ path: info.outputPath('modelar.png') })
    await expect.poll(() => contourPixels(canvas)).toBeLessThan(20)
    await page.getByRole('button', { name: COPY.scene.editFaces, exact: true }).click()
    await page.getByRole('button', { name: 'Linhas', exact: true }).click()
    await expect.poll(() => contourPixels(canvas)).toBeLessThan(20)
    await page.screenshot({ path: info.outputPath('cutout-edit.png') })
    const panel = page.locator('.mld-component-root')
    await panel.getByRole('button', { name: COPY.scene.componentAll.edge, exact: true }).click()
    await expect.poll(() => contourPixels(canvas)).toBeGreaterThan(100)
    await panel.getByRole('button', { name: COPY.scene.componentNone, exact: true }).click()
    await expect.poll(() => contourPixels(canvas)).toBeLessThan(20)
    await page.getByRole('button', { name: 'Voltar ao modelo', exact: true }).click()
    await expect.poll(() => contourPixels(canvas)).toBeLessThan(20)
    await page.getByRole('button', { name: 'Pintar', exact: true }).click()
    await expect.poll(() => contourPixels(canvas)).toBeLessThan(20)
    await page.screenshot({ path: info.outputPath('cutout-paint.png') })
    expect(errors).toEqual([])
  })
