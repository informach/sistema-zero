import { afterAll, afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render, waitFor } from '@testing-library/react'
import { createEmptyProject } from '#core'

// bun:test não isola module mocks por arquivo: restaura o Shell real no
// afterAll para não vazar o stub para os próximos arquivos da suíte.
const realShell = { ...(await import('../components/layout/Shell')) }

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

const { useProjectStore } = await import('../state/projectStore')
const { useUIStore } = await import('../state/uiStore')

// O Shell vira um PROBE: renderiza por DENTRO do provider da instância, então
// os hooks aqui leem as stores POR INSTÂNCIA (as estáticas useXStore.getState
// leem a default — não servem para inspecionar um <Studio>).
function ShellProbe(): React.JSX.Element {
  const projectId = useProjectStore((s) => s.project?.id ?? '')
  const isDirty = useProjectStore((s) => s.isDirty)
  const previewRunning = useUIStore((s) => s.previewRunning)
  return (
    <div
      data-testid="editor-shell"
      data-project={projectId}
      data-dirty={String(isDirty)}
      data-preview={String(previewRunning)}
    />
  )
}

mock.module('../components/layout/Shell', () => ({
  Shell: ShellProbe,
}))

const { Studio } = await import('./Studio')

afterAll(() => {
  mock.module('../components/layout/Shell', () => realShell)
})

describe('Studio', () => {
  afterEach(() => {
    cleanup()
  })

  it('hidrata o initialProject na store DA INSTÂNCIA, sem sujar e com preview ligado', async () => {
    const project = createEmptyProject('project-1', 'Projeto 1')

    const { getByTestId } = render(<Studio initialProject={project} />)

    await waitFor(() => {
      expect(getByTestId('editor-shell').getAttribute('data-project')).toBe('project-1')
    })
    expect(getByTestId('editor-shell').getAttribute('data-dirty')).toBe('false')
    expect(getByTestId('editor-shell').getAttribute('data-preview')).toBe('true')
    // A store default (fora de qualquer Studio) permanece intocada — prova do
    // isolamento por instância.
    expect(useProjectStore.getState().project).toBeNull()
  })

  it('duas instâncias na mesma página não compartilham estado', async () => {
    const a = createEmptyProject('project-a', 'A')
    const b = createEmptyProject('project-b', 'B')

    const { getAllByTestId } = render(
      <>
        <Studio initialProject={a} />
        <Studio initialProject={b} />
      </>,
    )

    await waitFor(() => {
      const probes = getAllByTestId('editor-shell')
      expect(probes.map((p) => p.getAttribute('data-project'))).toEqual(['project-a', 'project-b'])
    })
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
