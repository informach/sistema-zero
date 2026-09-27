import { expect, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import type { SceneMeshGeometry } from '../../../scene/document'
import { makeSceneGridGeometry } from '../../../testing/sceneFixtures'
import { useSceneUvPreview } from './useSceneUvPreview'

test('UV preview cancels when another gesture blocks it, rejects captured confirmations and terminates work on selection/unmount', async () => {
  const mesh = makeSceneGridGeometry(4)
  const applied: SceneMeshGeometry[] = []
  const onApply = (mesh: SceneMeshGeometry) => {
    applied.push(mesh)
  }
  const props = { key: 'document:revision:node', ids: ['f_0_0', 'f_1_1'], disabled: false }
  const view = renderHook(
    (current: typeof props) =>
      useSceneUvPreview(mesh, current.key, current.ids, onApply, current.disabled),
    { initialProps: props, wrapper: StrictMode },
  )
  try {
    await act(async () => {
      await view.result.current.prepare(0.01)
    })
    expect(view.result.current.result !== undefined).toBe(true)
    const oldConfirm = view.result.current.confirm
    view.rerender({ ...props, disabled: true })
    expect(view.result.current.result).toBeUndefined()
    act(oldConfirm)
    expect(applied).toHaveLength(0)
    await act(async () => {
      await view.result.current.prepare(0.01)
    })
    expect(view.result.current.busy).toBe(false)
    view.rerender(props)
    let pending: Promise<void> | undefined
    act(() => {
      pending = view.result.current.prepare(0.01)
    })
    view.rerender({ ...props, ids: ['f_2_2'] })
    await act(async () => {
      await pending
    })
    expect(view.result.current.result).toBeUndefined()
    expect(view.result.current.busy).toBe(false)
    expect(view.result.current.error).toBeNull()
    act(() => {
      pending = view.result.current.prepare(0.01)
    })
    view.unmount()
    await pending
    expect(applied).toHaveLength(0)
  } finally {
    view.unmount()
  }
})
