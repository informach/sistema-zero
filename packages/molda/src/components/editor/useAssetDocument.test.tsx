import { expect, test } from 'bun:test'
import { act, renderHook, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { MoldaUnsupportedVersionError } from '../../core/documentVersion'
import type { MoldaAsset } from '../../core/model'
import { createMemoryPersistence } from '../../state/memoryPersistence'
import { makeModel, makeSky } from '../../testing/fixtures'
import { useAssetDocument } from './useAssetDocument'

test('document load ignores an old creation resolving after a new one', async () => {
  const p = createMemoryPersistence()
  const requests = new Map<string, (asset: MoldaAsset | null) => void>()
  p.load = (id) =>
    new Promise((resolve) => {
      requests.set(id, resolve)
    })
  const { result, rerender } = renderHook(({ id }) => useAssetDocument(p, id), {
    initialProps: { id: 'model-1' },
  })
  await waitFor(() => expect(requests.has('model-1')).toBe(true))
  rerender({ id: 'sky-1' })
  await waitFor(() => expect(requests.has('sky-1')).toBe(true))
  await act(async () => {
    requests.get('sky-1')?.(makeSky())
  })
  expect(result.current.state).toEqual({ status: 'ready', asset: makeSky() })
  await act(async () => {
    requests.get('model-1')?.(makeModel())
  })
  expect(result.current.state).toEqual({ status: 'ready', asset: makeSky() })
})

test('load failures stay recoverable; retry reads again and unsupported data is never made editable', async () => {
  const p = createMemoryPersistence([makeModel()])
  const read = p.load.bind(p)
  p.load = async () => {
    throw new MoldaUnsupportedVersionError(2)
  }
  const { result } = renderHook(() => useAssetDocument(p, 'model-1'))
  await waitFor(() =>
    expect(result.current.state).toEqual({ status: 'error', message: COPY.gallery.recoveryHint }),
  )
  p.load = async () => {
    throw new Error('disk unavailable')
  }
  act(() => result.current.retry())
  await waitFor(() =>
    expect(result.current.state).toEqual({ status: 'error', message: COPY.editor.loadError }),
  )
  p.load = read
  act(() => result.current.retry())
  await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', asset: makeModel() }))
})

test('completion after unmount cannot acquire a document', async () => {
  const p = createMemoryPersistence()
  let finish: ((asset: MoldaAsset | null) => void) | undefined
  p.load = () =>
    new Promise((resolve) => {
      finish = resolve
    })
  const { result, unmount } = renderHook(() => useAssetDocument(p, 'model-1'))
  await waitFor(() => expect(finish).toBeDefined())
  unmount()
  await act(async () => {
    finish?.(makeModel())
  })
  expect(result.current.state.status).toBe('loading')
})
