import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneIndexRevision } from '../../../state/sceneIndexRevision'
import { createSceneStorageObserver } from '../../../state/sceneStorageObserver'
import { SceneStorageNotice } from './SceneStorageNotice'

test('manual check, focus and visible return refresh only the observation; unmount removes both listeners', async () => {
  let result: SceneIndexRevision = { status: 'indexed', revision: 1 }
  let reads = 0
  const observer = createSceneStorageObserver(
    'model-1',
    {
      subscribe: async () => ({ available: false, unsubscribe() {} }),
      readIndexRevision: async () => {
        reads++
        return result
      },
    },
    () => 1,
    () => false,
  )
  const originalVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState')
  let visibility: DocumentVisibilityState = 'visible'
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
  const view = render(
    <StrictMode>
      <SceneStorageNotice observer={observer} />
    </StrictMode>,
  )
  try {
    await act(async () => {
      await observer.refresh()
    })
    expect(screen.getByRole('status').textContent).toBe(COPY.scene.storage.unavailable)
    result = { status: 'unsupported' }
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.storage.check }))
    })
    expect(screen.getByRole('alert').textContent).toBe(COPY.scene.storage.unreadable)
    result = { status: 'indexed', revision: 2 }
    const beforeFocus = reads
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
    })
    expect(reads).toBe(beforeFocus + 1)
    expect(screen.getByRole('alert').textContent).toBe(COPY.scene.conflict)
    result = { status: 'deleted', revision: 3 }
    const beforeVisibility = reads
    visibility = 'hidden'
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(reads).toBe(beforeVisibility)
    visibility = 'visible'
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(reads).toBe(beforeVisibility + 1)
    expect(screen.getByRole('alert').textContent).toBe(COPY.scene.storage.deleted)
    view.unmount()
    const final = reads
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
    await observer.refresh()
    expect(reads).toBe(final)
  } finally {
    view.unmount()
    if (originalVisibility) Object.defineProperty(document, 'visibilityState', originalVisibility)
    else Reflect.deleteProperty(document, 'visibilityState')
  }
})
