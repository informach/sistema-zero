import { describe, expect, it } from 'bun:test'
import { act, fireEvent, render } from '@testing-library/react'
import type { ProjectTree } from '../../../core/proProject'
import { StudioStoresContext } from '../../../state/storesContext'
import { createStudioStores } from '../../../state/studioStores'
import {
  emptyWorkspace,
  openWorkspaceFile,
  type ProWorkspacePreferences,
  remapWorkspace,
} from './model'
import { useProWorkspace } from './useProWorkspace'

const tree: ProjectTree = {
  'a.ts': { kind: 'file', content: '' },
  'b.ts': { kind: 'file', content: '' },
}
function Harness() {
  const workspace = useProWorkspace('project', tree)
  return (
    <>
      <output>{workspace.state.activeFile}</output>
      <button
        type="button"
        onClick={() =>
          workspace.change((state) => ({
            ...state,
            sizes: [state.sizes[0]! + 1, state.sizes[1]! - 1, state.sizes[2]!],
          }))
        }
      >
        Ajustar largura
      </button>
      <button
        type="button"
        onClick={() => workspace.change((state) => openWorkspaceFile(state, 'b.ts'))}
      >
        Abrir B
      </button>
      {workspace.error && <p role="status">{workspace.error}</p>}
    </>
  )
}

describe('retomada do workspace', () => {
  it('coalesces rapid resizing while a preference write is in flight', async () => {
    const first = Promise.withResolvers<void>()
    const writes: ProWorkspacePreferences[] = []
    const stores = createStudioStores({
      persistence: 'none',
      workspacePreferences: {
        load: async () => null,
        save: async (_id, value) => {
          writes.push(value)
          if (writes.length === 1) await first.promise
        },
      },
    })
    const view = render(
      <StudioStoresContext.Provider value={stores}>
        <Harness />
      </StudioStoresContext.Provider>,
    )
    await act(async () => {
      await Promise.resolve()
    })
    const initial = writes[0]!.sizes[0]!
    for (let i = 0; i < 8; i++) fireEvent.click(view.getByText('Ajustar largura'))
    expect(writes).toHaveLength(1)
    await act(async () => {
      first.resolve()
    })
    expect(writes).toHaveLength(2)
    expect(writes[1]!.sizes[0]).toBe(initial + 8)
  })
  it('a delayed read never replaces navigation already made by the learner', async () => {
    const loading = Promise.withResolvers<unknown>()
    const saved: ProWorkspacePreferences[] = []
    const stores = createStudioStores({
      persistence: 'none',
      workspacePreferences: {
        load: () => loading.promise,
        save: async (_id, value) => {
          saved.push(value)
        },
      },
    })
    const view = render(
      <StudioStoresContext.Provider value={stores}>
        <Harness />
      </StudioStoresContext.Provider>,
    )
    fireEvent.click(view.getByText('Abrir B'))
    await act(async () => {
      loading.resolve(openWorkspaceFile(emptyWorkspace(), 'a.ts'))
    })
    expect(view.getByRole('status').textContent).toBe('b.ts')
    expect(saved.at(-1)?.activeFile).toBe('b.ts')
  })
  it('restores scoped preferences and reports a failure independently of saving the game', async () => {
    const stores = createStudioStores({
      persistence: 'none',
      workspacePreferences: {
        load: async () => openWorkspaceFile(emptyWorkspace(), 'b.ts'),
        save: async () => {
          throw new Error('disk unavailable')
        },
      },
    })
    const view = render(
      <StudioStoresContext.Provider value={stores}>
        <Harness />
      </StudioStoresContext.Provider>,
    )
    await act(async () => {
      await Promise.resolve()
    })
    expect(view.container.querySelector('output')?.textContent).toBe('b.ts')
    expect((await view.findByText(/O salvamento do jogo é separado/)).textContent).toContain(
      'organização da tela',
    )
    expect(stores.project.getState().saveError).toBeNull()
  })
  it('does not assume local identity for hosts without local persistence', () => {
    expect(createStudioStores({ persistence: 'none' }).workspacePreferences).toBeNull()
    const adapter = { load: async () => null, save: async () => {} }
    expect(
      createStudioStores({ persistence: 'none', workspacePreferences: adapter })
        .workspacePreferences,
    ).toBe(adapter)
  })
})

// Document operations publish the path map before the next tree commit. A local
// layout render in between must not interpret that remap as a deleted file.
it('preserves a tab remap published before the renamed tree arrives', () => {
  function RenameHarness({ source }: { source: ProjectTree }) {
    const workspace = useProWorkspace('rename-project', source)
    return (
      <>
        <output data-testid="active-path">{workspace.state.activeFile}</output>
        <button
          type="button"
          onClick={() => workspace.change((state) => remapWorkspace(state, { 'a.ts': 'a.js' }))}
        >
          Remapear
        </button>
      </>
    )
  }
  const view = render(<RenameHarness source={tree} />)
  fireEvent.click(view.getByRole('button', { name: 'Remapear' }))
  expect(view.getByTestId('active-path').textContent).toBe('a.js')
  view.rerender(<RenameHarness source={{ 'a.js': tree['a.ts']!, 'b.ts': tree['b.ts']! }} />)
  expect(view.getByTestId('active-path').textContent).toBe('a.js')
})
