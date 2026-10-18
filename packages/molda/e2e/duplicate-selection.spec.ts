import { expect, type Locator, test } from '@playwright/test'
import sharp from 'sharp'
import { COPY } from '../src/core/copy'
import { addScenePrimitive } from '../src/scene/commands'
import { createSceneProject } from '../src/scene/createProject'
import { sceneToJson } from '../src/scene/documentJson'
import { flipSceneNodes } from '../src/scene/flipNodes'

/** Exclude floating HTML controls: their yellow frame button is not a 3D outline. */
async function outline(canvas: Locator): Promise<{ pixels: number; centerX: number }> {
  const screenshot = await canvas.screenshot()
  const dimensions = await sharp(screenshot).metadata()
  if (!dimensions.width || !dimensions.height) throw new Error('Missing canvas dimensions')
  const { data, info } = await sharp(screenshot)
    .extract({
      left: 0,
      top: Math.ceil(dimensions.height * 0.27),
      width: dimensions.width,
      height: Math.floor(dimensions.height * 0.6),
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  let count = 0,
    sumX = 0
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i]! > 220 && data[i + 1]! > 140 && data[i + 1]! < 220 && data[i + 2]! < 70) {
      count++
      sumX += (i / info.channels) % info.width
    }
  }
  return { pixels: count, centerX: count ? sumX / count / info.width : 0 }
}

const outlinePixels = async (canvas: Locator) => (await outline(canvas)).pixels

for (const kind of ['box', 'cylinder'] as const) {
  for (const axis of ['original', 'x', 'y', 'z'] as const) {
    for (const mode of ['piece', 'edges'] as const) {
      test(`${mode} selection contour survives duplication of ${kind}, orientation ${axis}`, async ({
        page,
        browserName,
      }, info) => {
        test.skip(
          mode === 'edges' && browserName === 'webkit' && process.platform === 'win32',
          'Windows WebKit loses software-composited WebGL after buffer resize: microsoft/playwright#42885. Covered on Linux WebKit.',
        )
        const browserErrors: string[] = []
        page.on('pageerror', (error) => browserErrors.push(error.message))
        let source = addScenePrimitive(
          createSceneProject({ kind: 'empty', name: `Contorno ${kind} ${axis}` }),
          kind,
          'peça',
        )
        if (axis !== 'original') source = flipSceneNodes(source, [source.nodes[0]!.id], axis, true)
        await page.goto('/?nivel=god')
        await page.getByLabel(COPY.gallery.importJson, { exact: true }).setInputFiles({
          name: 'contorno.molda.json',
          mimeType: 'application/json',
          buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
        })
        await page
          .getByRole('button', { name: COPY.a11y.assetCard(source.name, 'Modelo'), exact: true })
          .click()
        const canvas = page.locator(
          `canvas[aria-label="${COPY.scene.viewport}"], canvas[aria-label="${COPY.scene.componentViewport}"]`,
        )
        const select = (name: string) =>
          page.getByRole('button', { name: COPY.scene.select(name), exact: true })
        await select('peça').click()
        await expect.poll(() => outlinePixels(canvas)).toBeGreaterThan(100)
        await page.getByRole('button', { name: COPY.scene.duplicate, exact: true }).click()
        await expect(select('peça (cópia)')).toHaveAttribute('aria-pressed', 'true')
        await expect.poll(() => outlinePixels(canvas)).toBeGreaterThan(100)
        await select('peça').click()
        await expect(select('peça (cópia)')).toHaveAttribute('aria-pressed', 'false')
        await expect.poll(() => outlinePixels(canvas)).toBeGreaterThan(100)
        const originalCenter = (await outline(canvas)).centerX
        await select('peça (cópia)').click()
        await expect(select('peça')).toHaveAttribute('aria-pressed', 'false')
        await expect.poll(() => outlinePixels(canvas)).toBeGreaterThan(100)
        // A stale contour on the original must not satisfy the pixel assertion.
        await expect
          .poll(async () => (await outline(canvas)).centerX)
          .toBeGreaterThan(originalCenter + 0.1)
        if (mode === 'edges') {
          await page.getByRole('button', { name: COPY.scene.editFaces, exact: true }).click()
          await page.getByRole('button', { name: 'Linhas', exact: true }).click()
          const panel = page.locator('.mld-component-root')
          await panel
            .getByRole('button', { name: COPY.scene.componentAll.edge, exact: true })
            .click()
          await canvas.screenshot({ path: info.outputPath('selected-copy-edges.png') })
          await expect.poll(() => outlinePixels(canvas)).toBeGreaterThan(100)
        }
        expect(browserErrors).toEqual([])
      })
    }
  }
}
