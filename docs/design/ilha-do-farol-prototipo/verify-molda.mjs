import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const { chromium, expect } = createRequire(resolve('packages/molda/package.json'))(
  '@playwright/test',
)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1100 },
    acceptDownloads: true,
  })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('http://127.0.0.1:5198/?nivel=god')
  await page
    .locator('input[name="molda-backup"]')
    .setInputFiles(resolve('docs/design/ilha-do-farol-molda/ilha-do-farol-molda.zip'))
  for (const name of [
    'Mar',
    'Terreno e praia',
    'Ponte',
    'Coqueiro de trás',
    'Coqueiro da frente',
    'Vegetação pequena',
    'Farol',
    'Veleiro',
    'Pedras',
    'Aventureiro',
    'Chave',
    'Farol aceso',
    'Bancada das experiências',
    'Cena completa',
  ]) {
    await expect(
      page.getByRole('button', { name: `Modelo Ilha — ${name}`, exact: true }),
    ).toBeVisible({ timeout: 60000 })
  }
  console.log('PASS ZIP import: 14 named projects in gallery')
  await page.reload()
  for (const [label, slug] of [
    ['Pedras', 'pedras'],
    ['Aventureiro', 'aventureiro'],
    ['Cena completa', 'cena-completa'],
  ]) {
    await page.getByRole('button', { name: `Modelo Ilha — ${label}`, exact: true }).click()
    await expect(page.locator('summary').filter({ hasText: 'Salvar e exportar' })).toBeVisible({
      timeout: 60000,
    })
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `.cache/ilha-do-farol/molda-${slug}.png`, fullPage: true })
    await page.locator('summary').filter({ hasText: 'Salvar e exportar' }).click()
    const pending = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Baixar projeto', exact: true }).click()
    const download = await pending
    const restored = JSON.parse(await readFile(await download.path(), 'utf8'))
    const source = JSON.parse(
      await readFile(
        resolve(`docs/design/ilha-do-farol-molda/projetos/${slug}.molda.json`),
        'utf8',
      ),
    )
    for (const field of ['nodes', 'geometries', 'materials', 'images', 'mirrors'])
      expect(restored[field]).toEqual(source[field])
    console.log('PASS open and download lossless:', label)
    await page.goto('http://127.0.0.1:5198/?nivel=god')
  }
  expect(errors).toEqual([])
  console.log('PASS no browser errors')
} finally {
  await browser.close()
}
