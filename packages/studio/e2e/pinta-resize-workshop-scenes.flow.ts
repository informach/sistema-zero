import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { COPY } from '../../pinta/src/core/copy'
import { createPixelBackgroundAsset } from '../../pinta/src/core/project'
import { galleryToPintaJson, importPintaJson } from '../../pinta/src/export/projectJson'

test('tamanho na oficina: centralizar pixels, desfazer/refazer, salvar e reabrir', async ({
  page,
  isMobile,
}, info) => {
  const asset = createPixelBackgroundAsset({ name: 'qa-tamanho', width: 32, height: 32 })
  asset.cels[0]!.data.fill(1)
  const cdp = await page.context().newCDPSession(page),
    cpu = Number(info.project.metadata.cpuSlowdown ?? 1)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
  const press = async (name: string) => {
    const b = page.getByRole('button', { name, exact: true })
    if (isMobile) await b.tap()
    else await b.click()
  }
  await page.goto(`/?namespace=resize-workshop-${crypto.randomUUID()}`)
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'qa-tamanho.pinta.json',
      mimeType: 'application/json',
      buffer: Buffer.from(galleryToPintaJson([asset])),
    })
  const open = page.getByRole('button', { name: /^Abrir qa-tamanho / })
  await open.click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  await press(COPY.editor.resize.button(32, 32))
  await page.getByLabel(COPY.newAsset.customSize.width, { exact: true }).fill('64')
  await press(COPY.editor.resize.apply)
  await expect(
    page.getByRole('button', { name: COPY.editor.resize.button(64, 32), exact: true }),
  ).toBeVisible()
  await press(COPY.editor.undo)
  await expect(
    page.getByRole('button', { name: COPY.editor.resize.button(32, 32), exact: true }),
  ).toBeVisible()
  await press(COPY.editor.redo)
  await press(COPY.editor.back)
  await expect(page.getByRole('button', { name: 'Criar novo', exact: true })).toBeVisible()
  await page.reload()
  await open.click()
  await expect(
    page.getByRole('button', { name: COPY.editor.resize.button(64, 32), exact: true }),
  ).toBeVisible()
  await press('Baixar')
  const downloaded = page.waitForEvent('download')
  await press('Desenho editável (.pinta.json)')
  const file = await (await downloaded).path()
  if (!file) throw Error('Backup ausente')
  const content = await readFile(file, 'utf8'),
    restored = importPintaJson(content).assets.find((a) => a.kind === 'pixel-background')
  if (restored?.kind !== 'pixel-background') throw Error('Arte ausente')
  expect(restored.cels[0]!.width).toBe(64)
  expect(restored.cels[0]!.data[0]).toBe(0)
  expect(restored.cels[0]!.data[16]).toBe(1)
  expect(restored.cels[0]!.data[47]).toBe(1)
  expect(restored.cels[0]!.data[48]).toBe(0)
  await info.attach('backup', { body: content, contentType: 'application/json' })
  await info.attach('oficina', { body: await page.screenshot(), contentType: 'image/png' })
  await cdp.detach()
})
