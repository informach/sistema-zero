import { readFile } from 'node:fs/promises'
import type { Page } from '@playwright/test'
import { COPY } from '../src/core/copy'
import { SCENE_PAINT_COPY as paintCopy } from '../src/core/scenePaintCopy'
import { addScenePrimitive } from '../src/scene/commands'
import { createSceneProject } from '../src/scene/createProject'
import { sceneToJson } from '../src/scene/documentJson'
import { readSceneDocument } from '../src/scene/readDocument'

export async function openPainting(
  page: Page,
  dark = false,
  source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Pintura simples' }),
    'box',
    'caixa',
  ),
  level: 'explorer' | 'architect' | 'god' = 'god',
) {
  await page.goto(`/?nivel=${level}${dark ? '&tema=escuro' : ''}`)
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'pintura.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: `Modelo ${source.name}`, exact: true }).click()
  await page.getByRole('button', { name: COPY.editor.model.views.frame, exact: true }).click()
  await page.getByRole('button', { name: paintCopy.tab, exact: true }).click()
  return source
}

export async function savedProject(page: Page) {
  const menu = page.locator('summary').filter({ hasText: 'Salvar e exportar' })
  await menu.click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Baixar projeto', exact: true }).click(),
  ])
  const file = await download.path()
  if (!file) throw new Error('Missing project download')
  await menu.click()
  const result = readSceneDocument(JSON.parse(await readFile(file, 'utf8')))
  if (result.status !== 'valid') throw new Error('Invalid painted project')
  return result.document
}
