import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import type { JSX } from 'react'
import { useState } from 'react'
import { createEmptyProject, type Project, type ProjectTree } from '#core'
import { useProjectStore } from '../../state/projectStore'
import { ProFileTree } from './ProFileTree'

// Projeto profissional mínimo com uma pasta `src` contendo o arquivo aberto.
function setProProject(tree: ProjectTree): void {
  const base = createEmptyProject('p-pro', 'Projeto Pro')
  const project: Project = {
    ...base,
    kind: 'pro',
    tree,
    proMeta: { devScript: 'dev', templateId: 'vanilla' },
  }
  useProjectStore.setState({ project, isDirty: false, saveError: null })
}

// Wrapper que mantém o `activeFile` em estado (como o Shell faria) para observar
// a re-seleção disparada por onSelectFile.
function Harness({ initial }: { initial: string }): JSX.Element {
  const [active, setActive] = useState(initial)
  return (
    <>
      <span data-testid="active">{active}</span>
      <ProFileTree activeFile={active} onSelectFile={setActive} />
    </>
  )
}

describe('ProFileTree', () => {
  beforeEach(() => {
    setProProject({
      src: { kind: 'dir' },
      'src/main.ts': { kind: 'file', content: '' },
      'src/util.ts': { kind: 'file', content: '' },
    })
  })

  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('mantém o arquivo aberto selecionado ao renomear a pasta que o contém (#6b)', () => {
    const { getByTestId, getAllByTitle, getByLabelText } = render(<Harness initial="src/main.ts" />)
    expect(getByTestId('active').textContent).toBe('src/main.ts')

    // Duplo clique no nó da pasta `src` (não nos arquivos) entra em renomeação.
    const folderButton = getAllByTitle('Duplo clique para renomear').find(
      (b) => b.textContent?.replace(/[▸▾·\s]/g, '') === 'src',
    )
    if (!folderButton) throw new Error('Botão da pasta src não encontrado')
    act(() => {
      fireEvent.doubleClick(folderButton)
    })

    const input = getByLabelText('Renomear src') as HTMLInputElement
    act(() => {
      fireEvent.change(input, { target: { value: 'lib' } })
    })
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' })
    })

    // O subtree foi renomeado (src/main.ts -> lib/main.ts) e o editor reaponta
    // para o novo path em vez de ficar num caminho morto.
    expect(getByTestId('active').textContent).toBe('lib/main.ts')
    const tree = useProjectStore.getState().project?.tree ?? {}
    expect(tree['lib/main.ts']).toBeTruthy()
    expect(tree['src/main.ts']).toBeUndefined()
  })
})
