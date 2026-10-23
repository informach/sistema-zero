import { readFileSync } from 'node:fs'
import { expect, type Page, test } from '@playwright/test'
import { OBJ_IMPORT_COPY as copy } from '../src/core/objImportCopy'
import { addScenePrimitive } from '../src/scene/commands'
import { createSceneProject } from '../src/scene/createProject'
import { type MoldaSceneJson, sceneToJson } from '../src/scene/documentJson'

async function importObj(page: Page, filename: string) {
  await page.getByRole('button', { name: copy.open, exact: true }).click()
  const dialog = page.getByRole('dialog', { name: copy.title })
  await dialog.getByLabel(copy.objFormat).click()
  await dialog.getByLabel(copy.choose).setInputFiles({
    name: filename,
    mimeType: 'text/plain',
    buffer: Buffer.from('o Galho\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n'),
  })
  await dialog.getByRole('button', { name: copy.prepare }).click()
  await expect(dialog.getByText(copy.ready)).toBeVisible()
  await expect(dialog.getByText(copy.add)).toBeVisible()
  await dialog.getByLabel(copy.accept).check()
  await dialog.getByRole('button', { name: copy.confirm }).click()
  await expect(dialog).toHaveCount(0)
}

async function downloadProject(page: Page): Promise<MoldaSceneJson> {
  const menu = page.locator('summary').filter({ hasText: 'Salvar e exportar' })
  await menu.click()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar projeto', exact: true }).click()
  const path = await (await pending).path()
  if (!path) throw new Error('O projeto não foi baixado')
  await menu.click()
  return JSON.parse(readFileSync(path, 'utf8')) as MoldaSceneJson
}

test('two imported OBJ models join the project as separate groups and undo removes only the last', async ({
  page,
}) => {
  const source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Cena composta' }),
    'box',
    'Casa',
  )
  await page.goto('/?nivel=god')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'cena.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: `Modelo ${source.name}`, exact: true }).click()
  await importObj(page, 'primeiro.obj')
  await importObj(page, 'segundo.obj')

  const combined = await downloadProject(page)
  expect(combined.name).toBe(source.name)
  expect(combined.nodes.some((node) => node.id === source.nodes[0]!.id)).toBe(true)
  expect(combined.nodes.filter((node) => node.kind === 'group').map((node) => node.name)).toEqual([
    'primeiro',
    'segundo',
  ])
  expect(combined.nodes.filter((node) => node.name === 'Galho')).toHaveLength(2)
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  const undone = await downloadProject(page)
  expect(undone.nodes.filter((node) => node.kind === 'group').map((node) => node.name)).toEqual([
    'primeiro',
  ])
  expect(undone.nodes.some((node) => node.id === source.nodes[0]!.id)).toBe(true)
})
