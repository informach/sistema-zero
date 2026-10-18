import { expect, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import type { SceneMeshGeometry } from '../../../scene/document'
import { mapMeshUv } from '../../../scene/meshUv'
import { makeSceneGridGeometry } from '../../../testing/sceneFixtures'
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
