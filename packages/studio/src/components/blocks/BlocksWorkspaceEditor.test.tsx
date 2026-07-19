import { afterAll, afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createEmptyProject } from '#core'
import { useProjectStore } from '../../state/projectStore'

const realBlocklyPanel = { ...(await import('./BlocklyPanel')) }
const realWorldComposer = { ...(await import('./WorldComposerPanel')) }

mock.module('./BlocklyPanel', () => ({
  BlocklyPanel: () => <div data-testid="blockly-workspace" />,
}))

mock.module('./WorldComposerPanel', () => ({
  WorldComposerPanel: () => <div data-testid="world-composer" />,
}))

const { BlocksWorkspaceEditor } = await import('./BlocksWorkspaceEditor')

afterAll(() => {
  mock.module('./BlocklyPanel', () => realBlocklyPanel)
  mock.module('./WorldComposerPanel', () => realWorldComposer)
})

afterEach(() => {
  cleanup()
  useProjectStore.setState({ project: null, isDirty: false, saveError: null })
})

describe('BlocksWorkspaceEditor', () => {
  it('mantém a experiência clássica quando Mundo 3D não está instalado', () => {
    useProjectStore.setState({ project: createEmptyProject('classic', 'Clássico') })
    render(<BlocksWorkspaceEditor />)

    expect(screen.getByTestId('blockly-workspace')).toBeDefined()
    expect(screen.queryByRole('tab', { name: 'Editor de mundo 3D' })).toBeNull()
  })

  it('oferece o editor visual somente ao projeto que instalou Mundo 3D', () => {
    const project = createEmptyProject('world', 'Mundo')
    project.installedExtensions = [{ id: 'world-3d', version: '4.0.0', installedAt: 0 }]
    useProjectStore.setState({ project })
    render(<BlocksWorkspaceEditor />)

    const worldTab = screen.getByRole('tab', { name: 'Editor de mundo 3D' })
    expect(worldTab.getAttribute('aria-selected')).toBe('false')
    fireEvent.click(worldTab)
    expect(worldTab.getAttribute('aria-selected')).toBe('true')
    expect(
      screen.getByTestId('world-composer').closest('[role="tabpanel"]')?.hasAttribute('hidden'),
    ).toBe(false)
  })
})
