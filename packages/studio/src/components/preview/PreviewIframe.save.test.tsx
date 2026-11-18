import { expect, it } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createEmptyProject } from '#core'
import { StudioStoresContext } from '../../state/storesContext'
import { createStudioStores } from '../../state/studioStores'
import { type StudioExecutionPolicy, StudioExecutionProvider } from '../../studio/observation'
import { PreviewIframe } from './PreviewIframe'

function fixture() {
  let confirm = () => {}
  let fail = (_error: Error) => {}
  const acknowledgement = new Promise<void>((resolve, reject) => {
    confirm = resolve
    fail = reject
  })
  const writes: string[] = []
  const stores = createStudioStores({
    persistence: {
      load: async () => null,
      save: async (project) => {
        writes.push(project.files?.['script.js'] ?? '')
        await acknowledgement
      },
    },
  })
  const project = createEmptyProject(crypto.randomUUID(), 'Guardar antes de rodar')
  stores.project.getState().hydrateProject(project)
  stores.ui.getState().setPreviewRunning(false)
  let authority: StudioExecutionPolicy = {
    editingAccess: 'author',
    autoRun: true,
    requireIsolatedPreview: false,
    muted: false,
  }
  const tree = () => (
    <StudioStoresContext.Provider value={stores}>
      <StudioExecutionProvider value={{ ...authority }}>
        <PreviewIframe />
      </StudioExecutionProvider>
    </StudioStoresContext.Provider>
  )
  const view = render(tree())
  fireEvent.load(screen.getByTitle('Pré-visualização'))
  return {
    stores,
    writes,
    confirm,
    fail,
    view,
    rerender: () => view.rerender(tree()),
    changeAuthority: (change: Partial<StudioExecutionPolicy>) => {
      authority = { ...authority, ...change }
      view.rerender(tree())
    },
  }
}

it('Rodar waits for the host save and executes the latest buffered code without debounce delay', async () => {
  const f = fixture()
  const code = 'window.SAVED_REVISION = "latest buffered edit";'
  const unregister = f.stores.pendingEditorEdits.register(() => {
    unregister()
    f.stores.project.getState().setFile('script.js', code)
  })
  act(() => {
    f.stores.project.getState().setFile('script.js', 'window.DIRTY = true;')
    f.stores.proRun.getState().actions?.run()
  })
  await waitFor(() => expect(f.writes).toEqual([code]))
  expect(f.stores.proRun.getState().state?.phase).toBe('preparing')
  expect(screen.getByTitle('Pré-visualização').getAttribute('srcdoc')).not.toContain(btoa(code))
  await act(async () => f.confirm())
  await waitFor(() => {
    expect(screen.getByTitle('Pré-visualização').getAttribute('srcdoc')).toContain(btoa(code))
    expect(f.stores.proRun.getState().state?.phase).toBe('running')
  })
})

it('Parar while saving preserves the write and prevents a late start', async () => {
  const f = fixture()
  act(() => {
    f.stores.project.getState().setFile('script.js', 'window.PRESERVED = true;')
    f.stores.proRun.getState().actions?.run()
  })
  await waitFor(() => expect(f.stores.proRun.getState().state?.phase).toBe('preparing'))
  act(() => f.stores.proRun.getState().actions?.stop())
  await act(async () => f.confirm())
  expect(f.stores.ui.getState().previewRunning).toBe(false)
  expect(f.stores.project.getState().isDirty).toBe(false)
  expect(f.writes).toEqual(['window.PRESERVED = true;'])
  expect(f.stores.proRun.getState().state?.phase).toBe('idle')
})

it('falha de gravação não impede rodar: o jogo roda, o código fica e o selo guarda o erro', async () => {
  const f = fixture()
  const code = 'window.DO_NOT_LOSE = true;'
  act(() => {
    f.stores.project.getState().setFile('script.js', code)
    f.stores.proRun.getState().actions?.run()
  })
  await act(async () => f.fail(new Error('Cota excedida')))
  await waitFor(() => expect(f.stores.proRun.getState().state?.phase).toBe('running'))
  expect(screen.getByTitle('Pré-visualização').getAttribute('srcdoc')).toContain(btoa(code))
  expect(f.stores.project.getState().isDirty).toBe(true)
  expect(f.stores.project.getState().saveError).toContain('Cota excedida')
  expect(f.stores.project.getState().project?.files?.['script.js']).toBe(code)
})

it('gravação que nunca responde não prende o Rodar', async () => {
  const f = fixture()
  const code = 'window.SLOW_SAVE = true;'
  act(() => {
    f.stores.project.getState().setFile('script.js', code)
    f.stores.proRun.getState().actions?.run()
  })
  expect(f.stores.proRun.getState().state?.phase).toBe('preparing')
  await waitFor(() => expect(f.stores.proRun.getState().state?.phase).toBe('running'), {
    timeout: 3000,
  })
  expect(screen.getByTitle('Pré-visualização').getAttribute('srcdoc')).toContain(btoa(code))
})

it('Rodar sem mudança troca a prévia no mesmo instante e não grava de novo', async () => {
  const f = fixture()
  act(() => f.stores.proRun.getState().actions?.run())
  expect(f.stores.ui.getState().previewRunning).toBe(true)
  expect(f.stores.proRun.getState().state?.detail).toBeUndefined()
  act(() => f.stores.proRun.getState().actions?.reload?.())
  expect(f.writes).toEqual([])
})

