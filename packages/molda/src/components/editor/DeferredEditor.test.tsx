import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentType } from 'react'
import { COPY } from '../../core/copy'
import { createEditorStore } from '../../state/editorStore'
import { createMemoryPersistence } from '../../state/memoryPersistence'
import { makeSky } from '../../testing/fixtures'
import { DeferredEditor, type EditorModuleProps } from './DeferredEditor'

test('module failure offers retry without touching the saved creation', async () => {
  const initial = makeSky()
  const persistence = createMemoryPersistence([initial])
  const editor = createEditorStore({ asset: initial, persistence })
  let calls = 0
  const load = async () => {
    calls += 1
    if (calls === 1) throw new Error('offline')
    return function Loaded({ onBack }: EditorModuleProps) {
      return (
        <button type="button" onClick={onBack}>
          Editor pronto
        </button>
      )
    }
  }
  let backs = 0
  render(
    <DeferredEditor
      load={load}
      editor={editor}
      onBack={() => {
        backs += 1
      }}
    />,
  )
  expect((await screen.findByRole('alert')).textContent).toBe(COPY.editor.loadError)
  expect(persistence.snapshot()).toEqual([initial])
  fireEvent.click(screen.getByRole('button', { name: COPY.gallery.retry }))
  fireEvent.click(await screen.findByRole('button', { name: 'Editor pronto' }))
  expect(backs).toBe(1)
  expect(calls).toBe(2)
  expect(editor.getState().saveState).toBe('saved')
  editor.getState().dispose()
})

test('leaving while a module loads ignores its late result', async () => {
  const gate: { resolve?: (value: ComponentType<EditorModuleProps>) => void } = {}
  const load = () =>
    new Promise<ComponentType<EditorModuleProps>>((resolve) => {
      gate.resolve = resolve
    })
  const editor = createEditorStore({ asset: makeSky(), persistence: createMemoryPersistence() })
  let mounted = 0
  const result = render(<DeferredEditor load={load} editor={editor} onBack={() => undefined} />)
  expect(screen.getByRole('status').textContent).toBe(COPY.editor.loading)
  await waitFor(() => expect(gate.resolve).toBeDefined())
  result.unmount()
  await act(async () => {
    gate.resolve?.(() => {
      mounted += 1
      return <p>Não montar</p>
    })
  })
  expect(mounted).toBe(0)
  editor.getState().dispose()
})
