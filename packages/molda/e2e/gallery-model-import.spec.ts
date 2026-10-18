import { expect, test } from '@playwright/test'
import { COPY } from '../src/core/copy'
import { GLTF_IMPORT_COPY as copy } from '../src/core/gltfImportCopy'
import { NATIVE_IMPORT_COPY } from '../src/core/nativeImportCopy'
import { encodeSceneGlb } from '../src/export/sceneGlb'
import { makeSceneGlbFixture } from '../src/testing/sceneGlbFixture'

test('gallery import sits beside create, cancels cleanly, previews and persists a model before opening it', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/?nivel=god')
  const create = page.getByRole('button', { name: COPY.gallery.create, exact: true })
  const trigger = page.getByRole('button', { name: COPY.gallery.importModel, exact: true })
  await expect(trigger).toBeEnabled()
  const createBox = await create.boundingBox()
  const importBox = await trigger.boundingBox()
  expect(createBox && importBox && Math.abs(createBox.y - importBox.y) < 2).toBe(true)
  // The shared platform token is 40 px with a mouse and 44 px for touch.
  const touch = await page.evaluate(() => matchMedia('(pointer: coarse)').matches)
  expect(importBox!.height).toBeGreaterThanOrEqual(touch ? 44 : 40)
  expect(Math.abs(importBox!.height - createBox!.height)).toBeLessThan(1)
  await page.screenshot({ path: '.cache/gallery-model-import-desktop.png', fullPage: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: COPY.gallery.importModel })
  await expect(dialog.getByLabel(copy.choose)).toBeAttached()
  await dialog.getByRole('button', { name: COPY.gallery.cancel, exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await expect(page.getByText(COPY.gallery.empty, { exact: true })).toBeVisible()

  await trigger.click()
  const bytes = encodeSceneGlb(makeSceneGlbFixture(2, 1, 3, 2), { allowLosses: true }).bytes
  await dialog.getByLabel(copy.choose).setInputFiles({
    name: 'carro.glb',
    mimeType: 'model/gltf-binary',
    buffer: Buffer.from(bytes),
  })
  await dialog.getByLabel(copy.scene).selectOption('0')
  await dialog.getByRole('button', { name: copy.prepare, exact: true }).click()
  await expect(dialog.getByText(copy.ready, { exact: true })).toBeVisible()
  await expect(dialog.getByText(COPY.gallery.importModelHint)).toBeVisible()
  const confirm = dialog.getByRole('button', { name: COPY.gallery.importModelConfirm })
  await expect(confirm).toBeDisabled()
  await dialog.getByLabel(copy.accept).check()
  await confirm.click()
  await expect(page.getByRole('region', { name: COPY.scene.title })).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('button', {
      name: COPY.a11y.assetCard(COPY.gallery.importedModelName, 'Modelo'),
    }),
  ).toBeVisible()
  expect(errors).toEqual([])
})

test('gallery import remains visible and inside the header on a narrow screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?nivel=god')
  const button = page.getByRole('button', { name: COPY.gallery.importModel, exact: true })
  await expect(button).toBeEnabled()
  const box = await button.boundingBox()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(390)
  await page.screenshot({ path: '.cache/gallery-model-import-mobile.png', fullPage: true })
})

for (const fixture of [
  {
    format: NATIVE_IMPORT_COPY.objFormat,
    name: 'triangle.obj',
    text: 'o Triangle\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n',
  },
  {
    format: NATIVE_IMPORT_COPY.bbmodelFormat,
    name: 'triangle.bbmodel',
    text: JSON.stringify({
      meta: { format_version: '5.0', model_format: 'free' },
      elements: [
        {
          uuid: 'triangle',
          type: 'mesh',
          name: 'Triangle',
          vertices: { a: [0, 0, 0], b: [1, 0, 0], c: [0, 1, 0] },
          faces: {
            face: {
              vertices: ['a', 'b', 'c'],
              texture: false,
              uv: { a: [0, 0], b: [1, 0], c: [0, 1] },
            },
          },
        },
      ],
      outliner: ['triangle'],
    }),
  },
]) {
  test(`gallery imports ${fixture.name} as a new persisted model`, async ({ page }) => {
    await page.goto('/?nivel=god')
    await page.getByRole('button', { name: COPY.gallery.importModel, exact: true }).click()
    const dialog = page.getByRole('dialog', { name: COPY.gallery.importModel })
    await dialog.getByRole('radio', { name: fixture.format, exact: true }).check()
    await dialog.getByLabel(copy.choose).setInputFiles({
      name: fixture.name,
      mimeType: 'application/octet-stream',
      buffer: Buffer.from(fixture.text),
    })
    await dialog.getByRole('button', { name: copy.prepare, exact: true }).click()
    await expect(dialog.getByText(copy.ready, { exact: true })).toBeVisible()
    await expect(dialog.getByText(copy.replace)).not.toBeVisible()
    await dialog.getByLabel(copy.accept).check()
    await dialog.getByRole('button', { name: COPY.gallery.importModelConfirm }).click()
    await expect(page.getByRole('region', { name: COPY.scene.title })).toBeVisible()
    await page.reload()
    await expect(
      page.getByRole('button', {
        name: COPY.a11y.assetCard(COPY.gallery.importedModelName, 'Modelo'),
      }),
    ).toBeVisible()
  })
}

test('an invalid model reports the error and cancellation leaves the gallery empty', async ({
  page,
}) => {
  await page.goto('/?nivel=god')
  await page.getByRole('button', { name: COPY.gallery.importModel, exact: true }).click()
  const dialog = page.getByRole('dialog', { name: COPY.gallery.importModel })
  await dialog.getByLabel(copy.choose).setInputFiles({
    name: 'invalid.glb',
    mimeType: 'model/gltf-binary',
    buffer: Buffer.from('invalid'),
  })
  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(
    dialog.getByRole('button', { name: COPY.gallery.importModelConfirm }),
  ).not.toBeVisible()
  await dialog.getByRole('button', { name: COPY.gallery.cancel, exact: true }).click()
  await page.reload()
  await expect(page.getByText(COPY.gallery.empty, { exact: true })).toBeVisible()
})