it('closing the preview while saving cannot start a new game after acknowledgement', async () => {
  const f = fixture()
  act(() => {
    f.stores.project.getState().setFile('script.js', 'window.DIRTY = true;')
    f.stores.proRun.getState().actions?.run()
  })
  f.view.unmount()
  await act(async () => f.confirm())
  expect(f.writes).toHaveLength(1)
  expect(f.stores.ui.getState().previewRunning).toBe(false)
  expect(f.stores.proRun.getState().state).toBeNull()
})

it('switching projects while saving cannot start the replacement project', async () => {
  const f = fixture()
  act(() => {
    f.stores.project.getState().setFile('script.js', 'window.DIRTY = true;')
    f.stores.proRun.getState().actions?.run()
  })
  act(() =>
    f.stores.project
      .getState()
      .hydrateProject(createEmptyProject(crypto.randomUUID(), 'Outro projeto')),
  )
  await act(async () => f.confirm())
  expect(f.stores.ui.getState().previewRunning).toBe(false)
  expect(f.stores.proRun.getState().state?.phase).toBe('idle')
})

it('repeated Rodar while saving starts only one write', async () => {
  const f = fixture()
  act(() => {
    f.stores.project.getState().setFile('script.js', 'window.DIRTY = true;')
    f.stores.proRun.getState().actions?.run()
    f.stores.proRun.getState().actions?.run()
  })
  expect(f.writes).toHaveLength(1)
  await act(async () => f.confirm())
  await waitFor(() => expect(f.stores.proRun.getState().state?.phase).toBe('running'))
})

it('a host rerender with unchanged execution authority does not cancel the run', async () => {
  const f = fixture()
  act(() => {
    f.stores.project.getState().setFile('script.js', 'window.DIRTY = true;')
    f.stores.proRun.getState().actions?.run()
  })
  f.rerender()
  await act(async () => f.confirm())
  await waitFor(() => expect(f.stores.proRun.getState().state?.phase).toBe('running'))
})

it('revoking write authority while saving prevents a late run', async () => {
  const f = fixture()
  act(() => {
    f.stores.project.getState().setFile('script.js', 'window.DIRTY = true;')
    f.stores.proRun.getState().actions?.run()
  })
  f.changeAuthority({ editingAccess: 'observer' })
  await act(async () => f.confirm())
  expect(f.writes).toHaveLength(1)
  expect(f.stores.ui.getState().previewRunning).toBe(false)
  expect(f.stores.proRun.getState().state?.canRun).toBe(false)
})

it('a new writer generation cannot inherit an old run request', async () => {
  const f = fixture()
  act(() => {
    f.stores.project.getState().setFile('script.js', 'window.DIRTY = true;')
    f.stores.proRun.getState().actions?.run()
  })
  f.changeAuthority({ writerEpoch: 2 })
  await act(async () => f.confirm())
  expect(f.writes).toHaveLength(1)
  expect(f.stores.ui.getState().previewRunning).toBe(false)
})

it('automatic preview updates cannot bypass Rodar de novo while its save is pending', async () => {
  const f = fixture()
  act(() => f.stores.ui.getState().setPreviewRunning(true))
  const previous = await waitFor(() => {
    const doc = screen.getByTitle('Pré-visualização').getAttribute('srcdoc')
    expect(doc).toContain('<!-- r:1 -->')
    return doc
  })
  const code = 'window.WAIT_FOR_SAVE = true;'
  act(() => {
    f.stores.project.getState().setFile('script.js', code)
    f.stores.proRun.getState().actions?.reload?.()
  })
  expect(f.stores.proRun.getState().state?.phase).toBe('preparing')
  // Observe beyond the documented 800 ms source debounce: it must not start this revision.
  await act(async () => {
    await Bun.sleep(900)
  })
  expect(screen.getByTitle('Pré-visualização').getAttribute('srcdoc')).toBe(previous)
  await act(async () => f.confirm())
  await waitFor(() =>
    expect(screen.getByTitle('Pré-visualização').getAttribute('srcdoc')).toContain(btoa(code)),
  )
})

it('switching a running project never executes the previous project source in the new preview', async () => {
  const f = fixture()
  const oldCode = 'window.PROJECT_A = true;'
  const newCode = 'window.PROJECT_B = true;'
  act(() => {
    f.stores.project.getState().setFile('script.js', oldCode)
    f.stores.ui.getState().setPreviewRunning(true)
  })
  await waitFor(() =>
    expect(screen.getByTitle('Pré-visualização').getAttribute('srcdoc')).toContain(btoa(oldCode)),
  )
  const next = createEmptyProject(crypto.randomUUID(), 'Projeto B')
  next.files['script.js'] = newCode
  act(() => f.stores.project.getState().hydrateProject(next))
  expect(screen.getByTitle('Pré-visualização').getAttribute('srcdoc')).not.toContain(btoa(oldCode))
  fireEvent.load(screen.getByTitle('Pré-visualização'))
  await waitFor(() =>
    expect(screen.getByTitle('Pré-visualização').getAttribute('srcdoc')).toContain(btoa(newCode)),
  )
})
