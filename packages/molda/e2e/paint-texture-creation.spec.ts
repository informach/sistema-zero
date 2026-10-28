import { expect, test } from '@playwright/test'
import { COPY } from '../src/core/copy'
import { SCENE_PAINT_COPY } from '../src/core/scenePaintCopy'
import { encodePng } from '../src/export/png'
import { openPainting, savedProject } from './paint-project'

test.use({ hasTouch: false, viewport: { width: 1440, height: 1000 } })

test('criar e importar textura na aba Pintar mantém densidade e pixels', async ({ page }, info) => {
  await openPainting(page)
  await page.getByRole('button', { name: COPY.scene.select('caixa') }).click()
  await page.getByRole('button', { name: 'Criar textura' }).click()
  const create = page.getByRole('dialog', { name: 'Criar textura' })
  await create.getByRole('combobox', { name: 'Densidade de pixels' }).selectOption('32')
  await create.getByRole('button', { name: 'Criar e aplicar' }).click()
  const first = await savedProject(page)
  expect(first.images.at(-1)?.texelsPerUnit).toBe(32)
  await expect(page.getByText(/Textura ativa:/)).toBeVisible()

  await page.getByRole('button', { name: SCENE_PAINT_COPY.useImage }).click()
  const imported = page.getByRole('dialog', { name: SCENE_PAINT_COPY.useImage })
  const small = new Uint8Array(16 * 16 * 4).fill(255)
  await imported.locator('input[type="file"]').setInputFiles({
    name: 'pequena.png',
    mimeType: 'image/png',
    buffer: Buffer.from(encodePng(small, 16, 16)),
  })
  await expect(imported.getByText('pequena.png · 16 × 16 pixels')).toBeVisible()
  await imported.getByRole('combobox', { name: 'Densidade de pixels' }).selectOption('32')
  await imported.getByRole('button', { name: 'Importar e aplicar' }).click()
  await expect(imported.getByRole('alert')).toContainText('imagem maior')
  const rgba = new Uint8Array(512 * 512 * 4)
  for (let i = 0; i < rgba.length; i += 4) rgba.set([234, 45, 78, 255], i)
  await imported.locator('input[type="file"]').setInputFiles({
    name: 'arte.png',
    mimeType: 'image/png',
    buffer: Buffer.from(encodePng(rgba, 512, 512)),
  })
  await expect(imported.getByText('arte.png · 512 × 512 pixels')).toBeVisible()
  await imported.getByRole('button', { name: 'Importar e aplicar' }).click()
  const second = await savedProject(page)
  expect(second.images).toHaveLength(first.images.length + 1)
  expect(second.images.at(-1)?.name).toBe('arte.png')
  expect(second.images.at(-1)?.texelsPerUnit).toBe(32)
  expect(second.images.at(-1)?.width).toBe(512)
  expect([...second.images.at(-1)!.layers[0]!.pixels.slice(0, 4)]).toEqual([234, 45, 78, 255])
  await page.screenshot({ path: info.outputPath('textura-importada.png') })
})
