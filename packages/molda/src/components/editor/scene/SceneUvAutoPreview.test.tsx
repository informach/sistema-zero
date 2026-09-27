import { expect, test } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneMeshGeometry } from '../../../scene/document'
import { autoMeshUv } from '../../../scene/meshUvAuto'
import { unfoldMeshUv } from '../../../scene/meshUvUnfold'
import { makeSceneGridGeometry } from '../../../testing/sceneFixtures'
import { SceneUvAutoPreview } from './SceneUvAutoPreview'

test('UV method/cut changes cancel old previews; preserving existing cuts is scoped to the selected faces', async () => {
  const mesh = makeSceneGridGeometry(3),
    ids = ['f_0_0', 'f_1_0', 'f_0_1', 'f_1_1']
  const applied: SceneMeshGeometry[] = []
  const props = {
    mesh,
    ids,
    sourceKey: 'revision',
    disabled: false,
    onApply: (mesh: SceneMeshGeometry) => {
      applied.push(mesh)
    },
  }
  const view = render(
    <StrictMode>
      <SceneUvAutoPreview {...props} />
    </StrictMode>,
  )
  const copy = COPY.scene
  const prepare = () => fireEvent.click(screen.getByRole('button', { name: copy.uvAutoPrepare }))
  const ready = () =>
    waitFor(
      () => expect(screen.queryByRole('button', { name: copy.uvAutoConfirm }) !== null).toBe(true),
      { timeout: 5000 },
    )
  const confirm = () => fireEvent.click(screen.getByRole('button', { name: copy.uvAutoConfirm }))
  try {
    fireEvent.change(screen.getByRole('combobox', { name: copy.uvAutoMethod }), {
      target: { value: 'connected' },
    })
    prepare()
    await ready()
    expect(applied).toHaveLength(0)
    expect(screen.queryByRole('button', { name: copy.uvCanvasControl })).toBeNull()
    fireEvent.click(screen.getByRole('checkbox', { name: copy.uvPreserveCuts }))
    expect(screen.queryByRole('button', { name: copy.uvAutoConfirm })).toBeNull()
    prepare()
    await ready()
    confirm()
    expect(applied[0]).toEqual(autoMeshUv(mesh, ids, 0.01))
    expect(applied[0]!.faces.f_2_2).toBe(mesh.faces.f_2_2)
    fireEvent.click(screen.getByRole('checkbox', { name: copy.uvPreserveCuts }))
    prepare()
    fireEvent.change(screen.getByRole('combobox', { name: copy.uvAutoMethod }), {
      target: { value: 'faces' },
    })
    expect(screen.queryByRole('button', { name: copy.uvAutoConfirm })).toBeNull()
    fireEvent.change(screen.getByRole('combobox', { name: copy.uvAutoMethod }), {
      target: { value: 'connected' },
    })
    prepare()
    await ready()
    confirm()
    expect(applied[1]).toEqual(unfoldMeshUv(mesh, ids, 0.01))
    expect(applied).toHaveLength(2)
    view.rerender(
      <StrictMode>
        <SceneUvAutoPreview {...props} disabled />
      </StrictMode>,
    )
    expect(screen.getByRole('button', { name: copy.uvAutoPrepare }).hasAttribute('disabled')).toBe(
      true,
    )
  } finally {
    view.unmount()
  }
})
