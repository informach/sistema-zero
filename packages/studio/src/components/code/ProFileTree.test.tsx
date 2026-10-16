import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { createEmptyProject } from '#core'
import { useProjectStore } from '../../state/projectStore'
import type { ProWorkspaceIntent } from '../../state/proWorkspaceOperations'
import { ProFileTree } from './ProFileTree'

describe('ProFileTree', () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: {
        ...createEmptyProject('p-pro', 'Projeto Pro'),
        kind: 'pro',
        proMeta: { devScript: 'dev', templateId: 'vanilla' },
        tree: {
          src: { kind: 'dir' },
          'src/main.ts': { kind: 'file', content: '' },
          'src/util.ts': { kind: 'file', content: '' },
        },
      },
      isDirty: false,
      saveError: null,
      editingAccess: 'author',
    })
  })
  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, editingAccess: 'author' })
  })

  it('requests semantic review for rename and deletion without mutating the tree first', () => {
    const requests: ProWorkspaceIntent[] = []
    const view = render(
      <ProFileTree
        activeFile="src/main.ts"
        onSelectFile={() => {}}
        onRequestOperation={(intent) => requests.push(intent)}
      />,
    )
    const original = useProjectStore.getState().project!.tree
    fireEvent.click(view.getByRole('button', { name: 'Renomear ou mover src' }))
    fireEvent.change(view.getByLabelText('Renomear src'), { target: { value: 'lib' } })
    fireEvent.keyDown(view.getByLabelText('Renomear src'), { key: 'Enter' })
    expect(requests).toEqual([{ kind: 'rename', from: 'src', to: 'lib' }])
    expect(useProjectStore.getState().project!.tree).toBe(original)
    fireEvent.click(view.getByRole('button', { name: 'Excluir src/util.ts' }))
    expect(requests.at(-1)).toEqual({ kind: 'delete', path: 'src/util.ts' })
    expect(useProjectStore.getState().project!.tree).toBe(original)
  })

  it('navigates focus with arrows without selecting or editing another file', () => {
    const selected: string[] = []
    const view = render(
      <ProFileTree activeFile="src/main.ts" onSelectFile={(path) => selected.push(path)} />,
    )
    const folder = view.getByRole('treeitem', { name: 'src' })
    act(() => folder.focus())
    fireEvent.keyDown(folder, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(view.getByRole('treeitem', { name: 'src/main.ts' }))
    fireEvent.keyDown(document.activeElement!, { key: 'End' })
    expect(document.activeElement).toBe(view.getByRole('treeitem', { name: 'src/util.ts' }))
    expect(selected).toEqual([])
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(folder)
    fireEvent.keyDown(folder, { key: 'ArrowLeft' })
    expect(view.queryByRole('treeitem', { name: 'src/main.ts' })).toBeNull()
  })

  it('offers an explicit editable filename suggestion and blocks observer controls', () => {
    const view = render(
      <ProFileTree
        activeFile="src/main.ts"
        onSelectFile={() => {}}
        onRequestOperation={() => {}}
      />,
    )
    fireEvent.click(view.getByTitle('Novo arquivo na raiz'))
    fireEvent.change(view.getByLabelText('Nome do novo item'), {
      target: { value: 'pontuação final.ts' },
    })
    expect((view.getByLabelText('Nome do novo item') as HTMLInputElement).value).toBe(
      'pontuação final.ts',
    )
    fireEvent.click(view.getByRole('button', { name: 'Usar sugestão: pontuacao-final.ts' }))
    expect((view.getByLabelText('Nome do novo item') as HTMLInputElement).value).toBe(
      'pontuacao-final.ts',
    )
    cleanup()
    useProjectStore.setState({ editingAccess: 'observer' })
    const observer = render(
      <ProFileTree
        activeFile="src/main.ts"
        onSelectFile={() => {}}
        onRequestOperation={() => {}}
      />,
    )
    expect(
      (observer.getByRole('button', { name: 'Renomear ou mover src' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
  })
})
