import { expect, test } from '@playwright/test'
import { COPY } from '../src/core/copy'
import { sceneToJson } from '../src/scene/documentJson'
import { animatedScene } from '../src/testing/sceneAnimation'

test.use({ hasTouch: false, viewport: { width: 1440, height: 900 } })

test('timeline dragging, cancellation, collapse, resize and reopening preserve the scene and playhead', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/?nivel=explorer')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'timeline.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify(sceneToJson({ ...animatedScene(), name: 'Altura persistida' })),
    ),
  })
  const open = async () => {
    await page.getByRole('button', { name: 'Modelo Altura persistida', exact: true }).click()
    await page.getByRole('button', { name: 'Animar', exact: true }).click()
  }
  await open()
  await expect(page.getByText('Trouxe 1 criação de volta!', { exact: true })).toHaveCount(0, {
    timeout: 15000,
  })
  const separator = page.getByRole('separator', { name: 'Altura da linha do tempo' })
  const canvas = page.locator(`canvas[aria-label="${COPY.scene.viewport}"]`)
  const height = (value: number) =>
    expect(separator).toHaveAttribute('aria-valuenow', String(value))
  const drag = async (dy: number, cancel = false) => {
    const box = (await separator.boundingBox())!
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2
    expect(
      await separator.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
          ?.outerHTML
      }),
    ).toContain('mld-timeline-resizer')
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x, y + dy, { steps: 6 })
    if (cancel) await page.keyboard.press('Escape')
    await page.mouse.up()
  }
  await height(306)
  const original = (await canvas.boundingBox())!
  await drag(-80)
  await height(386)
  await expect.poll(async () => (await canvas.boundingBox())!.height).toBe(original.height - 80)
  await drag(-40, true)
  await height(386)
  await separator.dblclick()
  await height(306)
  await separator.dblclick()
  await height(60)
  await drag(-200)
  await height(260)
  await drag(180)
  await height(60)
  await separator.dblclick()
  await height(306)
  await drag(-80)
  await height(386)
  await expect(page.getByLabel(COPY.scene.animationSeconds, { exact: true })).toHaveValue('0')
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
  await page.reload()
  await open()
  await height(386)
  await page.setViewportSize({ width: 1024, height: 600 })
  await expect.poll(async () => (await canvas.boundingBox())!.height).toBeGreaterThanOrEqual(240)
  await page.setViewportSize({ width: 1440, height: 900 })
  await height(386)
  await expect.poll(async () => (await canvas.boundingBox())!.height).toBe(original.height - 80)
  await separator.press('Enter')
  await height(60)
  await separator.press('Enter')
  await height(306)
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
  expect(errors).toEqual([])
})
