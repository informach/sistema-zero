import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render, waitFor } from '@testing-library/react'
import { createEmptyProject } from '#core'
import { useProjectStore } from '../state/projectStore'
import { useUIStore } from '../state/uiStore'
import { EditorPage } from './EditorPage'

// bun:test não isola module mocks por arquivo: restaura o Shell real no
// afterAll para não vazar o stub para os próximos arquivos da suíte.
const realShell = { ...(await import('../components/layout/Shell')) }

mock.module('../components/layout/Shell', () => ({
  Shell: () => <div data-testid="editor-shell" />,
}))

afterAll(() => {
  mock.module('../components/layout/Shell', () => realShell)
})

const originalLoadProject = useProjectStore.getState().loadProject
const originalUnloadProject = useProjectStore.getState().unloadProject

describe('EditorPage', () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: null,
      isDirty: false,
      saveError: null,
      loadProject: originalLoadProject,
      unloadProject: originalUnloadProject,
    })
    useUIStore.setState({ previewRunning: true })
  })

  afterEach(() => {
    cleanup()
    useProjectStore.setState({
      project: null,
      isDirty: false,
      saveError: null,
      loadProject: originalLoadProject,
      unloadProject: originalUnloadProject,
    })
    useUIStore.setState({ previewRunning: true })
  })

  it('religa a execução do preview quando um projeto é aberto', async () => {
    const project = createEmptyProject('project-1', 'Projeto 1')
    useUIStore.setState({ previewRunning: false })
    useProjectStore.setState({
      loadProject: mock(async () => {
        useProjectStore.setState({ project, isDirty: false, saveError: null })
        return project
      }),
    })

    render(<EditorPage projectId="project-1" onExit={() => {}} />)

    await waitFor(() => {
      expect(useUIStore.getState().previewRunning).toBe(true)
    })
  })
})
