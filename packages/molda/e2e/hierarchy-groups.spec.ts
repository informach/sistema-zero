import fs from 'node:fs'
import { expect, type Page, test } from '@playwright/test'
import { COPY } from '../src/core/copy'
import { addScenePrimitive, groupSceneNodes } from '../src/scene/commands'
import { indexSceneDocument } from '../src/scene/documentIndex'
import { type MoldaSceneJson, sceneToJson } from '../src/scene/documentJson'
import { migrateLegacyModel } from '../src/scene/migrateLegacy'
import { readSceneDocument } from '../src/scene/readDocument'
import { makeModel } from '../src/testing/fixtures'

test.use({ hasTouch: false, viewport: { width: 1440, height: 1000 } })

async function snapshot(page: Page): Promise<MoldaSceneJson> {
  const menu = page.locator('summary').filter({ hasText: 'Salvar e exportar' })
  await menu.click()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar projeto', exact: true }).click()
  const download = await pending
  const json = JSON.parse(fs.readFileSync(await download.path(), 'utf8'))
  await menu.click()
  return json
}

test.describe('organização por toque', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } })
  test('a lista permite agrupar e escolher o destino no celular sem arrastar', async ({ page }) => {
    const source = groupSceneNodes(
      { ...migrateLegacyModel(makeModel()).document, name: 'Grupos por toque' },
      ['body'],
      { name: 'Pasta', nextId: () => 'pasta' },
    )
    await page.goto('/?nivel=explorer')
    await page.locator('input[name="molda-backup"]').setInputFiles({
      name: 'toque.molda.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
    })
    await page.getByRole('button', { name: `Modelo ${source.name}`, exact: true }).tap()
    await page.getByRole('tab', { name: 'Peças', exact: true }).tap()
    const tree = page.getByRole('region', { name: COPY.scene.hierarchy, exact: true })
    const tools = page.getByRole('group', { name: 'Organizar peças e grupos', exact: true })
    await tree.getByRole('button', { name: COPY.scene.select('asa'), exact: true }).tap()
    await tools.getByRole('combobox', { name: 'Mover para grupo' }).selectOption('group:pasta')
    expect((await snapshot(page)).nodes.find((n) => n.id === 'wing')?.parentId).toBe('pasta')
    await tools.getByRole('button', { name: 'Agrupar', exact: true }).tap()
    const grouped = await snapshot(page)
    expect(grouped.nodes.filter((n) => n.kind === 'group')).toHaveLength(2)
    const subgroup = grouped.nodes.find((n) => n.kind === 'group' && n.id !== 'pasta')!
    expect(subgroup.parentId).toBe('pasta')
    expect(grouped.nodes.find((n) => n.id === 'wing')?.parentId).toBe(subgroup.id)
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).tap()
    expect((await snapshot(page)).nodes.find((n) => n.id === 'wing')?.parentId).toBe('pasta')
  })
})

