import { expect, test } from '@playwright/test'
import sharp from 'sharp'
import { COPY } from '../src/core/copy'
import { addScenePrimitive } from '../src/scene/commands'
import { createSceneProject } from '../src/scene/createProject'
import { sceneToJson } from '../src/scene/documentJson'

test('imagem cria e aplica uma paleta de 32 cores no Molda', async ({ page }) => {
  const source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'paleta-imagem' }),
    'cylinder',
    'Cilindro',
  )
  const pixels = Buffer.from(Array.from({ length: 32 }, (_, i) => [i, 160, 255 - i]).flat())
  const png = await sharp(pixels, { raw: { width: 32, height: 1, channels: 3 } })
    .png()
    .toBuffer()

  await page.goto('/?nivel=god')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'paleta-imagem.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: 'Modelo paleta-imagem', exact: true }).click()
  await page.getByRole('button', { name: COPY.scene.select('Cilindro'), exact: true }).click()
  const panel = page.getByRole('region', { name: 'Ajustes do contexto' })
  await panel.getByText('Paletas: Arcade', { exact: true }).click()
  await panel.getByRole('button', { name: 'Cores de uma imagem' }).click()

  const dialog = page.getByRole('dialog', { name: 'Cores de uma imagem' })
  await dialog.locator('input[name="paletteImage"]').setInputFiles({
    name: 'cores.png',
    mimeType: 'image/png',
    buffer: png,
  })
  await expect(dialog.getByText('Cores encontradas: 32/32')).toBeVisible()
  await dialog.getByLabel('Nome da paleta').fill('Farol 32')
  await dialog.getByRole('button', { name: 'Criar e usar' }).click()

  await expect(panel.getByText('Paletas: Farol 32', { exact: true })).toBeVisible()
  await expect(panel.getByRole('option', { name: 'Farol 32' })).toBeAttached()
  const stored = await page.evaluate(() =>
    Object.keys(localStorage)
      .filter((key) => key.startsWith('molda:preferences:') && key.includes('scene.palettes'))
      .flatMap((key) => JSON.parse(localStorage.getItem(key) ?? '[]')),
  )
  expect(stored).toContainEqual(expect.objectContaining({ name: 'Farol 32' }))
  expect(stored.find((entry: { name: string }) => entry.name === 'Farol 32').colors).toHaveLength(
    33,
  )
})
