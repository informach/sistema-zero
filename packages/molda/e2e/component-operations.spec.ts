import fs from 'node:fs'
import { expect, type Page, test } from '@playwright/test'
import { Vector3 } from 'three'
import { COPY } from '../src/core/copy'
import { sceneBounds } from '../src/scene/bounds'
import { addScenePrimitive, editSceneMesh } from '../src/scene/commands'
import { createSceneProject } from '../src/scene/createProject'
import type { MoldaSceneDocument } from '../src/scene/document'
import { indexSceneDocument } from '../src/scene/documentIndex'
import { type MoldaSceneJson, sceneToJson } from '../src/scene/documentJson'
import { transformPoint } from '../src/scene/matrix'
import { editMeshFaces } from '../src/scene/meshFaces'
import { sceneGeometryMesh } from '../src/scene/parametricGeometry'
import { sceneLocalBounds } from '../src/scene/pivot'
import { ViewportCamera } from '../src/viewport/viewportCamera'

test.use({ hasTouch: false, viewport: { width: 1440, height: 900 } })

function model(name: string, hole?: 'left' | 'front') {
  let source = addScenePrimitive(createSceneProject({ kind: 'empty', name }), 'box', 'corpo')
  if (hole) {
    const mesh = sceneGeometryMesh(source.geometries[0]!),
      axis = hole === 'left' ? 0 : 2,
      side = hole === 'left' ? -1 : 1
    const face = Object.keys(mesh.faces).find((id) =>
      mesh.faces[id]!.corners.every((c) => Math.sign(mesh.vertices[c.vertexId]![axis]!) === side),
    )!
    source = editSceneMesh(source, source.nodes[0]!.id, (m) => editMeshFaces(m, [face], 'remove'))
  }
  return source
}
async function load(page: Page, source: MoldaSceneDocument) {
  await page.goto('/?nivel=god')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'faces.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: `Modelo ${source.name}`, exact: true }).click()
  await page.getByRole('button', { name: 'Escolher corpo', exact: true }).click()
  await page.getByRole('button', { name: COPY.scene.editFaces, exact: true }).click()
}
async function view(
  page: Page,
  source: MoldaSceneDocument,
  direction: 'front' | 'right' | 'left' = 'front',
) {
  const summary = page.locator('summary').filter({ hasText: /^Vista:/ })
  await summary.click()
  await page.getByRole('button', { name: COPY.editor.model.views[direction], exact: true }).click()
  await summary.click()
  await page.getByRole('button', { name: 'Enquadrar', exact: true }).click()
  const box = (await page.locator('canvas').first().boundingBox())!,
    index = indexSceneDocument(source),
    bounds = sceneBounds(index)!,
    world = index.scene.worldMatrices.get(source.nodes[0]!.id)!
  const rig = new ViewportCamera('orthographic')
  rig.aspect = box.width / box.height
  rig.setView(direction, bounds)
  rig.frame(bounds)
  return (point: [number, number, number]) => {
    const p = new Vector3(...transformPoint(world, point)).project(rig.camera)
    return { x: box.x + ((p.x + 1) * box.width) / 2, y: box.y + ((1 - p.y) * box.height) / 2 }
  }
}
async function snapshot(page: Page) {
  const menu = page.locator('summary').filter({ hasText: 'Salvar e exportar' })
  await menu.click()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar projeto', exact: true }).click()
  const download = await pending,
    data = JSON.parse(fs.readFileSync(await download.path(), 'utf8')) as MoldaSceneJson
  await menu.click()
  return data
}
const shape = (document: MoldaSceneJson) => {
  const mesh = document.geometries[0]!
  if (mesh.kind !== 'mesh') throw new Error('Editable mesh missing')
  return mesh
}

