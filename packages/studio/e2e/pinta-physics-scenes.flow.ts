import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

const root = resolve(import.meta.dirname, '../../..')
const directory = resolve(root, '.tmp/pinta-physics-e2e')
test.beforeAll(() => {
  execFileSync(
    'bun',
    [resolve(root, 'packages/pinta/scripts/homologacao/physics.ts'), directory, '--objects'],
    {
      cwd: root,
    },
  )
  execFileSync(
    'bun',
    [
      resolve(root, 'packages/pinta/scripts/homologacao/platforms.ts'),
      resolve(directory, 'platforms'),
    ],
    { cwd: root },
  )
})

test('plataforma precisa: salvar, reabrir, pousar e pular no teste lateral', async ({
  page,
  isMobile,
}, info) => {
  await page.goto(`/?namespace=platforms-${Date.now()}`)
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(resolve(directory, 'platforms/platforms.pinta.json'))
  const open = page.getByRole('button', { name: 'Abrir plataformas-precisas (Mapa)', exact: true })
  await open.click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.reload()
  await open.click()
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  await page.getByRole('button', { name: 'Testar com personagem', exact: true }).click()
  const dialog = page.getByRole('dialog'),
    canvas = dialog.locator('canvas')
  await dialog.getByRole('button', { name: 'Vista de lado', exact: true }).click()
  const feet = () =>
    canvas.evaluate((c: HTMLCanvasElement) => {
      const bytes = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
      let bottom = -1
      for (let i = 0; i < bytes.length; i += 4)
        if (bytes[i] === 37 && bytes[i + 1] === 99 && bytes[i + 2] === 235 && bytes[i + 3] === 255)
          bottom = Math.max(bottom, Math.floor(i / 4 / c.width))
      return bottom
    })
  await expect.poll(feet).toBeGreaterThan(37)
  await page.waitForTimeout(400)
  const resting = await feet()
  expect(resting).toBeLessThanOrEqual(40)
  const jump = dialog.getByRole('button', { name: 'Pular', exact: true })
  await jump.dispatchEvent('pointerdown', { pointerId: 1 })
  await expect.poll(feet).toBeLessThan(32)
  await jump.dispatchEvent('pointerup', { pointerId: 1 })
  await expect.poll(feet).toBeGreaterThan(37)
  await page.waitForTimeout(300)
  const landed = await feet()
  expect(landed).toBeLessThanOrEqual(40)
  await info.attach('plataforma-editor', {
    body: JSON.stringify({ resting, landed, isMobile }),
    contentType: 'application/json',
  })
  await info.attach('plataforma-editor-imagem', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
})

test('contornos autorais: editar colisão, desfazer, refazer e reabrir', async ({
  page,
  isMobile,
}, info) => {
  await page.goto(`/?namespace=object-physics-${Date.now()}`)
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(resolve(directory, 'contornos-do-cenario.pinta.json'))
  const open = page.getByRole('button', { name: 'Abrir contornos-do-cenario (Mapa)', exact: true })
  await open.click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  await page.getByRole('button', { name: 'Objetos', exact: true }).click()
  await page.getByRole('button', { name: 'Escolher o objeto Elipse', exact: true }).click()
  const collision = page.getByRole('checkbox', {
    name: 'Impede o personagem de passar',
    exact: true,
  })
  await expect(collision).toBeChecked()
  await collision.uncheck()
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await expect(collision).toBeChecked()
  await page.getByRole('button', { name: 'Refazer', exact: true }).click()
  await expect(collision).not.toBeChecked()
  await collision.check()
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.reload()
  await open.click()
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  await page.getByRole('button', { name: 'Objetos', exact: true }).click()
  await page.getByRole('button', { name: 'Escolher o objeto Elipse', exact: true }).click()
  await expect(collision).toBeChecked()
  await info.attach('contornos-autoria', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
})

test('o personagem para na peça fina de um conjunto, salva e reabre o mapa sem alterar o formato', async ({
  page,
  isMobile,
}, testInfo) => {
  await page.goto(`/?namespace=physics-${Date.now()}`)
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(resolve(directory, 'geometria-fisica.pinta.json'))
  const open = page.getByRole('button', { name: 'Abrir geometria-fisica (Mapa)', exact: true })
  await open.click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.reload()
  await open.click()
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  await page.getByRole('button', { name: 'Testar com personagem', exact: true }).click()
  const dialog = page.getByRole('dialog')
  const canvas = dialog.locator('canvas')
  await expect(canvas).toBeVisible()
  const heroX = () =>
    canvas.evaluate((c: HTMLCanvasElement) => {
      const bytes = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
      let sum = 0,
        count = 0
      for (let i = 0; i < bytes.length; i += 4)
        if (
          bytes[i] === 37 &&
          bytes[i + 1] === 99 &&
          bytes[i + 2] === 235 &&
          bytes[i + 3] === 255
        ) {
          sum += (i / 4) % c.width
          count++
        }
      return count ? sum / count : -1
    })
  await expect.poll(heroX).toBeGreaterThan(0)
  const move = dialog.getByRole('button', { name: 'Andar para a direita', exact: true })
  await move.dispatchEvent('pointerdown', { pointerId: 1 })
  await expect.poll(heroX).toBeGreaterThan(30)
  // Keep walking long enough to cross the wall if only point samples were used.
  await page.waitForTimeout(650)
  const stopped = await heroX()
  await move.dispatchEvent('pointerup', { pointerId: 1 })
  expect(stopped).toBeGreaterThan(33)
  expect(stopped).toBeLessThan(36)
  await testInfo.attach('parede-fina', { body: await page.screenshot(), contentType: 'image/png' })
  await testInfo.attach('posicao', {
    body: JSON.stringify({ x: stopped, isMobile }),
    contentType: 'application/json',
  })
})
