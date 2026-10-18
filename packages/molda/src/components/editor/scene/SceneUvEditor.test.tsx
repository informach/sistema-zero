import { expect, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import type { SceneMeshGeometry } from '../../../scene/document'
import { mapMeshUv } from '../../../scene/meshUv'
import { makeSceneGridGeometry } from '../../../testing/sceneFixtures'
import type { SceneUvTexture } from './SceneUvCanvas'
import { SceneUvCanvas } from './SceneUvCanvas'
import { SceneUvEditor } from './SceneUvEditor'

test('visual point movement keeps selected neighboring UV corners together without welding an existing seam', () => {
  const grid = makeSceneGridGeometry(2)
  const ids = Object.keys(grid.faces)
  const connected = mapMeshUv(grid, ids, (_uv, id, i) => {
    const point = grid.vertices[grid.faces[id]!.corners[i]!.vertexId]!
    return [point[0] * 2, point[1] * 2]
  })
  const mesh = mapMeshUv(connected, ['f_0_0'], (uv, _id, i) => (i === 2 ? [0.7, 0.7] : uv))
  const before = structuredClone(mesh)
  const prepared: SceneMeshGeometry[] = []
  const view = render(
    <SceneUvEditor
      mesh={mesh}
      sourceKey="same-sheet"
      blocked={false}
      ids={ids}
      onSelect={() => {}}
      onChoose={() => {}}
      onApply={() => {}}
      onApplyPrepared={(next) => prepared.push(next)}
    />,
  )
  try {
    expect(screen.queryByRole('spinbutton')).toBeNull()
    const canvas = screen.getByRole('button', { name: COPY.scene.uvCanvasControl })
    fireEvent.keyDown(canvas, { key: ' ' })
    fireEvent.keyDown(canvas, { key: 'ArrowRight' })
    expect(prepared).toEqual([])
    fireEvent.keyDown(canvas, { key: 'Enter' })
    expect(prepared).toHaveLength(1)
    const result = prepared[0]!
    for (const id of ['f_1_0', 'f_0_1', 'f_1_1']) {
      const corner = result.faces[id]!.corners.find((c) => c.vertexId === 'v_1_1')!
      expect(corner.uv).toEqual([0.51, 0.5])
    }
    expect(result.faces.f_0_0).toBe(mesh.faces.f_0_0)
    expect(result.vertices).toBe(mesh.vertices)
    expect(mesh).toEqual(before)
  } finally {
    view.unmount()
  }
})

test('free UV rotation previews by keyboard, cancels on owner changes, and commits only once', () => {
  const mesh = makeSceneGridGeometry(2)
  const before = structuredClone(mesh)
  const prepared: SceneMeshGeometry[] = []
  const texture: SceneUvTexture = {
    image: {
      id: 'pixels',
      name: 'Pixels',
      width: 16,
      height: 8,
      encoding: 'indexed',
      layers: [
        { id: 'paint', name: 'Desenho', visible: true, opacity: 1, pixels: new Uint8Array(128) },
      ],
    },
    palette: [[0, 0, 0, 0]],
    base: [0, 0, 0, 0],
  }
  const component = (sourceKey: string) => (
    <SceneUvEditor
      mesh={mesh}
      sourceKey={sourceKey}
      blocked={false}
      ids={['f_0_0']}
      onSelect={() => {}}
      onChoose={() => {}}
      onApply={() => {}}
      onApplyPrepared={(next) => prepared.push(next)}
      texture={texture}
      renderCanvas={(props) => (
        <SceneUvCanvas {...props} sheetScale={10} sheetSize={{ width: 16, height: 8 }} />
      )}
    />
  )
  const view = render(component('first-editor'))
  try {
    const handle = () => screen.getByRole('button', { name: 'Girar mapa livremente' })
    fireEvent.keyDown(handle(), { key: 'ArrowRight', shiftKey: true })
    expect(prepared).toHaveLength(0)
    expect(view.container.querySelector('[data-uv-rotation-preview]')).not.toBeNull()
    fireEvent.keyDown(handle(), { key: 'Escape' })
    expect(view.container.querySelector('[data-uv-rotation-preview]')).toBeNull()
    fireEvent.keyDown(handle(), { key: 'ArrowRight' })
    view.rerender(component('replacement-editor'))
    expect(view.container.querySelector('[data-uv-rotation-preview]')).toBeNull()
    fireEvent.keyDown(handle(), { key: 'Enter' })
    expect(prepared).toHaveLength(0)
    fireEvent.keyDown(handle(), { key: 'ArrowRight' })
    fireEvent.keyDown(handle(), { key: 'Enter' })
    expect(prepared).toHaveLength(1)
    expect(prepared[0]!.vertices).toBe(mesh.vertices)
    expect(prepared[0]!.faces.f_1_0).toBe(mesh.faces.f_1_0)
    expect(prepared[0]!.faces.f_0_0!.corners).not.toEqual(mesh.faces.f_0_0!.corners)
    const corners = prepared[0]!.faces.f_0_0!.corners
    expect(
      (Math.atan2(
        (corners[1]!.uv[1] - corners[0]!.uv[1]) * 8,
        (corners[1]!.uv[0] - corners[0]!.uv[0]) * 16,
      ) *
        180) /
        Math.PI,
    ).toBeCloseTo(1, 10)
    expect(mesh).toEqual(before)
  } finally {
    view.unmount()
  }
})
