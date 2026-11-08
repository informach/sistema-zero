import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { act, cleanup, fireEvent, render, within } from '@testing-library/react'
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
    fireEvent.click(view.getByRole('button', { name: 'Opções de src' }))
    fireEvent.click(view.getByRole('menuitem', { name: 'Mudar o nome' }))
    fireEvent.change(view.getByLabelText('Renomear src'), { target: { value: 'lib' } })
    fireEvent.keyDown(view.getByLabelText('Renomear src'), { key: 'Enter' })
    expect(requests).toEqual([{ kind: 'rename', from: 'src', to: 'lib' }])
    expect(useProjectStore.getState().project!.tree).toBe(original)
    fireEvent.click(view.getByRole('button', { name: 'Opções de src/util.ts' }))
    fireEvent.click(view.getByRole('menuitem', { name: 'Apagar…' }))
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
    fireEvent.click(view.getByRole('button', { name: 'Novo' }))
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
    expect((observer.getByRole('button', { name: 'Novo' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
    fireEvent.click(observer.getByRole('button', { name: 'Opções de src' }))
    const item = (name: string) => observer.getByRole('menuitem', { name })
    expect(item('Mudar o nome').hasAttribute('disabled')).toBe(true)
    expect(item('Apagar…').hasAttribute('disabled')).toBe(true)
    // Copiar o caminho serve a quem só observa.
    expect(item('Copiar o caminho').hasAttribute('disabled')).toBe(false)
  })

  it('cada arquivo diz o que é; a configuração mora numa gaveta fechada', () => {
    useProjectStore.setState({
      project: {
        ...createEmptyProject('p-pro', 'Projeto Pro'),
        kind: 'pro',
        proMeta: { devScript: 'dev', templateId: 'vanilla' },
        tree: {
          'index.html': { kind: 'file', content: '' },
          'package.json': { kind: 'file', content: '{}' },
          'vite.config.js': { kind: 'file', content: '' },
          src: { kind: 'dir' },
          'src/main.js': { kind: 'file', content: '' },
          'src/style.css': { kind: 'file', content: '' },
        },
      },
    })
    const view = render(<ProFileTree activeFile="src/main.js" onSelectFile={() => {}} />)
    const main = view.getByRole('treeitem', { name: 'src/main.js' })
    expect(main.textContent).toContain('Onde o jogo começa')
    expect(view.getByRole('treeitem', { name: 'src/style.css' }).textContent).toContain(
      'Como o jogo fica',
    )
    expect(view.getByRole('treeitem', { name: 'src' }).textContent).toContain('2 itens')
    // A gaveta "Configuração · 2" começa fechada: package.json e vite.config.js não aparecem.
    const drawer = view.getByRole('button', { name: /Configuração · 2/ })
    expect(drawer.getAttribute('aria-expanded')).toBe('false')
    expect(view.queryByRole('treeitem', { name: 'package.json' })).toBeNull()
    fireEvent.click(drawer)
    expect(view.getByRole('treeitem', { name: 'package.json' }).textContent).toContain(
      'A lista de peças do jogo',
    )
    expect(view.getByRole('treeitem', { name: 'vite.config.js' })).toBeTruthy()
    // index.html não é configuração: fica com os arquivos da criança.
    expect(view.getByRole('treeitem', { name: 'index.html' }).textContent).toContain(
      'A página que segura o jogo',
    )
    // Duas árvores, cada uma com a SUA parada de Tab, e as setas não pulam de uma para a outra.
    const trees = view.getAllByRole('tree')
    expect(trees).toHaveLength(2)
    for (const tree of trees)
      expect(
        within(tree)
          .getAllByRole('treeitem')
          .filter((item) => item.tabIndex === 0),
      ).toHaveLength(1)
    const lastOfYours = within(trees[0] as HTMLElement)
      .getAllByRole('treeitem')
      .at(-1) as HTMLElement
    lastOfYours.focus()
    fireEvent.keyDown(lastOfYours, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(lastOfYours)
    const firstConfig = within(trees[1] as HTMLElement).getAllByRole('treeitem')[0] as HTMLElement
    firstConfig.focus()
    fireEvent.keyDown(firstConfig, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(view.getByRole('treeitem', { name: 'vite.config.js' }))
  })

  it('"Novo" abre "Criar um arquivo": a terminação entra sozinha, na pasta src/', () => {
    const selected: string[] = []
    const view = render(
      <ProFileTree activeFile="src/main.ts" onSelectFile={(path) => selected.push(path)} />,
    )
    fireEvent.click(view.getByRole('button', { name: 'Novo' }))
    const dialog = view.getByRole('dialog', { name: 'Criar um arquivo' })
    expect(within(dialog).getByRole('button', { name: 'Código TypeScript' })).toBeTruthy()
    fireEvent.change(within(dialog).getByLabelText('Nome do novo item'), {
      target: { value: 'placar' },
    })
    expect(within(dialog).getByText('Vai ficar assim: src/placar.ts')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar' }))
    expect(useProjectStore.getState().project!.tree?.['src/placar.ts']?.kind).toBe('file')
    expect(selected).toEqual(['src/placar.ts'])
    // Uma pasta, pelo cartão "Pasta", na raiz.
    fireEvent.click(view.getByRole('button', { name: 'Novo' }))
    const again = view.getByRole('dialog', { name: 'Criar um arquivo' })
    fireEvent.click(within(again).getByRole('button', { name: 'Pasta' }))
    fireEvent.change(within(again).getByRole('combobox'), { target: { value: '' } })
    fireEvent.change(within(again).getByLabelText('Nome do novo item'), {
      target: { value: 'fases' },
    })
    fireEvent.click(within(again).getByRole('button', { name: 'Criar' }))
    expect(useProjectStore.getState().project!.tree?.fases?.kind).toBe('dir')
  })

  it('keeps focus on a collapsed root instead of treating a sibling as its parent', () => {
    useProjectStore.getState().addProDir('sr')
    const view = render(<ProFileTree activeFile="" onSelectFile={() => {}} />)
    const root = view.getByRole('treeitem', { name: 'src' })
    act(() => root.focus())
    fireEvent.keyDown(root, { key: 'ArrowLeft' })
    fireEvent.keyDown(root, { key: 'ArrowLeft' })
    expect(document.activeElement?.getAttribute('aria-label')).toBe('src')
  })
})
