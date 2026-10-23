import { expect, test } from '@playwright/test'
import { strToU8, zipSync } from 'fflate'
import { COPY } from '../src/core/copy'
import { GALLERY_SHELL_COPY } from '../src/core/galleryShellCopy'
import { GLTF_IMPORT_COPY } from '../src/core/gltfImportCopy'
import { NATIVE_IMPORT_COPY } from '../src/core/nativeImportCopy'
import { MOLDA_GALLERY_ZIP_ENTRY } from '../src/export/backupFormat'
import { galleryToJsonText } from '../src/export/projectJson'
import { sceneToJson } from '../src/scene/documentJson'
import { animatedScene } from '../src/testing/sceneAnimation'

for (const extension of ['molda.json', 'zip'] as const) {
  test(`gallery imports a ${extension} project and keeps 3D import inside the editor`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const source = { ...animatedScene(), name: 'Meu carrinho' }
    const json = JSON.stringify(sceneToJson(source))
    const buffer =
      extension === 'zip'
        ? Buffer.from(
            zipSync({
              [MOLDA_GALLERY_ZIP_ENTRY]: strToU8(galleryToJsonText([])),
              'projetos/carrinho.molda.json': strToU8(json),
            }),
          )
        : Buffer.from(json)
    await page.goto('/?nivel=god')
    await expect(page.getByRole('button', { name: 'Importar modelo', exact: true })).toHaveCount(0)
    const restore = page.getByRole('button', { name: 'Importar projeto', exact: true })
    await expect(restore).toBeEnabled()
    const fileChoice = page.waitForEvent('filechooser')
    await restore.click()
    await (await fileChoice).setFiles({
      name: `carrinho.${extension}`,
      mimeType: extension === 'zip' ? 'application/zip' : 'application/json',
      buffer,
    })
    const card = page.getByRole('button', {
      name: COPY.a11y.assetCard(source.name, 'Modelo'),
      exact: true,
    })
    await expect(card).toBeVisible()
    await page.reload()
    await expect(card).toBeVisible()
    await card.click()
    await expect(page.getByRole('region', { name: COPY.scene.title })).toBeVisible()
    const bring3d = page.getByRole('button', { name: NATIVE_IMPORT_COPY.open, exact: true })
    await expect(bring3d).toHaveText('Trazer 3D')
    await bring3d.click()
    const modelDialog = page.getByRole('dialog', { name: NATIVE_IMPORT_COPY.title })
    await expect(modelDialog.getByLabel(GLTF_IMPORT_COPY.choose)).toBeAttached()
    await modelDialog.getByRole('button', { name: NATIVE_IMPORT_COPY.close, exact: true }).click()
    await expect(bring3d).toBeFocused()
    expect(errors).toEqual([])
  })
}

test('project import stays in the lower gallery card on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?nivel=god')
  const header = page.locator('header[data-mld-band="creme"]')
  await expect(header.getByRole('button', { name: COPY.gallery.create, exact: true })).toBeVisible()
  await expect(header.getByRole('button', { name: 'Importar projeto', exact: true })).toHaveCount(0)
  const lowerCard = page.getByRole('region', { name: GALLERY_SHELL_COPY.savedDevice(0) })
  const restore = lowerCard.getByRole('button', { name: 'Importar projeto', exact: true })
  await restore.scrollIntoViewIfNeeded()
  await expect(restore).toBeVisible()
  const box = await restore.boundingBox()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(390)
  await page.screenshot({ path: '.cache/gallery-project-import-mobile.png', fullPage: true })
})

test('a 3D model selected as a project gives guidance without creating anything', async ({
  page,
}) => {
  await page.goto('/?nivel=god')
  await page.getByLabel(COPY.gallery.importJson, { exact: true }).setInputFiles({
    name: 'carro.gltf',
    mimeType: 'application/json',
    buffer: Buffer.from('{"asset":{"version":"2.0"},"scenes":[]}'),
  })
  await expect(page.getByText(COPY.gallery.importFailed, { exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await expect(page.getByText(COPY.gallery.empty, { exact: true })).toBeVisible()
})