test('face duplication cancels cleanly and confirms the real Move gizmo in one undo', async ({
  page,
}) => {
  const source = model('Duplicar faces')
  await load(page, source)
  const project = await view(page, source),
    center = project([0, 0, 1])
  await page.mouse.click(center.x, center.y)
  const panel = page.locator('.mld-component-root')
  await panel.getByRole('button', { name: 'Mais ferramentas', exact: true }).click()
  await panel.getByRole('button', { name: /^Duplicar/ }).click()
  // The front face cannot be copied onto the existing back face.
  await panel.getByRole('spinbutton', { name: 'Mover cópia Z', exact: true }).fill('-2')
  await expect(panel.getByRole('button', { name: 'Aplicar', exact: true })).toBeDisabled()
  await expect(panel.getByRole('alert')).toContainText('Já existe uma face')
  await panel.getByRole('spinbutton', { name: 'Mover cópia Z', exact: true }).fill('0')
  await expect(panel.getByRole('button', { name: 'Aplicar', exact: true })).toBeDisabled()
  await panel.getByRole('spinbutton', { name: 'Mover cópia X', exact: true }).fill('1')
  await panel.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
  await panel.getByRole('button', { name: 'Mais ferramentas', exact: true }).click()
  await panel.getByRole('button', { name: /^Duplicar/ }).click()
  const tip = page
      .getByRole('button', { name: 'Mover no eixo X', exact: true })
      .locator('.mld-axis-tip'),
    rect = (await tip.boundingBox())!
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
  await page.mouse.down()
  await page.mouse.move(rect.x + 70, rect.y + rect.height / 2, { steps: 5 })
  await page.mouse.up()
  await expect(
    panel.getByRole('spinbutton', { name: 'Mover cópia X', exact: true }),
  ).not.toHaveValue('0')
  await expect(panel.getByRole('button', { name: 'Aplicar', exact: true })).toBeEnabled()
  await page.screenshot({ path: '.cache/faces-duplicate.png' })
  await panel.getByRole('button', { name: 'Aplicar', exact: true }).click()
  const copied = await snapshot(page)
  expect(copied.nodes).toEqual(sceneToJson(source).nodes)
  expect(Object.keys(shape(copied).faces)).toHaveLength(7)
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  expect((await snapshot(page)).geometries).toEqual(sceneToJson(source).geometries)
})

for (const constructionEdge of [false, true])
  test(`hole filling selects the visible border and closes the same piece (${constructionEdge ? 'mixed construction edge' : 'face edges'})`, async ({
    page,
  }) => {
    let source = model('Fechar buraco', 'front')
    if (constructionEdge)
      source = editSceneMesh(source, source.nodes[0]!.id, (mesh) => {
        const left = Object.keys(mesh.faces).find((id) =>
          mesh.faces[id]!.corners.every((c) => mesh.vertices[c.vertexId]![0] === -1),
        )!
        const pair = Object.keys(mesh.vertices).filter(
          (id) => mesh.vertices[id]![0] === -1 && mesh.vertices[id]![2] === 1,
        ) as [string, string]
        return { ...editMeshFaces(mesh, [left], 'remove'), looseEdges: [pair] }
      })
    await load(page, source)
    const project = await view(page, source),
      local = sceneLocalBounds(source, source.nodes[0]!.id)!,
      panel = page.locator('.mld-component-root')
    await panel.getByRole('button', { name: 'Mais ferramentas', exact: true }).click()
    await panel.getByRole('button', { name: /^Fechar buraco/ }).click()
    for (const p of [
      [local.min[0], local.center[1], local.max[2]],
      [local.max[0], local.center[1], local.max[2]],
      [local.center[0], local.min[1], local.max[2]],
      [local.center[0], local.max[1], local.max[2]],
    ] as Array<[number, number, number]>) {
      const s = project(p)
      await page.keyboard.down('Shift')
      await page.mouse.click(s.x, s.y)
      await page.keyboard.up('Shift')
    }
    await expect(panel.getByText('4 linhas escolhidas', { exact: true })).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Aplicar', exact: true })).toBeEnabled()
    await page.screenshot({ path: '.cache/faces-fill.png' })
    await panel.getByRole('button', { name: 'Aplicar', exact: true }).click()
    const filled = await snapshot(page)
    expect(filled.nodes).toEqual(sceneToJson(source).nodes)
    expect(Object.keys(shape(filled).faces)).toHaveLength(constructionEdge ? 5 : 6)
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    expect((await snapshot(page)).geometries).toEqual(sceneToJson(source).geometries)
  })

test('removing every face keeps the piece editable, explains recovery and undoes in one step', async ({
  page,
}) => {
  const source = model('Peça vazia')
  await load(page, source)
  const panel = page.locator('.mld-component-root')
  await panel.getByRole('button', { name: COPY.scene.faceAll, exact: true }).click()
  await panel.getByRole('button', { name: COPY.scene.faceActions.remove, exact: true }).click()
  await expect(
    panel.getByText('Esta peça ficou sem faces. Desfaça para recuperar.', { exact: true }),
  ).toBeVisible()
  const empty = await snapshot(page)
  expect(empty.nodes).toEqual(sceneToJson(source).nodes)
  expect(Object.keys(shape(empty).faces)).toHaveLength(0)
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await expect(
    panel.getByText('Esta peça ficou sem faces. Desfaça para recuperar.', { exact: true }),
  ).toHaveCount(0)
  expect((await snapshot(page)).geometries).toEqual(sceneToJson(source).geometries)
})

