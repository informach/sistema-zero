import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { createEmptyProject } from '#core'
import { cleanup, render, waitFor } from '@testing-library/react'

// bun:test não isola module mocks por arquivo: restaura o Shell real no
// afterAll para não vazar o stub para os próximos arquivos da suíte.
const realShell = { ...(await import('../components/layout/Shell')) }

mock.module('../components/layout/Shell', () => ({
  Shell: () => <div data-testid="editor-shell" />,
}))

// idb-keyval mockado (sem restore, de propósito): o IndexedDB real não existe
// no happy-dom e o registry de módulos é compartilhado pela suíte toda.
mock.module('idb-keyval', () => ({
  createStore: mock(() => ({ name: 'test-store' })),
  del: mock(async () => undefined),
  delMany: mock(async () => undefined),
  get: mock(async (): Promise<unknown> => undefined),
  getMany: mock(async (): Promise<unknown[]> => []),
  keys: mock(async (): Promise<unknown[]> => []),
  set: mock(async () => undefined),
  setMany: mock(async () => undefined),
}))

const { Studio } = await import('./Studio')
const { useProjectStore } = await import('../state/projectStore')
const { useUIStore } = await import('../state/uiStore')

afterAll(() => {
  mock.module('../components/layout/Shell', () => realShell)
})

describe('Studio', () => {
  beforeEach(() => {
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
    useUIStore.setState({ previewRunning: false })
  })

  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
    useUIStore.setState({ previewRunning: true })
  })

  it('hidrata o initialProject sem marcar sujo e religa o preview', async () => {
    const project = createEmptyProject('project-1', 'Projeto 1')

    render(<Studio initialProject={project} />)

    await waitFor(() => {
      expect(useProjectStore.getState().project?.id).toBe('project-1')
    })
    expect(useProjectStore.getState().isDirty).toBe(false)
    expect(useUIStore.getState().previewRunning).toBe(true)
  })

  it('descarrega o projeto no unmount', async () => {
    const project = createEmptyProject('project-2', 'Projeto 2')
    const { unmount } = render(<Studio initialProject={project} />)

    await waitFor(() => {
      expect(useProjectStore.getState().project?.id).toBe('project-2')
    })
    unmount()
    expect(useProjectStore.getState().project).toBeNull()
  })

  it('renderiza aviso quando o initialProject é inválido', () => {
    const { getByText } = render(
      <Studio initialProject={{ id: 'x' } as Parameters<typeof Studio>[0]['initialProject']} />,
    )
    expect(getByText(/Projeto inválido/)).toBeTruthy()
  })

  it('escopa o tema no root via data-sz-theme', async () => {
    const project = createEmptyProject('project-3', 'Projeto 3')
    const { container } = render(<Studio initialProject={project} theme="light" />)

    await waitFor(() => {
      expect(container.querySelector('[data-sz-theme="light"]')).toBeTruthy()
    })
    expect(document.documentElement.getAttribute('data-sz-theme')).toBeNull()
  })
})
