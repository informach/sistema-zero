import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, type Page, test } from '@playwright/test'

const root = resolve(import.meta.dirname, '../../..')
let seed: string
type Backup = {
  version: number
  assets: Array<{ id: string; name: string; kind: string; layers?: unknown[]; schema?: number }>
}

test.beforeAll(() => {
  seed = execFileSync(
    'bun',
    [
      '--no-env-file',
      '-e',
      `
    import { vilaEFloresta } from './packages/pinta/scripts/homologacao/fixture';
    import { galleryToPintaJson } from './packages/pinta/src/export/projectJson';
    const fixture = vilaEFloresta();
    fixture.map.physics = 'precise'; fixture.cabana.physics = 'precise';
    console.log(galleryToPintaJson(fixture.assets));
  `,
    ],
    { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 },
  )
})

async function backup(page: Page) {
  await page.getByRole('button', { name: 'Baixar', exact: true }).click()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Desenho editável (.pinta.json)', exact: true }).click()
  const path = await (await pending).path()
  if (!path) throw new Error('Arquivo editável não foi gravado')
  const raw = await readFile(path, 'utf8')
  await page.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).last().click()
  return {
    content: JSON.parse(raw) as Backup,
    sha256: createHash('sha256').update(raw).digest('hex'),
  }
}

test('arquivo editável: Vila e cabana completas, restauro e reabertura sem perda', async ({
  page,
  browser,
}, info) => {
  test.setTimeout(90000)
  await page.goto(`/?namespace=native-world-${info.project.name}-${Date.now()}`)
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'mundo.pinta.json',
      mimeType: 'application/json',
      buffer: Buffer.from(seed),
    })
  const open = page.getByRole('button', { name: 'Abrir vila-e-floresta (Mapa)', exact: true })
  await open.click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  const before = await backup(page)
  expect(before.content.version).toBe(7)
  expect(before.content.assets.map((a) => a.name).sort()).toEqual(
    (JSON.parse(seed) as Backup).assets.map((a) => a.name).sort(),
  )
  expect(before.content.assets).toHaveLength(6)
  expect(before.content.assets.find((a) => a.name === 'vila-e-floresta')?.layers).toHaveLength(18)
  expect(before.content.assets.filter((a) => a.kind === 'tilemap').map((a) => a.schema)).toEqual([
    7, 7,
  ])

  await page.reload()
  await open.click()
  const after = await backup(page)
  expect(after.sha256).toBe(before.sha256)

  // A separate browser context restores the actual downloaded cohort through the UI.
  const context = await browser.newContext(info.project.use)
  try {
    const restored = await context.newPage()
    await restored.goto(`/?namespace=native-world-restored-${info.project.name}-${Date.now()}`)
    await restored
      .locator('input[type=file]')
      .first()
      .setInputFiles({
        name: 'mundo-restaurado.pinta.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(before.content)),
      })
    await expect(
      restored.getByRole('button', { name: 'Abrir vila-e-floresta (Mapa)', exact: true }),
    ).toBeVisible()
    await restored.getByRole('button', { name: 'Abrir cabana (Mapa)', exact: true }).click()
    await expect(restored.getByRole('img', { name: 'Grade do mapa', exact: true })).toBeVisible()
    const cabana = await backup(restored)
    expect(cabana.content.assets).toHaveLength(6)
    expect(
      cabana.content.assets
        .filter((a) => a.kind === 'tilemap')
        .map((a) => a.name)
        .sort(),
    ).toEqual(['cabana', 'vila-e-floresta'])
  } finally {
    await context.close()
  }
  await info.attach('mundo-editavel.json', {
    body: JSON.stringify({
      assets: before.content.assets.map((a) => ({ id: a.id, name: a.name, kind: a.kind })),
      sha256: before.sha256,
      reopenedSha256: after.sha256,
    }),
    contentType: 'application/json',
  })
})
