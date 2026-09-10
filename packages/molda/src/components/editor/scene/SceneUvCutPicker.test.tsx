import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneMeshGeometry } from '../../../scene/document'
import { meshEdgeKey } from '../../../scene/meshTopology'
import { unfoldMeshUv } from '../../../scene/meshUvUnfold'
import { makeSceneGridGeometry } from '../../../testing/sceneFixtures'
import { SceneUvAutoPreview } from './SceneUvAutoPreview'

test('cut picking keeps a session-only focus, toggles one shared edge once and sends exact cut instructions', async () => {
  const mesh = makeSceneGridGeometry(2),
    ids = Object.keys(mesh.faces),
    before = structuredClone(mesh)
  const applied: SceneMeshGeometry[] = []
  const props = {
    mesh,
    ids,
    sourceKey: 'revision:1',
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
  const copy = COPY.scene,
    key = meshEdgeKey('v_1_0', 'v_1_1')
  const ready = () =>
    waitFor(
      () => expect(screen.queryByRole('button', { name: copy.uvAutoConfirm }) !== null).toBe(true),
      { timeout: 5000 },
    )
  const mark = () => fireEvent.click(screen.getByRole('button', { name: copy.uvCutToggle }))
  const face = (value: string) =>
    fireEvent.change(screen.getByRole('spinbutton', { name: copy.uvCutFace }), {
      target: { value },
    })
  const edge = (value: string) =>
    fireEvent.change(screen.getByRole('combobox', { name: copy.uvCutEdge }), { target: { value } })
  try {
    fireEvent.change(screen.getByRole('combobox', { name: copy.uvAutoMethod }), {
      target: { value: 'connected' },
    })
    expect(screen.queryByRole('img', { name: copy.uvCutCanvas })).toBeNull()
    const details = screen.getByText(copy.uvCutTitle).closest('details')!
    act(() => {
      details.open = true
      fireEvent(details, new Event('toggle'))
    })
    edge('1')
    mark()
    expect(
      screen.getByRole('button', { name: copy.uvCutToggle }).getAttribute('aria-pressed'),
    ).toBe('true')
    expect(screen.queryByText(copy.uvCutCount(1))).not.toBeNull()
    expect(applied).toHaveLength(0)
    expect(mesh).toEqual(before)
    face('2')
    edge('3') // Same edge, opposite half-edge; never add a duplicate instruction.
    expect(
      screen.getByRole('button', { name: copy.uvCutToggle }).getAttribute('aria-pressed'),
    ).toBe('true')
    mark()
    expect(screen.queryByText(copy.uvCutCount(0))).not.toBeNull()
    mark()
    face('')
    expect(
      screen.getByRole('spinbutton', { name: copy.uvCutFace }).getAttribute('aria-invalid'),
    ).toBe('true')
    expect(screen.getByRole('button', { name: copy.uvCutToggle }).hasAttribute('disabled')).toBe(
      true,
    )
    face('1')
    edge('1')
    fireEvent.click(screen.getByRole('button', { name: copy.uvAutoPrepare }))
    await ready()
    fireEvent.click(screen.getByRole('button', { name: copy.uvAutoConfirm }))
    expect(applied[0]).toEqual(unfoldMeshUv(mesh, ids, 0.01, [key]))
    expect(ids).toEqual(Object.keys(mesh.faces))
    view.rerender(
      <StrictMode>
        <SceneUvAutoPreview {...props} sourceKey="revision:2" />
      </StrictMode>,
    )
    expect(screen.queryByText(copy.uvCutCount(0))).not.toBeNull()
    expect(
      (screen.getByRole('spinbutton', { name: copy.uvCutFace }) as HTMLInputElement).value,
    ).toBe('1')
    edge('1')
    mark()
    fireEvent.click(screen.getByRole('button', { name: copy.uvAutoPrepare }))
    fireEvent.click(screen.getByRole('button', { name: copy.uvCutClear }))
    expect(screen.queryByRole('button', { name: copy.uvAutoConfirm })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: copy.uvAutoPrepare }))
    await ready()
    fireEvent.click(screen.getByRole('button', { name: copy.uvAutoConfirm }))
    expect(applied[1]).toEqual(unfoldMeshUv(mesh, ids, 0.01))
    expect(applied).toHaveLength(2)
    mark()
    view.rerender(
      <StrictMode>
        <SceneUvAutoPreview {...props} sourceKey="revision:2" ids={['f_0_0', 'f_0_1']} />
      </StrictMode>,
    )
    expect(screen.queryByText(copy.uvCutCount(0))).not.toBeNull()
    mark()
    view.rerender(
      <StrictMode>
        <SceneUvAutoPreview
          {...props}
          mesh={{ ...mesh }}
          sourceKey="revision:2"
          ids={['f_0_0', 'f_0_1']}
        />
      </StrictMode>,
    )
    expect(screen.queryByText(copy.uvCutCount(0))).not.toBeNull()
    act(() => {
      details.open = false
      fireEvent(details, new Event('toggle'))
    })
    expect(screen.queryByRole('img', { name: copy.uvCutCanvas })).toBeNull()
  } finally {
    view.unmount()
  }
})
