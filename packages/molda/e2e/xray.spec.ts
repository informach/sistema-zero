import { expect, type Locator, test } from '@playwright/test'
import sharp from 'sharp'
import { COPY } from '../src/core/copy'
import { addScenePrimitive } from '../src/scene/commands'
import { createSceneProject } from '../src/scene/createProject'
import { sceneToJson } from '../src/scene/documentJson'

test.use({ hasTouch: false, viewport: { width: 1440, height: 900 } })

/** Only the middle of the stage: floating bars, hover rings and the import toast stay out. */
async function pixels(canvas: Locator) {
  const screenshot = await canvas.screenshot()
  const { width, height } = await sharp(screenshot).metadata()
  return sharp(screenshot)
    .extract({
      left: Math.floor(width! * 0.15),
      top: Math.floor(height! * 0.12),
      width: Math.floor(width! * 0.7),
      height: Math.floor(height! * 0.72),
    })
    .removeAlpha()
    .raw()
    .toBuffer()
}

function changed(a: Buffer, b: Buffer) {
  let count = 0
  for (let i = 0; i < a.length; i += 3)
    if (
      Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!) >
      24
    )
      count++
  return count
}

test('Raio-X deixa ver através das peças e desligar devolve o mesmo quadro', async ({
  page,
}, info) => {
  const source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Raio' }),
    'box',
    'corpo',
  )
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('/?nivel=god')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'raio.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: 'Modelo Raio', exact: true }).click()
  const canvas = page.locator(`canvas[aria-label="${COPY.scene.viewport}"]`)
  await expect(canvas).toBeVisible()
  const xray = page.getByRole('button', { name: COPY.scene.xray, exact: true })
  await expect(xray).toBeEnabled()
  await expect.poll(async () => changed(await pixels(canvas), await pixels(canvas))).toBe(0)
  const before = await pixels(canvas)
  await canvas.screenshot({ path: info.outputPath('sem-raio-x.png') })

  await xray.click()
  await expect(xray).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => changed(before, await pixels(canvas))).toBeGreaterThan(500)
  await canvas.screenshot({ path: info.outputPath('com-raio-x.png') })

  await xray.click()
  await expect(xray).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(async () => changed(before, await pixels(canvas))).toBeLessThan(20)
  expect(errors).toEqual([])
})

test('no celular o Raio-X fica em Mais ajustes do palco, sem empurrar a barra', async ({
  page,
}) => {
  const source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Raio celular' }),
    'box',
    'corpo',
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?nivel=god')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'raio-celular.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: 'Modelo Raio celular', exact: true }).click()
  const settings = page.locator('summary').filter({ hasText: 'Mais ajustes do palco' })
  await expect(settings).toBeVisible()
  const stage = (await page.locator('.mld-stage-viewport').boundingBox())!
  const trigger = (await settings.boundingBox())!
  expect(trigger.x + trigger.width).toBeLessThanOrEqual(stage.x + stage.width)
  await settings.click()
  const xray = page.getByRole('button', { name: COPY.scene.xray, exact: true })
  await expect(xray).toHaveCount(1)
  await xray.click()
  await expect(xray).toHaveAttribute('aria-pressed', 'true')
})
