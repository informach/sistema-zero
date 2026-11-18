import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { QA_PROFILE } from '../playground/pinta-integration/profile'
import type { PersonalAsset } from '../src/asset-library/personal'
import type { Project } from '../src/core/project'

const root = resolve(import.meta.dirname, '../../..')
const fixture = resolve(root, '.tmp/pinta-scenes-e2e/vila-e-floresta.pinta.json')
test.beforeAll(() =>
  execFileSync(
    'bun',
    [resolve(root, 'packages/pinta/scripts/homologacao/generate.ts'), resolve(fixture, '..')],
    { cwd: root },
  ),
)
const snapshot = async (page: Page): Promise<Project> =>
  JSON.parse((await page.getByTestId('qa-project').textContent()) ?? 'null')

test.beforeEach(async ({ context }) => {
  await context.route('**/api/**', (route) => route.abort('internetdisconnected'))
})

test('Pinta real cria jogo estruturado; atualização do cenário conserva a programação', async ({
  page,
  context,
}, info) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/pinta')
  await page.locator('input[type=file]').first().setInputFiles(fixture)
  await page.getByRole('button', { name: 'Abrir vila-e-floresta (Mapa)', exact: true }).click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  await page.getByRole('button', { name: 'Jogar meu mapa', exact: true }).click()
  await expect(page).toHaveURL(/\/estudio/)
  await expect
    .poll(async () => (await snapshot(page))?.assets?.find((a) => a.scene)?.scene?.layers.length)
    .toBe(18)
  await expect(page.locator('.blocklySvg').first()).toBeVisible()
  await page.getByRole('button', { name: 'Ponte', exact: true }).click()
  await page.getByRole('button', { name: 'Programa · script.js', exact: true }).click()
  const input = page.locator('.monaco-editor textarea.inputarea').first()
  await expect(input).toBeVisible()
  await input.focus()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.insertText('\nconst marcoPinta = 23;\n')
  await expect.poll(async () => (await snapshot(page)).files['script.js']).toContain('marcoPinta')
  // Wait for the real bridge parser to incorporate the edit before comparing snapshots.
  // It normalizes code/HTML and reconstructs blocks independently of any art update.
  await expect
    .poll(async () => JSON.stringify((await snapshot(page)).ir), { timeout: 15000 })
    .toContain('marcoPinta')
  await expect.poll(async () => Boolean((await snapshot(page)).bridgeCodeAhead)).toBe(false)
  const before = await snapshot(page)
  const map = before.assets!.find((a) => a.scene?.layers.length === 18)!
  const drawing = map.libId!.replace(/^personal:/, '')
  const edit = await context.newPage()
  await edit.goto(`/pinta?desenho=${encodeURIComponent(drawing)}`)
  await expect(edit.getByRole('button', { name: 'Chão', exact: true })).toBeVisible()
  const editTip = edit.getByRole('button', { name: 'Entendi!', exact: true })
  if (await editTip.isVisible()) await editTip.click()
  await edit.getByRole('button', { name: 'Chão', exact: true }).click()
  await edit.getByRole('button', { name: 'Borracha', exact: true }).click()
  const canvas = edit.getByRole('img', { name: 'Grade do mapa', exact: true })
  await canvas.evaluate((el) => el.scrollIntoView({ block: 'start', inline: 'start' }))
  await canvas.click({ position: { x: 8, y: 8 } })
  await expect(edit.getByText('Atualizado no Estúdio', { exact: true })).toBeVisible({
    timeout: 15000,
  })
  const canonical = await edit.evaluate(
    ({ profile, id }) =>
      new Promise<PersonalAsset>((resolve, reject) => {
        const request = indexedDB.open(`sistema-zero-personal-assets-${profile}`)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction('kv', 'readonly'),
            read = tx.objectStore('kv').get(`asset:${id}`)
          tx.oncomplete = () => {
            db.close()
            resolve(read.result)
          }
          tx.onerror = () => {
            db.close()
            reject(tx.error)
          }
        }
      }),
    { profile: QA_PROFILE, id: drawing },
  )
  const canonicalFloor = canonical.scene?.layers.find(
    (l) => l.kind === 'tiles' && l.name === 'Chão',
  )
  await info.attach('bridge-checkpoint', {
    body: JSON.stringify({
      id: drawing,
      projectRevision: map.libRevision,
      personalRevision: canonical.updatedAt,
      firstCells: canonicalFloor?.kind === 'tiles' ? canonicalFloor.cells.slice(0, 8) : null,
    }),
    contentType: 'application/json',
  })
  expect(canonicalFloor?.kind === 'tiles' ? canonicalFloor.cells[0] : null).toBe(-1)
  await page.bringToFront()
  // Headless Chromium keeps every page focused/visible. Reproduce the user's return event;
  // storage, the production watcher, reconciliation and the editor remain real.
  await page.evaluate(() => window.dispatchEvent(new FocusEvent('focus')))
  await expect
    .poll(
      async () => {
        const current = (await snapshot(page)).assets?.find((a) => a.id === map.id)?.scene
        const floor = current?.layers.find((l) => l.kind === 'tiles' && l.name === 'Chão')
        return floor?.kind === 'tiles' ? floor.cells[0] : null
      },
      { timeout: 10000 },
    )
    .toBe(-1)
  const after = await snapshot(page)
  expect(after.files).toEqual(before.files)
  expect(after.ir).toEqual(before.ir)
  expect(after.blocksState).toEqual(before.blocksState)
  expect(errors).toEqual([])
  await info.attach('studio-updated', { body: await page.screenshot(), contentType: 'image/png' })
})

test('editar as peças atualiza os mapas vinculados sem abrir ou editar o mapa', async ({
  page,
  context,
}, info) => {
  test.setTimeout(90000)
  await page.goto('/pinta')
  await page.locator('input[type=file]').first().setInputFiles(fixture)
  await page.getByRole('button', { name: 'Abrir vila-e-floresta (Mapa)', exact: true }).click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  await page.getByRole('button', { name: 'Jogar meu mapa', exact: true }).click()
  await expect(page).toHaveURL(/\/estudio/)
  await expect.poll(async () => Boolean((await snapshot(page))?.blocksState)).toBe(true)
  const before = await snapshot(page)
  const map = before.assets!.find((a) => a.scene?.layers.length === 18)!
  const tileset = map.scene!.tilesets.find((t) => t.name === 'terra-e-madeira')!
  expect(tileset.solid).not.toContain(0)
  const edit = await context.newPage()
  await edit.goto(`/pinta?desenho=${encodeURIComponent(tileset.id)}`)
  await edit.getByRole('button', { name: /^Mudar a colisão da peça/ }).click()
  await expect(edit.getByText('Atualizado no Estúdio', { exact: true })).toBeVisible({
    timeout: 15000,
  })
  await page.bringToFront()
  await page.evaluate(() => window.dispatchEvent(new FocusEvent('focus')))
  await expect
    .poll(
      async () =>
        (await snapshot(page)).assets
          ?.find((a) => a.id === map.id)
          ?.scene?.tilesets.find((t) => t.id === tileset.id)
          ?.solid.includes(0),
      { timeout: 10000 },
    )
    .toBe(true)
  const after = await snapshot(page)
  expect(after.files).toEqual(before.files)
  expect(after.ir).toEqual(before.ir)
  expect(after.blocksState).toEqual(before.blocksState)
  await info.attach('linked-resource-updated', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
})
