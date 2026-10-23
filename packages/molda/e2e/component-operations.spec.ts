import fs from 'node:fs'
import { expect, type Page, test } from '@playwright/test'
import sharp from 'sharp'
import { Vector3 } from 'three'
import { COPY } from '../src/core/copy'
import { sceneBounds } from '../src/scene/bounds'
import { addScenePrimitive, editSceneMesh } from '../src/scene/commands'
import { createSceneProject } from '../src/scene/createProject'
import type { MoldaSceneDocument } from '../src/scene/document'
import { indexSceneDocument } from '../src/scene/documentIndex'
import { type MoldaSceneJson, sceneToJson } from '../src/scene/documentJson'
import { transformPoint } from '../src/scene/matrix'
import {
  meshComponentEdges,
  meshComponentVertices,
  selectMeshComponents,
} from '../src/scene/meshComponents'
import { editMeshFaces } from '../src/scene/meshFaces'
import { cutMeshEdgeRings } from '../src/scene/meshRingCuts'
import { sceneGeometryMesh } from '../src/scene/parametricGeometry'
import { sceneLocalBounds } from '../src/scene/pivot'
import { makeSceneGridGeometry } from '../src/testing/sceneFixtures'
import { makeSceneKnifeLoop } from '../src/testing/sceneKnifeLoop'
import { makeSceneWheelSelection } from '../src/testing/sceneWheelSelection'
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
async function load(page: Page, source: MoldaSceneDocument, edit = true) {
  await page.goto('/?nivel=god')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'faces.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: `Modelo ${source.name}`, exact: true }).click()
  await page.getByRole('button', { name: 'Escolher corpo', exact: true }).click()
  if (edit) await page.getByRole('button', { name: COPY.scene.editFaces, exact: true }).click()
}
async function view(
  page: Page,
  source: MoldaSceneDocument,
  direction: 'front' | 'right' | 'left' | 'free' = 'front',
  nodeId = source.nodes[0]!.id,
) {
  const summary = page.locator('summary').filter({ hasText: /^Vista:/ })
  await summary.click()
  await page.getByRole('button', { name: COPY.editor.model.views[direction], exact: true }).click()
  await summary.click()
  await page.getByRole('button', { name: 'Enquadrar', exact: true }).click()
  const box = (await page.locator('canvas').first().boundingBox())!,
    index = indexSceneDocument(source),
    bounds = sceneBounds(index)!,
    world = index.scene.worldMatrices.get(nodeId)!
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

test('the stage opens edge picking directly and selects a knife loop through triangular faces on a low box', async ({
  page,
}) => {
  const f = makeSceneKnifeLoop()
  await load(page, f.document, false)
  const project = await view(page, f.document, 'free')
  const modes = page.getByRole('group', { name: 'Escolher', exact: true })
  await modes.getByRole('button', { name: 'Linhas', exact: true }).click()
  await expect(modes.getByRole('button', { name: 'Linhas', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  const panel = page.locator('.mld-component-root')
  await expect(panel.getByRole('button', { name: 'Linhas', exact: true })).toHaveCount(0)
  const point = project([0, 1, 0.65])
  await page.mouse.click(point.x, point.y)
  await expect(panel.getByText('1 linha escolhida', { exact: true })).toBeVisible()
  const wholeLoop = panel.getByRole('checkbox', { name: COPY.scene.componentWholeLoop })
  await wholeLoop.check()
  await expect(panel.getByText('4 linhas escolhidas', { exact: true })).toBeVisible()
  await page.screenshot({ path: '.cache/loop-faca-isometrico.png' })
  const settings = page.locator('summary').filter({ hasText: 'Mais ajustes do palco' })
  await settings.click()
  await page.getByRole('checkbox', { name: 'Passos de 0,01 ao mover e redimensionar' }).check()
  await settings.click()
  await page
    .getByRole('button', { name: 'Mover', exact: true })
    .and(page.locator('[aria-keyshortcuts="G"]'))
    .click()
  await page.getByRole('button', { name: 'Mover no eixo Y', exact: true }).press('ArrowUp')
  const changed = await snapshot(page)
  const selected = new Set(meshComponentVertices(f.mesh, { mode: 'edge', ids: f.loop }))
  const world = indexSceneDocument(f.document).scene.worldMatrices.get(f.nodeId)!
  for (const [id, before] of Object.entries(f.mesh.vertices)) {
    const oldPoint = transformPoint(world, before)
    const nextPoint = transformPoint(world, shape(changed).vertices[id]!)
    expect(nextPoint[0]).toBeCloseTo(oldPoint[0], 10)
    expect(nextPoint[1]).toBeCloseTo(oldPoint[1] + (selected.has(id) ? 0.01 : 0), 10)
    expect(nextPoint[2]).toBeCloseTo(oldPoint[2], 10)
  }
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  expect((await snapshot(page)).geometries).toEqual(sceneToJson(f.document).geometries)
  await wholeLoop.uncheck()
  await modes.getByRole('button', { name: 'Faces', exact: true }).click()
  await expect(modes.getByRole('button', { name: 'Faces', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await modes.getByRole('button', { name: 'Pontos', exact: true }).click()
  await expect(modes.getByRole('button', { name: 'Pontos', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  for (const size of [
    { width: 1024, height: 600 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size)
    await modes.getByRole('button', { name: 'Linhas', exact: true }).click()
    await expect(modes.getByRole('button', { name: 'Linhas', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(
      await modes.evaluate((element) =>
        Array.from(element.querySelectorAll('button')).every((button) => {
          const r = button.getBoundingClientRect()
          return button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
        }),
      ),
    ).toBe(true)
  }
  await page.screenshot({ path: '.cache/selecao-modelo-mobile.png' })
})

test('the panel selects the whole loop from an existing segment and subsequent single clicks, with one reversible move', async ({
  page,
}) => {
  let source = model('Escolher linhas')
  let mesh = sceneGeometryMesh(source.geometries[0]!)
  const vertical = [...meshComponentEdges(mesh)].find(
    ([, [a, b]]) => mesh.vertices[a]![1] !== mesh.vertices[b]![1],
  )![0]
  mesh = cutMeshEdgeRings(mesh, [vertical]).mesh
  const horizontal = [...meshComponentEdges(mesh)].find(
    ([, [a, b]]) =>
      [a, b].every((id) => mesh.vertices[id]![1] === -1 && mesh.vertices[id]![2] === 1) &&
      mesh.vertices[a]![0] !== mesh.vertices[b]![0],
  )![0]
  mesh = cutMeshEdgeRings(mesh, [horizontal]).mesh
  source = editSceneMesh(source, source.nodes[0]!.id, () => mesh)
  const seed = [...meshComponentEdges(mesh)].find(([, [a, b]]) =>
    [a, b].every(
      (id) =>
        mesh.vertices[id]![1] === 0 && mesh.vertices[id]![2] === 1 && mesh.vertices[id]![0] <= 0,
    ),
  )![0]
  const loop = selectMeshComponents(mesh, { mode: 'edge', ids: [seed] }, 'loop')
  expect(loop).toHaveLength(6)
  await load(page, source)
  const project = await view(page, source)
  const panel = page.locator('.mld-component-root')
  await page
    .getByRole('group', { name: 'Escolher', exact: true })
    .getByRole('button', { name: 'Linhas', exact: true })
    .click()
  const left = project([-0.8, 0, 1]),
    // The positive X gizmo covers the center of this segment; inspect beyond its arrow tip.
    right = project([0.97, 0, 1])
  const canvas = page.locator('canvas').first()
  async function yellowAt(point: { x: number; y: number }) {
    const rect = await canvas.boundingBox()
    if (!rect) throw new Error('Palco sem área visível')
    const { data, info } = await sharp(await canvas.screenshot())
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const x = Math.round(((point.x - rect.x) * info.width) / rect.width)
    const y = Math.round(((point.y - rect.y) * info.height) / rect.height)
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const offset = ((y + dy) * info.width + x + dx) * info.channels
        if (
          data[offset]! > 210 &&
          data[offset + 1]! > 140 &&
          data[offset + 1]! < 230 &&
          data[offset + 2]! < 100
        )
          return true
      }
    return false
  }
  await page.mouse.click(left.x, left.y)
  await expect(panel.getByText('1 linha escolhida', { exact: true })).toBeVisible()
  await page
    .getByRole('button', { name: 'Mover', exact: true })
    .and(page.locator('[aria-keyshortcuts="G"]'))
    .click()
  await expect.poll(() => yellowAt(left)).toBe(true)
  expect(await yellowAt(right)).toBe(false)
  await page.screenshot({ path: '.cache/linha-selecionada.png' })
  const wholeLoop = panel.getByRole('checkbox', { name: COPY.scene.componentWholeLoop })
  await expect(wholeLoop).not.toBeChecked()
  await wholeLoop.check()
  await expect(panel.getByText('6 linhas escolhidas', { exact: true })).toBeVisible()
  await panel.getByRole('button', { name: COPY.scene.componentNone, exact: true }).click()
  await page.mouse.click(left.x, left.y)
  await expect(panel.getByText('6 linhas escolhidas', { exact: true })).toBeVisible()
  await expect.poll(() => yellowAt(right)).toBe(true)
  await page.screenshot({ path: '.cache/loop-selecionado.png' })
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
  const settings = page.locator('summary').filter({ hasText: 'Mais ajustes do palco' })
  await settings.click()
  await page.getByRole('checkbox', { name: 'Passos de 0,01 ao mover e redimensionar' }).check()
  await settings.click()
  await page.getByRole('button', { name: 'Mover no eixo Y', exact: true }).press('ArrowUp')
  const changed = await snapshot(page)
  const selected = new Set(meshComponentVertices(mesh, { mode: 'edge', ids: loop }))
  for (const [id, point] of Object.entries(mesh.vertices)) {
    const after = shape(changed).vertices[id]!
    expect(after[0]).toBeCloseTo(point[0], 12)
    expect(after[1]).toBeCloseTo(point[1] + (selected.has(id) ? 0.01 : 0), 12)
    expect(after[2]).toBeCloseTo(point[2], 12)
  }
  expect(changed.nodes).toEqual(sceneToJson(source).nodes)
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  expect((await snapshot(page)).geometries).toEqual(sceneToJson(source).geometries)
  await wholeLoop.uncheck()
  await page.mouse.click(left.x, left.y)
  await expect(panel.getByText('1 linha escolhida', { exact: true })).toBeVisible()
  await wholeLoop.check()
  await expect(panel.getByText('6 linhas escolhidas', { exact: true })).toBeVisible()
})

test('pulling a face with the real Move handles cancels and applies one extrusion with a synchronized amount', async ({
  page,
}) => {
  const source = model('Puxar pelas alças')
  await load(page, source)
  const project = await view(page, source, 'free')
  const local = sceneLocalBounds(source, source.nodes[0]!.id)!
  const top = project([local.center[0], local.max[1], local.center[2]])
  await page.mouse.click(top.x, top.y)
  const panel = page.locator('.mld-component-root')
  await expect(panel.getByText('1 face escolhida', { exact: true })).toBeVisible()
  async function pull() {
    await panel.getByRole('button', { name: COPY.scene.facePreview.extrude, exact: true }).click()
    await expect(
      page
        .getByRole('button', { name: 'Mover', exact: true })
        .and(page.locator('[aria-keyshortcuts="G"]')),
    ).toHaveAttribute('aria-pressed', 'true')
    const tip = page
      .getByRole('button', { name: 'Mover no eixo Y', exact: true })
      .locator('.mld-axis-tip')
    const r = (await tip.boundingBox())!
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2)
    await page.mouse.down()
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2 - 100, { steps: 6 })
    await page.mouse.up()
    await expect(
      panel.getByRole('spinbutton', { name: COPY.scene.extrudeAmount, exact: true }),
    ).not.toHaveValue('0')
    await expect(
      panel.getByRole('button', { name: COPY.scene.previewConfirm, exact: true }),
    ).toBeEnabled()
  }
  await pull()
  await panel.getByRole('button', { name: COPY.scene.previewCancel, exact: true }).click()
  expect((await snapshot(page)).geometries).toEqual(sceneToJson(source).geometries)
  await pull()
  const amount = panel.getByRole('spinbutton', { name: COPY.scene.extrudeAmount, exact: true })
  const first = Number(await amount.inputValue())
  await page.getByRole('button', { name: 'Mover no eixo Y', exact: true }).press('ArrowUp')
  await expect(amount).toHaveValue(String(first + 1))
  await page.screenshot({ path: '.cache/puxar-face-alcas.png' })
  await panel.getByRole('button', { name: COPY.scene.previewConfirm, exact: true }).click()
  const changed = await snapshot(page)
  const original = sceneGeometryMesh(source.geometries[0]!)
  expect(Object.keys(shape(changed).faces)).toHaveLength(10)
  const capId = Object.keys(original.faces).find((id) =>
    original.faces[id]!.corners.every((c) => original.vertices[c.vertexId]![1] === local.max[1]),
  )!
  for (let i = 0; i < original.faces[capId]!.corners.length; i++) {
    const before = original.vertices[original.faces[capId]!.corners[i]!.vertexId]!
    const after = shape(changed).vertices[shape(changed).faces[capId]!.corners[i]!.vertexId]!
    expect(after).toEqual([before[0], before[1] + first + 1, before[2]])
  }
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  expect((await snapshot(page)).geometries).toEqual(sceneToJson(source).geometries)
  await page.getByRole('button', { name: COPY.editor.redo, exact: true }).click()
  expect((await snapshot(page)).geometries).toEqual(changed.geometries)
})

test('Move handles extrude a face on a large mesh through the surface worker', async ({ page }) => {
  let source = model('Puxar malha grande')
  source = editSceneMesh(source, source.nodes[0]!.id, (mesh) => makeSceneGridGeometry(33, mesh.id))
  await load(page, source)
  const project = await view(page, source, 'free')
  const p = project([4.125, 4.125, 0])
  await page.mouse.click(p.x, p.y)
  const panel = page.locator('.mld-component-root')
  await expect(panel.getByText('1 face escolhida', { exact: true })).toBeVisible()
  await panel.getByRole('button', { name: COPY.scene.facePreview.extrude, exact: true }).click()
  await page.getByRole('button', { name: 'Mover no eixo Y', exact: true }).press('ArrowUp')
  await expect(
    panel.getByRole('spinbutton', { name: COPY.scene.extrudeAmount, exact: true }),
  ).toHaveValue('1')
  await expect(
    panel.getByRole('button', { name: COPY.scene.previewConfirm, exact: true }),
  ).toBeEnabled()
  await panel.getByRole('button', { name: COPY.scene.previewConfirm, exact: true }).click()
  const changed = await snapshot(page)
  expect(Object.keys(shape(changed).faces)).toHaveLength(1093)
  const cap = shape(changed).faces.f_16_16!
  for (const corner of cap.corners) expect(shape(changed).vertices[corner.vertexId]![2]).toBe(1)
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  expect((await snapshot(page)).geometries).toEqual(sceneToJson(source).geometries)
})

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
  // Cross a whole-unit step, the default precision used by the Move handle.
  await page.mouse.move(rect.x + 140, rect.y + rect.height / 2, { steps: 5 })
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

for (const mode of ['edge', 'vertex'] as const) {
  test(`pulling a ${mode} creates connected geometry, cancels, repeats and undoes without reopening the piece`, async ({
    page,
  }) => {
    const source = model(`Puxar ${mode}`, 'front')
    const original = sceneGeometryMesh(source.geometries[0]!)
    await load(page, source)
    const project = await view(page, source)
    const local = sceneLocalBounds(source, source.nodes[0]!.id)!
    const modes = page.getByRole('group', { name: 'Escolher', exact: true })
    await modes
      .getByRole('button', { name: mode === 'edge' ? 'Linhas' : 'Pontos', exact: true })
      .click()
    const chosen = project([
      mode === 'edge' ? local.center[0] : local.max[0],
      local.max[1],
      local.max[2],
    ])
    await page.mouse.click(chosen.x, chosen.y)
    const panel = page.locator('.mld-component-root')
    const count = mode === 'edge' ? '1 linha escolhida' : '1 ponto escolhido'
    const label = mode === 'edge' ? 'Puxar linhas' : 'Puxar pontos'
    await expect(panel.getByText(count, { exact: true })).toBeVisible()
    await panel.getByRole('button', { name: label, exact: true }).click()
    await expect(panel.getByRole('button', { name: 'Aplicar', exact: true })).toBeDisabled()
    await expect(panel.getByRole('spinbutton', { name: 'Puxar Y', exact: true })).toHaveAttribute(
      'step',
      '1',
    )
    await page.getByRole('button', { name: 'Mover no eixo Y', exact: true }).press('ArrowUp')
    await expect(panel.getByRole('spinbutton', { name: 'Puxar Y', exact: true })).toHaveValue('1')
    await panel.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(panel.getByText(count, { exact: true })).toBeVisible()
    expect((await snapshot(page)).geometries).toEqual(sceneToJson(source).geometries)

    if (mode === 'vertex') {
      const settings = page.locator('summary').filter({ hasText: 'Mais ajustes do palco' })
      await settings.click()
      await page.getByRole('checkbox', { name: 'Passos de 0,01 ao mover e redimensionar' }).check()
      await settings.click()
    }
    await panel.getByRole('button', { name: label, exact: true }).click()
    await expect(panel.getByRole('spinbutton', { name: 'Puxar Z', exact: true })).toHaveAttribute(
      'step',
      mode === 'vertex' ? '0.01' : '1',
    )
    await panel
      .getByRole('spinbutton', { name: 'Puxar Z', exact: true })
      .fill(mode === 'vertex' ? '1.1' : '1')
    await panel.getByRole('button', { name: 'Aplicar', exact: true }).click()
    await expect(panel.getByText(count, { exact: true })).toBeVisible()
    const first = await snapshot(page)
    expect(first.nodes).toEqual(sceneToJson(source).nodes)
    expect(Object.keys(shape(first).vertices)).toHaveLength(
      Object.keys(original.vertices).length + (mode === 'edge' ? 2 : 1),
    )
    expect(Object.keys(shape(first).faces)).toHaveLength(mode === 'edge' ? 6 : 5)
    expect(shape(first).looseEdges).toHaveLength(mode === 'vertex' ? 1 : 0)
    for (const [id, point] of Object.entries(original.vertices))
      expect(shape(first).vertices[id]).toEqual(point)
    for (const [id, face] of Object.entries(original.faces))
      expect(shape(first).faces[id]).toEqual(face)

    await panel.getByRole('button', { name: label, exact: true }).click()
    await panel.getByRole('spinbutton', { name: 'Puxar Z', exact: true }).fill('1')
    await panel.getByRole('button', { name: 'Aplicar', exact: true }).click()
    const second = await snapshot(page)
    expect(Object.keys(shape(second).vertices)).toHaveLength(
      Object.keys(original.vertices).length + (mode === 'edge' ? 4 : 2),
    )
    expect(Object.keys(shape(second).faces)).toHaveLength(mode === 'edge' ? 7 : 5)
    expect(shape(second).looseEdges).toHaveLength(mode === 'vertex' ? 2 : 0)
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    expect((await snapshot(page)).geometries).toEqual(first.geometries)
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    expect((await snapshot(page)).geometries).toEqual(sceneToJson(source).geometries)
    await page.getByRole('button', { name: COPY.editor.redo, exact: true }).click()
    await page.getByRole('button', { name: COPY.editor.redo, exact: true }).click()
    expect((await snapshot(page)).geometries).toEqual(second.geometries)
    await expect(page.getByRole('button', { name: 'Abrir o 3D de novo', exact: true })).toHaveCount(
      0,
    )
    await view(page, source, 'free')
    await page.screenshot({ path: `.cache/extrusao-${mode}.png` })
  })
}

for (const mode of ['edge', 'vertex'] as const) {
  test(`creating a face from ${mode === 'edge' ? 'two opposite edges' : 'four points'} cancels, applies and then extrudes in separate undo steps`, async ({
    page,
  }) => {
    const source = model(`Criar face ${mode}`, 'front')
    const original = sceneGeometryMesh(source.geometries[0]!)
    await load(page, source)
    const project = await view(page, source)
    const local = sceneLocalBounds(source, source.nodes[0]!.id)!
    const modes = page.getByRole('group', { name: 'Escolher', exact: true })
    await modes
      .getByRole('button', { name: mode === 'edge' ? 'Linhas' : 'Pontos', exact: true })
      .click()
    const points: Array<[number, number, number]> =
      mode === 'edge'
        ? [
            [local.center[0], local.min[1], local.max[2]],
            [local.center[0], local.max[1], local.max[2]],
          ]
        : [
            [local.min[0], local.min[1], local.max[2]],
            [local.max[0], local.max[1], local.max[2]],
            [local.min[0], local.max[1], local.max[2]],
            [local.max[0], local.min[1], local.max[2]],
          ]
    for (const point of points) {
      const p = project(point)
      await page.keyboard.down('Shift')
      await page.mouse.click(p.x, p.y)
      await page.keyboard.up('Shift')
    }
    const panel = page.locator('.mld-component-root')
    const count = mode === 'edge' ? '2 linhas escolhidas' : '4 pontos escolhidos'
    await expect(panel.getByText(count, { exact: true })).toBeVisible()
    await panel.getByRole('button', { name: COPY.scene.createFaceEdge.label, exact: true }).click()
    await expect(panel.getByRole('button', { name: 'Aplicar', exact: true })).toBeEnabled()
    await page.screenshot({ path: `.cache/criar-face-previa-${mode}.png` })
    await panel.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(panel.getByText(count, { exact: true })).toBeVisible()
    expect((await snapshot(page)).geometries).toEqual(sceneToJson(source).geometries)
    await panel.getByRole('button', { name: COPY.scene.createFaceEdge.label, exact: true }).click()
    await panel.getByRole('button', { name: 'Aplicar', exact: true }).click()
    await expect(modes.getByRole('button', { name: 'Faces', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(panel.getByText('1 face escolhida', { exact: true })).toBeVisible()
    const created = await snapshot(page)
    expect(shape(created).vertices).toEqual(original.vertices)
    expect(Object.keys(shape(created).faces)).toHaveLength(6)
    for (const [id, face] of Object.entries(original.faces))
      expect(shape(created).faces[id]).toEqual(face)
    await panel.getByRole('button', { name: COPY.scene.facePreview.extrude, exact: true }).click()
    await panel.getByRole('spinbutton', { name: COPY.scene.extrudeAmount, exact: true }).fill('1')
    await panel.getByRole('button', { name: COPY.scene.previewConfirm, exact: true }).click()
    const pulled = await snapshot(page)
    expect(Object.keys(shape(pulled).faces)).toHaveLength(10)
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    expect((await snapshot(page)).geometries).toEqual(created.geometries)
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    expect((await snapshot(page)).geometries).toEqual(sceneToJson(source).geometries)
    await expect(page.getByRole('button', { name: 'Abrir o 3D de novo', exact: true })).toHaveCount(
      0,
    )
  })
}

test('creating a line from two points selects the line and allows pulling it into a face', async ({
  page,
}) => {
  const source = model('Criar linha', 'front')
  await load(page, source)
  const project = await view(page, source)
  const local = sceneLocalBounds(source, source.nodes[0]!.id)!
  const modes = page.getByRole('group', { name: 'Escolher', exact: true })
  await modes.getByRole('button', { name: 'Pontos', exact: true }).click()
  for (const point of [
    [local.min[0], local.min[1], local.max[2]],
    [local.max[0], local.max[1], local.max[2]],
  ] as Array<[number, number, number]>) {
    const p = project(point)
    await page.keyboard.down('Shift')
    await page.mouse.click(p.x, p.y)
    await page.keyboard.up('Shift')
  }
  const panel = page.locator('.mld-component-root')
  await expect(panel.getByText('2 pontos escolhidos', { exact: true })).toBeVisible()
  await panel.getByRole('button', { name: COPY.scene.createFaceEdge.label, exact: true }).click()
  await panel.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(modes.getByRole('button', { name: 'Linhas', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(panel.getByText('1 linha escolhida', { exact: true })).toBeVisible()
  const line = await snapshot(page)
  expect(shape(line).looseEdges).toHaveLength(1)
  expect(Object.keys(shape(line).faces)).toHaveLength(5)
  await page.screenshot({ path: '.cache/criar-face-painel-linhas.png' })
  await panel.getByRole('button', { name: 'Puxar linhas', exact: true }).click()
  await panel.getByRole('spinbutton', { name: 'Puxar Z', exact: true }).fill('1')
  await panel.getByRole('button', { name: 'Aplicar', exact: true }).click()
  const face = await snapshot(page)
  expect(shape(face).looseEdges).toHaveLength(0)
  expect(Object.keys(shape(face).faces)).toHaveLength(6)
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  expect((await snapshot(page)).geometries).toEqual(line.geometries)
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  expect((await snapshot(page)).geometries).toEqual(sceneToJson(source).geometries)
})

test('deleting one face leaves a hole and keeps the viewport editable through undo and redo', async ({
  page,
}) => {
  const source = model('Apagar uma face')
  const original = sceneGeometryMesh(source.geometries[0]!)
  const local = sceneLocalBounds(source, source.nodes[0]!.id)!
  const frontId = Object.keys(original.faces).find((id) =>
    original.faces[id]!.corners.every((c) => original.vertices[c.vertexId]![2] === local.max[2]),
  )!
  await load(page, source)
  let project = await view(page, source)
  const front = project([local.center[0], local.center[1], local.max[2]])
  const panel = page.locator('.mld-component-root')
  await page.mouse.click(front.x, front.y)
  await expect(panel.getByText('1 face escolhida', { exact: true })).toBeVisible()
  await panel.getByRole('button', { name: COPY.scene.faceActions.remove, exact: true }).click()
  await expect(page.getByRole('button', { name: 'Abrir o 3D de novo', exact: true })).toHaveCount(0)
  await expect(page.locator('canvas').first()).toBeVisible()
  const deleted = await snapshot(page)
  expect(deleted.nodes).toEqual(sceneToJson(source).nodes)
  expect(shape(deleted).vertices).toEqual(original.vertices)
  expect(shape(deleted).faces).toEqual(
    Object.fromEntries(Object.entries(original.faces).filter(([id]) => id !== frontId)),
  )

  // A remaining face can still be selected and moved, without reopening the viewport.
  project = await view(page, source, 'right')
  const right = project([local.max[0], local.center[1], local.center[2]])
  await page.mouse.click(right.x, right.y)
  await expect(panel.getByText('1 face escolhida', { exact: true })).toBeVisible()
  await page
    .getByRole('button', { name: 'Mover', exact: true })
    .and(page.locator('[aria-keyshortcuts="G"]'))
    .click()
  await page.getByRole('button', { name: 'Mover no eixo Y', exact: true }).press('ArrowUp')
  const moved = await snapshot(page)
  expect(shape(moved).vertices).not.toEqual(shape(deleted).vertices)
  expect(Object.keys(shape(moved).faces)).toHaveLength(5)
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  expect((await snapshot(page)).geometries).toEqual(deleted.geometries)
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  expect((await snapshot(page)).geometries).toEqual(sceneToJson(source).geometries)
  await page.getByRole('button', { name: COPY.editor.redo, exact: true }).click()
  expect((await snapshot(page)).geometries).toEqual(deleted.geometries)
  await expect(page.getByRole('button', { name: 'Abrir o 3D de novo', exact: true })).toHaveCount(0)
  await page.screenshot({ path: '.cache/face-apagada-editor-ativo.png' })
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

test('a native wheel cap can be selected against a flush body, expanded to its flat side and extruded with one undo', async ({
  page,
}) => {
  const f = makeSceneWheelSelection()
  await load(page, f.document)
  const project = await view(page, f.document, 'front', f.wheelId)
  const point = project(f.capPoint)
  const panel = page.locator('.mld-component-root')
  await page.mouse.click(point.x, point.y)
  await expect(panel.getByText('1 face escolhida', { exact: true })).toBeVisible()
  const adjacent = panel.getByRole('checkbox', {
    name: COPY.scene.componentCoplanarFaces,
    exact: true,
  })
  await adjacent.check()
  await expect(panel.getByText('8 faces escolhidas', { exact: true })).toBeVisible()
  expect((await snapshot(page)).geometries).toEqual(sceneToJson(f.document).geometries)
  await adjacent.uncheck()
  const other = project([-0.4, 1, 0.25])
  await page.mouse.click(other.x, other.y)
  await expect(panel.getByText('1 face escolhida', { exact: true })).toBeVisible()
  await adjacent.check()
  await expect(panel.getByText('8 faces escolhidas', { exact: true })).toBeVisible()
  await page.screenshot({ path: '.cache/cilindro-selecao-lado-plano.png' })
  await panel.getByRole('button', { name: COPY.scene.facePreview.extrude, exact: true }).click()
  await panel.getByRole('spinbutton', { name: COPY.scene.extrudeAmount, exact: true }).fill('1')
  await expect(
    panel.getByRole('button', { name: COPY.scene.previewConfirm, exact: true }),
  ).toBeEnabled()
  await panel.getByRole('button', { name: COPY.scene.previewConfirm, exact: true }).click()
  const changed = await snapshot(page)
  const wheel = changed.geometries.find((g) => g.id === f.mesh.id)!
  if (wheel.kind !== 'mesh') throw new Error('Expected converted wheel')
  expect(Object.keys(wheel.faces)).toHaveLength(32)
  expect(changed.geometries[0]).toEqual(sceneToJson(f.document).geometries[0])
  expect(changed.nodes).toEqual(sceneToJson(f.document).nodes)
  await expect(panel.getByText('8 faces escolhidas', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  expect((await snapshot(page)).geometries).toEqual(sceneToJson(f.document).geometries)
})

test('Inset Selection makes one wheel rim, keeps the center selected for pulling and undoes each operation', async ({
  page,
}) => {
  const f = makeSceneWheelSelection()
  await load(page, f.document)
  const project = await view(page, f.document, 'free', f.wheelId)
  const point = project([0.25, 1, 0.4])
  const panel = page.locator('.mld-component-root')
  await page.mouse.click(point.x, point.y)
  await expect(panel.getByText('1 face escolhida', { exact: true })).toBeVisible()
  await panel
    .getByRole('checkbox', { name: COPY.scene.componentCoplanarFaces, exact: true })
    .check()
  await expect(panel.getByText('8 faces escolhidas', { exact: true })).toBeVisible()
  await panel.getByRole('button', { name: COPY.scene.facePreview.inset, exact: true }).click()
  await panel.getByRole('spinbutton', { name: COPY.scene.insetAmount, exact: true }).fill('25')
  await expect(
    panel.getByRole('button', { name: COPY.scene.previewConfirm, exact: true }),
  ).toBeEnabled()
  await panel.getByRole('button', { name: COPY.scene.previewCancel, exact: true }).click()
  expect((await snapshot(page)).geometries).toEqual(sceneToJson(f.document).geometries)
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
  await panel.getByRole('button', { name: COPY.scene.facePreview.inset, exact: true }).click()
  await panel.getByRole('spinbutton', { name: COPY.scene.insetAmount, exact: true }).fill('25')
  await panel.getByRole('button', { name: COPY.scene.previewConfirm, exact: true }).click()
  await expect(panel.getByText('8 faces escolhidas', { exact: true })).toBeVisible()
  const inset = await snapshot(page)
  const wheel = inset.geometries.find((g) => g.id === f.mesh.id)!
  if (wheel.kind !== 'mesh') throw new Error('Missing inset wheel')
  expect(Object.keys(wheel.faces)).toHaveLength(32)
  expect(Object.keys(wheel.vertices)).toHaveLength(26)
  await page.screenshot({ path: '.cache/inset-selection-roda.png' })
  await panel.getByRole('button', { name: COPY.scene.facePreview.extrude, exact: true }).click()
  await panel.getByRole('spinbutton', { name: COPY.scene.extrudeAmount, exact: true }).fill('0.3')
  await panel.getByRole('button', { name: COPY.scene.previewConfirm, exact: true }).click()
  const pulled = await snapshot(page)
  const pulledWheel = pulled.geometries.find((g) => g.id === f.mesh.id)!
  if (pulledWheel.kind !== 'mesh') throw new Error('Missing pulled wheel')
  expect(Object.keys(pulledWheel.faces)).toHaveLength(40)
  expect(Object.keys(pulledWheel.vertices)).toHaveLength(34)
  expect(pulled.geometries[0]).toEqual(sceneToJson(f.document).geometries[0])
  await page.screenshot({ path: '.cache/inset-selection-roda-puxar.png' })
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  expect((await snapshot(page)).geometries).toEqual(inset.geometries)
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  expect((await snapshot(page)).geometries).toEqual(sceneToJson(f.document).geometries)
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