for (const theme of ['light', 'dark']) {
  test(`groups organize the real tree with inline rename, drag, nested destinations and exact undo: ${theme}`, async ({
    page,
  }) => {
    const source = addScenePrimitive(
      { ...migrateLegacyModel(makeModel()).document, name: 'Organizar camadas' },
      'cylinder',
      'cylinder',
    )
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(`/?nivel=god${theme === 'dark' ? '&tema=escuro' : ''}`)
    await page.locator('input[name="molda-backup"]').setInputFiles({
      name: 'grupos.molda.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
    })
    await page.getByRole('button', { name: `Modelo ${source.name}`, exact: true }).click()
    const tree = page.getByRole('region', { name: COPY.scene.hierarchy, exact: true })
    const tools = page.getByRole('group', { name: 'Organizar peças e grupos', exact: true })
    const choose = (name: string) =>
      tree.getByRole('button', { name: COPY.scene.select(name), exact: true })
    await choose('corpo').click()
    await choose('asa').click({ modifiers: ['Shift'] })
    await tools.getByRole('button', { name: 'Agrupar', exact: true }).click()
    await choose('Grupo').dblclick()
    await tree.getByRole('textbox', { name: 'Renomear Grupo na árvore' }).fill('root')
    await tree.getByRole('textbox', { name: 'Renomear Grupo na árvore' }).press('Enter')
    await expect(choose('root')).toBeFocused()
    await choose('asa').click()
    await tools.getByRole('button', { name: 'Agrupar', exact: true }).click()
    await choose('Grupo').press('F2')
    await tree.getByRole('textbox', { name: 'Renomear Grupo na árvore' }).fill('wheel_right_front')
    await tree.getByRole('textbox', { name: 'Renomear Grupo na árvore' }).press('Enter')
    const beforeDrag = await snapshot(page)
    await tree
      .getByRole('button', { name: COPY.scene.hide('wheel_right_front'), exact: true })
      .click()
    await choose('cylinder').dragTo(choose('wheel_right_front'))
    await expect(choose('cylinder')).toBeVisible()
    const moved = await snapshot(page)
    const target = moved.nodes.find((n) => n.name === 'wheel_right_front')!
    const cylinder = moved.nodes.find((n) => n.name === 'cylinder')!
    expect(cylinder.parentId).toBe(target.id)
    const read = readSceneDocument(moved)
    if (read.status !== 'valid') throw new Error('Invalid grouped project')
    const oldWorld = indexSceneDocument(source).scene.worldMatrices
    for (const [id, matrix] of indexSceneDocument(read.document).scene.worldMatrices) {
      if (oldWorld.has(id))
        matrix.forEach((n, i) => {
          expect(n).toBeCloseTo(oldWorld.get(id)![i]!, 10)
        })
    }
    expect(moved.geometries).toEqual(sceneToJson(source).geometries)
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    expect((await snapshot(page)).nodes).toEqual(beforeDrag.nodes)
    await page.getByRole('button', { name: COPY.editor.redo, exact: true }).click()
    expect((await snapshot(page)).nodes).toEqual(moved.nodes)
    await choose('root').click()
    const nested = await snapshot(page)
    await choose('root').dragTo(choose('wheel_right_front'))
    expect((await snapshot(page)).nodes).toEqual(nested.nodes)
    await choose('cylinder').click()
    await tools.getByRole('combobox', { name: 'Mover para grupo' }).selectOption('root')
    expect((await snapshot(page)).nodes.find((n) => n.id === cylinder.id)?.parentId).toBeNull()
    await choose('cylinder').dragTo(choose('wheel_right_front'))
    await choose('cylinder').hover()
    await page.mouse.down()
    await page.mouse.move(1000, 170, { steps: 8 })
    const outside = tree.getByRole('group', { name: 'Fora dos grupos', exact: true })
    await expect(outside).toBeVisible()
    const drop = await outside.boundingBox()
    if (!drop) throw new Error('Root drop target missing')
    await page.mouse.move(drop.x + drop.width / 2, drop.y + drop.height / 2, { steps: 4 })
    await page.mouse.up()
    expect((await snapshot(page)).nodes.find((n) => n.id === cylinder.id)?.parentId).toBeNull()
    await choose('cylinder').click()
    await tools
      .getByRole('combobox', { name: 'Mover para grupo' })
      .selectOption(`group:${target.id}`)
    await choose('root').click()
    await tree.getByRole('button', { name: COPY.scene.hide('root'), exact: true }).click()
    await expect(choose('cylinder')).toBeHidden()
    await tree.getByRole('button', { name: COPY.scene.show('root'), exact: true }).click()
    await expect(choose('cylinder')).toBeVisible()
    await page.screenshot({ path: `.cache/grupos-camadas-${theme}.png` })
    const grouped = await snapshot(page)
    await choose('wheel_right_front').click()
    await tools.getByRole('button', { name: COPY.scene.ungroup, exact: true }).click()
    await expect(choose('wheel_right_front')).toHaveCount(0)
    expect((await snapshot(page)).nodes.find((n) => n.id === cylinder.id)?.parentId).toBe(
      grouped.nodes.find((n) => n.name === 'root')!.id,
    )
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    expect((await snapshot(page)).nodes).toEqual(grouped.nodes)
    await expect(page.getByText('Salvo', { exact: true })).toBeVisible()
    await page.reload()
    await page.getByRole('button', { name: `Modelo ${source.name}`, exact: true }).click()
    expect((await snapshot(page)).nodes).toEqual(grouped.nodes)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('tab', { name: 'Peças', exact: true }).click()
    await expect(tools.getByRole('button', { name: 'Agrupar', exact: true })).toBeVisible()
    await expect(choose('wheel_right_front')).toBeVisible()
    expect(await tree.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(false)
    expect(errors).toEqual([])
  })
}
