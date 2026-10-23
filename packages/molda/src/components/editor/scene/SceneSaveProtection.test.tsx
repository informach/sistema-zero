import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import { structuredBytes } from '../../../core/structuredBytes'
import { createSceneProject } from '../../../scene/createProject'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { SceneSaveProtection } from './SceneSaveProtection'

test('a successful automatic save stays silent', async () => {
  const editor = createDocumentEditorStore({
    asset: createSceneProject({ kind: 'empty', name: 'Minha ideia' }),
    sizeOf: structuredBytes,
    autosaveMs: 60_000,
    persistence: { save: async () => {} },
  })
  const view = render(<SceneSaveProtection editor={editor} backup={() => true} />)
  try {
    await act(async () => {
      editor.getState().commit({ ...editor.getState().asset, name: 'Editada' })
      await editor.getState().flush()
    })
    expect(editor.getState().saveState).toBe('saved')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

test('the same save failure warns once while its persistent banner remains available', async () => {
  let fail = true
  const editor = createDocumentEditorStore({
    asset: createSceneProject({ kind: 'empty', name: 'Minha ideia' }),
    sizeOf: structuredBytes,
    autosaveMs: 60_000,
    persistence: {
      save: async () => {
        if (fail) throw new Error('storage unavailable')
      },
    },
  })
  const view = render(<SceneSaveProtection editor={editor} backup={() => true} />)
  try {
    const edit = (name: string) => editor.getState().commit({ ...editor.getState().asset, name })
    await act(async () => {
      edit('Primeira edição')
      await editor.getState().flush()
    })
    const title = 'Vamos proteger sua criação'
    expect(screen.getByRole('dialog', { name: title })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar à criação' }))
    expect(screen.queryByRole('dialog', { name: title })).toBeNull()

    fail = false
    await act(async () => {
      await editor.getState().flush()
    })
    expect(editor.getState().saveState).toBe('saved')

    fail = true
    await act(async () => {
      edit('Segunda edição')
      await editor.getState().flush()
    })
    expect(editor.getState().saveError).toBe(COPY.editor.saveError)
    expect(screen.queryByRole('dialog', { name: title })).toBeNull()
    expect(screen.getByRole('alert')).toBeDefined()
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})