test('three offset ring cuts preview their path and apply new selectable faces', async ({
  page,
}) => {
  const source = model('Cortes em volta')
  await load(page, source)
  const project = await view(page, source),
    local = sceneLocalBounds(source, source.nodes[0]!.id)!,
    panel = page.locator('.mld-component-root')
  await panel.getByRole('button', { name: 'Cortar', exact: true }).click()
  await panel.getByRole('button', { name: 'Em volta', exact: true }).click()
  const p = project([local.max[0], local.center[1], local.max[2]])
  await page.mouse.click(p.x, p.y)
  await panel
    .getByRole('button', { name: 'Aumentar quantidade de cortes', exact: true })
    .click({ clickCount: 2 })
  await panel.getByRole('spinbutton', { name: 'Posição do conjunto (%)', exact: true }).fill('10')
  await expect(panel.getByRole('button', { name: 'Aplicar corte', exact: true })).toBeEnabled()
  await page.screenshot({ path: '.cache/faces-ring.png' })
  await panel.getByRole('button', { name: 'Aplicar corte', exact: true }).click()
  const cut = await snapshot(page)
  expect(cut.nodes).toEqual(sceneToJson(source).nodes)
  expect(Object.keys(shape(cut).faces)).toHaveLength(18)
  await expect(panel.getByText('16 faces escolhidas', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  expect((await snapshot(page)).geometries).toEqual(sceneToJson(source).geometries)
})

test('continuous reflection survives reopening, follows a generated-side extrusion and stops without losing the surface', async ({
  page,
}) => {
  test.setTimeout(60000)
  const source = model('Espelho contínuo', 'left')
  await load(page, source)
  let project = await view(page, source, 'right'),
    center = project([1, 0, 0])
  await page.mouse.click(center.x, center.y)
  const panel = page.locator('.mld-component-root')
  await panel.getByRole('button', { name: 'Espelhar', exact: true }).click()
  await panel.getByRole('checkbox', { name: 'Continuar espelhando', exact: true }).check()
  await expect(panel.getByRole('button', { name: 'Aplicar', exact: true })).toBeEnabled()
  await page.screenshot({ path: '.cache/faces-mirror.png' })
  await panel.getByRole('button', { name: 'Aplicar', exact: true }).click()
  const mirrored = await snapshot(page),
    relation = shape(mirrored).symmetry!
  expect(relation).toBeDefined()
  await page.getByRole('button', { name: 'Meus projetos', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Modelo Espelho contínuo', exact: true }),
  ).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Modelo Espelho contínuo', exact: true }).click()
  await page.getByRole('button', { name: 'Escolher corpo', exact: true }).click()
  await page.getByRole('button', { name: COPY.scene.editFaces, exact: true }).click()
  await expect(panel.getByRole('button', { name: 'Espelho X ativo', exact: true })).toBeVisible()
  project = await view(page, source, 'left')
  center = project([-1, 0, 0])
  await page.mouse.click(center.x, center.y)
  await expect(panel.getByText('1 face escolhida', { exact: true })).toBeVisible()
  await panel.getByRole('button', { name: COPY.scene.facePreview.extrude, exact: true }).click()
  await panel.getByRole('spinbutton', { name: COPY.scene.extrudeAmount, exact: true }).fill('0.3')
  await panel.getByRole('button', { name: COPY.scene.previewConfirm, exact: true }).click()
  const pulled = await snapshot(page),
    mesh = shape(pulled)
  expect(mesh.symmetry!.center).toBe(relation.center)
  expect(Object.keys(mesh.symmetry!.faces)).toHaveLength(5)
  expect(pulled.nodes).toHaveLength(1)
  await panel.getByRole('button', { name: COPY.scene.facePreview.subdivide, exact: true }).click()
  await panel.getByRole('spinbutton', { name: COPY.scene.subdivideAmount, exact: true }).fill('1')
  await panel.getByRole('button', { name: COPY.scene.previewConfirm, exact: true }).click()
  const divided = shape(await snapshot(page))
  expect(Object.keys(divided.symmetry!.faces)).toHaveLength(8)
  await panel.getByRole('button', { name: 'Espelho X ativo', exact: true }).click()
  await panel.getByRole('button', { name: 'Parar de espelhar', exact: true }).click()
  const baked = shape(await snapshot(page))
  expect(baked.symmetry).toBeUndefined()
  expect(baked.vertices).toEqual(divided.vertices)
  expect(baked.faces).toEqual(divided.faces)
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  expect(shape(await snapshot(page)).symmetry).toEqual(divided.symmetry)
})
