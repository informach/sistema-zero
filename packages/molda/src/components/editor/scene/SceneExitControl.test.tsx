import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { COPY } from '../../../core/copy'
import { structuredBytes } from '../../../core/structuredBytes'
import { createSceneProject } from '../../../scene/createProject'
import type { MoldaSceneDocument } from '../../../scene/document'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { deferred } from '../../../testing/deferred'
import { SceneExitControl, type SceneExitMode } from './SceneExitControl'

const copy = COPY.scene.exit
function fixture() {
  const writes: Array<{ document: MoldaSceneDocument; done: ReturnType<typeof deferred<void>> }> =
    []
  const editor = createDocumentEditorStore({
    asset: createSceneProject({ kind: 'empty', name: 'Minha ideia' }),
    sizeOf: structuredBytes,
    autosaveMs: 60_000,
    persistence: {
      save: async (document) => {
        const done = deferred()
        writes.push({ document, done })
        await done.promise
      },
    },
  })
  editor.getState().commit({ ...editor.getState().asset, name: 'Editada' })
  return { editor, writes }
}
function dialog() {
  return within(screen.getByRole('dialog', { name: copy.title }))
}

test('saving locally keeps the workshop open when the Studio copy still needs review', async () => {
  const { editor, writes } = fixture()
  const exits: SceneExitMode[] = []
  const ready = deferred<boolean>()
  const view = render(
    <SceneExitControl
      editor={editor}
      cancelPreview={() => {}}
      backup={() => true}
      onExit={(mode) => exits.push(mode)}
      beforeExit={() => ready.promise}
    />,
  )
  try {
    fireEvent.click(screen.getByRole('button', { name: copy.open }))
    fireEvent.click(dialog().getByRole('button', { name: copy.save }))
    await act(async () => {
      writes[0]!.done.resolve()
    })
    expect(exits).toEqual([])
    await act(async () => {
      ready.resolve(false)
    })
    expect(exits).toEqual([])
    expect(editor.getState().saveState).toBe('saved')
    expect(screen.queryByRole('dialog', { name: copy.title })).toBeNull()
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

test('exit preserves previews on opening/cancel, waits for all writes and invalidates a cancelled pending navigation', async () => {
  const { editor, writes } = fixture()
  const exits: SceneExitMode[] = []
  let cancelled = 0
  const view = render(
    <StrictMode>
      <SceneExitControl
        editor={editor}
        cancelPreview={() => {
          cancelled++
        }}
        backup={() => true}
        onExit={(mode) => exits.push(mode)}
      />
    </StrictMode>,
  )
  try {
    const trigger = screen.getByRole('button', { name: copy.open })
    fireEvent.click(trigger)
    expect(cancelled).toBe(0)
    expect(writes).toHaveLength(0)
    fireEvent.click(dialog().getByRole('button', { name: copy.stay }))
    expect(document.activeElement === trigger).toBe(true)
    expect(editor.getState().canUndo).toBe(true)
    fireEvent.click(trigger)
    const save = dialog().getByRole('button', { name: copy.save })
    fireEvent.click(save)
    fireEvent.click(save)
    expect(writes).toHaveLength(1)
    expect(cancelled).toBe(1)
    expect(exits).toEqual([])
    expect(save.hasAttribute('disabled')).toBe(true)
    // Esc withdraws only the navigation intent, not the already authorized save.
    fireEvent.keyDown(document, { key: 'Escape' })
    await act(async () => {
      writes[0]?.done.resolve()
    })
    expect(exits).toEqual([])
    expect(editor.getState().saveState).toBe('saved')
    editor.getState().commit({ ...editor.getState().asset, name: 'Mais uma ideia' })
    fireEvent.click(trigger)
    fireEvent.click(dialog().getByRole('button', { name: copy.save }))
    // A save must drain a newer applied edit, not leave when only its first snapshot arrived.
    act(() => editor.getState().commit({ ...editor.getState().asset, name: 'Última ideia' }))
    await act(async () => {
      writes[1]?.done.resolve()
    })
    expect(writes).toHaveLength(3)
    expect(exits).toEqual([])
    await act(async () => {
      writes[2]?.done.resolve()
    })
    expect(exits).toEqual(['saved'])
    expect(editor.getState().asset === editor.getState().savedAsset).toBe(true)
    expect(writes[2]?.document.name).toBe('Última ideia')
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

test('exit save failure retains edits/history, exposes backup errors and requires explicit discard', async () => {
  const { editor, writes } = fixture()
  const exits: SceneExitMode[] = []
  let backups = 0
  const view = render(
    <SceneExitControl
      editor={editor}
      cancelPreview={() => {}}
      backup={() => {
        backups++
        return false
      }}
      onExit={(mode) => exits.push(mode)}
    />,
  )
  try {
    const edited = editor.getState().asset
    fireEvent.click(screen.getByRole('button', { name: copy.open }))
    fireEvent.click(dialog().getByRole('button', { name: copy.save }))
    await act(async () => {
      writes[0]?.done.reject(new Error('Quota'))
    })
    expect(dialog().getByRole('alert').textContent).toBe(COPY.editor.saveError)
    expect(exits).toEqual([])
    expect(editor.getState().asset === edited).toBe(true)
    expect(editor.getState().canUndo).toBe(true)
    fireEvent.click(dialog().getByRole('button', { name: COPY.scene.backup }))
    expect(backups).toBe(1)
    expect(dialog().getByRole('alert').textContent).toBe(COPY.scene.backupError)
    expect(writes).toHaveLength(1)
    fireEvent.click(dialog().getByRole('button', { name: copy.discard }))
    expect(exits).toEqual(['discard'])
    expect(writes).toHaveLength(1)
    expect(editor.getState().asset === edited).toBe(true)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

test('late save cannot exit a replaced editor/callback or an unmounted control', async () => {
  for (const replacement of ['editor', 'callback', 'unmount']) {
    const first = fixture(),
      second = fixture()
    const exits: string[] = []
    const oldExit = () => exits.push('old'),
      newExit = () => exits.push('new')
    const props = { cancelPreview: () => {}, backup: () => true }
    const view = render(
      <StrictMode>
        <SceneExitControl {...props} editor={first.editor} onExit={oldExit} />
      </StrictMode>,
    )
    try {
      fireEvent.click(screen.getByRole('button', { name: copy.open }))
      fireEvent.click(dialog().getByRole('button', { name: copy.save }))
      if (replacement === 'unmount') view.unmount()
      else
        view.rerender(
          <StrictMode>
            <SceneExitControl
              {...props}
              editor={replacement === 'editor' ? second.editor : first.editor}
              onExit={replacement === 'callback' ? newExit : oldExit}
            />
          </StrictMode>,
        )
      expect(screen.queryByRole('dialog') === null).toBe(true)
      await act(async () => {
        first.writes[0]?.done.resolve()
      })
      expect(exits).toEqual([])
      if (replacement !== 'unmount') {
        fireEvent.click(screen.getByRole('button', { name: copy.open }))
        fireEvent.click(dialog().getByRole('button', { name: copy.save }))
        await act(async () => {
          second.writes[0]?.done.resolve()
        })
        expect(exits).toEqual([replacement === 'callback' ? 'new' : 'old'])
      }
    } finally {
      view.unmount()
      first.editor.getState().dispose()
      second.editor.getState().dispose()
    }
  }
})
