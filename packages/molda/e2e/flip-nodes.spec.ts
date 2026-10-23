import fs from 'node:fs'
import { expect, type Page, test } from '@playwright/test'
import { COPY } from '../src/core/copy'
import { addScenePrimitive } from '../src/scene/commands'
import { createSceneProject } from '../src/scene/createProject'
import type { MoldaSceneDocument } from '../src/scene/document'
import { indexSceneDocument } from '../src/scene/documentIndex'
import { type MoldaSceneJson, sceneToJson } from '../src/scene/documentJson'
import { flipSceneNodes } from '../src/scene/flipNodes'
import { readSceneDocument } from '../src/scene/readDocument'

test.use({ hasTouch: false, viewport: { width: 1440, height: 1000 } })

function fixture() {
  let source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Virar peças e grupos' }),
    'wedge',
    'rampa',
  )
  source = {
    ...source,
    nodes: source.nodes.map((node) => ({
      ...node,
      transform: { kind: 'trs', translation: [4, 3, 2], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    })),
  }
  return source
}
async function load(page: Page, source: MoldaSceneDocument, theme = 'light') {
  await page.goto(`/?nivel=god${theme === 'dark' ? '&tema=escuro' : ''}`)
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'flip.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: `Modelo ${source.name}`, exact: true }).click()
}
async function snapshot(page: Page): Promise<MoldaSceneJson> {
  const menu = page.locator('summary').filter({ hasText: 'Salvar e exportar' })
  await menu.click()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar projeto', exact: true }).click()
  const downloaded = await pending
  const result = JSON.parse(fs.readFileSync(await downloaded.path(), 'utf8'))
  await menu.click()
  return result
}
function documentFrom(json: MoldaSceneJson) {
  const read = readSceneDocument(json)
  if (read.status !== 'valid') throw new Error('Invalid flipped document')
  return read.document
}

for (const theme of ['light', 'dark']) {
  test(`flip X/Y/Z on a piece and a group preserves resources, supports in-place and exact undo: ${theme}`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const source = fixture()
    const id = source.nodes[0]!.id
    await load(page, source, theme)
    await page.getByRole('button', { name: COPY.scene.select('rampa'), exact: true }).click()
    const disclosure = page
      .locator('details.mld-disclosure')
      .filter({ has: page.locator('summary').filter({ hasText: /^Virar$/ }) })
    await disclosure.locator('summary').click()
    for (const axis of ['x', 'y', 'z'] as const) {
      await disclosure
        .getByRole('button', { name: COPY.scene.flipAxis(axis.toUpperCase()), exact: true })
        .click()
      const changed = await snapshot(page)
      expect(changed.nodes).toEqual(sceneToJson(flipSceneNodes(source, [id], axis)).nodes)
      expect(changed.geometries).toEqual(sceneToJson(source).geometries)
      expect(changed.materials).toEqual(sceneToJson(source).materials)
      await expect(page.getByRole('spinbutton', { name: 'Tamanho X', exact: true })).toHaveValue(
        '2.00',
      )
      await expect(page.getByRole('spinbutton', { name: 'Posição X', exact: true })).toBeVisible()
      await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
      expect((await snapshot(page)).nodes).toEqual(sceneToJson(source).nodes)
      await page.getByRole('button', { name: COPY.editor.redo, exact: true }).click()
      expect((await snapshot(page)).nodes).toEqual(changed.nodes)
      await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    }
    await disclosure.getByRole('checkbox', { name: COPY.scene.flipInPlace, exact: true }).check()
    await disclosure.getByRole('button', { name: COPY.scene.flipAxis('X'), exact: true }).click()
    expect((await snapshot(page)).nodes).toEqual(
      sceneToJson(flipSceneNodes(source, [id], 'x', true)).nodes,
    )
    await expect(page.getByRole('spinbutton', { name: 'Posição X', exact: true })).toHaveValue(
      '4.00',
    )
    await page.screenshot({ path: `.cache/virar-peca-${theme}.png` })
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    await page
      .getByRole('group', { name: 'Organizar peças e grupos', exact: true })
      .getByRole('button', { name: 'Agrupar', exact: true })
      .click()
    const grouped = documentFrom(await snapshot(page))
    const group = grouped.nodes.find((n) => n.kind === 'group')!
    // Flip is also available for the selected group, without changing its descendants' local transforms.
    await disclosure.getByRole('checkbox', { name: COPY.scene.flipInPlace, exact: true }).uncheck()
    await disclosure.getByRole('button', { name: COPY.scene.flipAxis('Z'), exact: true }).click()
    const flipped = documentFrom(await snapshot(page))
    expect(flipped.nodes.find((n) => n.id === id)).toEqual(grouped.nodes.find((n) => n.id === id))
    expect(indexSceneDocument(flipped).scene.worldMatrices.get(id)).toEqual(
      indexSceneDocument(flipSceneNodes(grouped, [group.id], 'z')).scene.worldMatrices.get(id),
    )
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    expect((await snapshot(page)).nodes).toEqual(sceneToJson(grouped).nodes)
    expect(errors).toEqual([])
  })
}
