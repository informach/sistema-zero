import { expect, type Page, test } from '@playwright/test'
import { HEROI_DO_MOLDA_GLB } from '../src/official-extensions/game-3d/exampleAssets'

async function newProject(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
}

test('o botão do palco entra e sai da tela cheia sem perder o editor', async ({ page }) => {
  await newProject(page)
  const enter = page.getByRole('button', { name: 'Tela cheia', exact: true })
  await enter.click()
  await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true)
  await page.getByRole('button', { name: 'Sair da tela cheia', exact: true }).click()
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true)
  await expect(enter).toBeVisible()
  await expect(page.getByRole('button', { name: 'Blocos', exact: true })).toBeVisible()
})

test('o modelo do Molda ganha uma miniatura WebGL e continua reconhecível ao reabrir', async ({
  page,
}, testInfo) => {
  await newProject(page)
  await page.getByRole('button', { name: 'Mais opções' }).click()
  await page.getByRole('menuitem', { name: 'Mais blocos', exact: true }).click()
  const kit = page.getByRole('listitem').filter({
    has: page.getByText('Jogo 3D Avançado', { exact: true }),
  })
  await kit.getByRole('button', { name: 'Pôr no meu jogo', exact: true }).click()
  await expect(kit.getByText('No meu jogo', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  const openModels = async () => {
    await page.getByRole('button', { name: 'Mais opções' }).click()
    await page.getByRole('menuitem', { name: 'Modelos 3D', exact: true }).click()
  }
  await openModels()
  await page.locator('input[accept=".glb,.hdr"]').setInputFiles({
    name: 'heroi.glb',
    mimeType: 'model/gltf-binary',
    buffer: Buffer.from(HEROI_DO_MOLDA_GLB.split(',')[1]!, 'base64'),
  })
  const image = page.locator('img[title="Modelo .glb"]')
  await expect(image).toBeVisible()
  await expect(image).toHaveJSProperty('naturalWidth', 96)
  // Observa a imagem entregue à criança: não basta ter um PNG transparente de 96 px.
  const painted = await image.evaluate((element: HTMLImageElement) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 96
    const context = canvas.getContext('2d')!
    context.drawImage(element, 0, 0)
    const pixels = context.getImageData(0, 0, 96, 96).data
    let left = 96,
      top = 96,
      right = -1,
      bottom = -1
    for (let y = 0; y < 96; y++)
      for (let x = 0; x < 96; x++) {
        if (pixels[(y * 96 + x) * 4 + 3]! <= 16) continue
        left = Math.min(left, x)
        right = Math.max(right, x)
        top = Math.min(top, y)
        bottom = Math.max(bottom, y)
      }
    return { width: right - left + 1, height: bottom - top + 1 }
  })
  // O herói tem braços/pernas finos: a área pintada não mede o enquadramento.
  expect(Math.max(painted.width, painted.height)).toBeGreaterThan(65)
  expect(Math.min(painted.width, painted.height)).toBeGreaterThan(0)
  await page.screenshot({ path: testInfo.outputPath('miniatura-modelo.png') })
  await page.keyboard.press('Escape')
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible()
  await page.reload()
  await openModels()
  await expect(image).toBeVisible()
  await expect(image).toHaveJSProperty('naturalWidth', 96)
})
