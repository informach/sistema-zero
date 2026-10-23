import { describe, expect, it } from 'bun:test'
import { act, fireEvent, render } from '@testing-library/react'
import { createEmptyProject } from '../../../core/project'
import type { ProjectTree } from '../../../core/proProject'
import { StudioStoresContext } from '../../../state/storesContext'
import { createStudioStores } from '../../../state/studioStores'
import { ProNavigator } from './ProNavigator'
import type { ProSearchResult } from './search'

describe('navegação do projeto', () => {
  it('finds content in closed files and opens the existing Materials panel', async () => {
    const tree: ProjectTree = {
      'main.ts': { kind: 'file', content: 'const speed = 4' },
      'rules.ts': { kind: 'file', content: '// regra\nconst score = 0' },
    }
    const stores = createStudioStores({ persistence: 'none' })
    stores.project.setState({
      project: { ...createEmptyProject('project', 'Jogo'), kind: 'pro', tree },
    })
    const opened: ProSearchResult[] = []
    const view = render(
      <StudioStoresContext.Provider value={stores}>
        <ProNavigator
          tree={tree}
          activeFile="main.ts"
          onSelectFile={() => {}}
          searchRequest={0}
          onInsert={() => {}}
          onResult={(result) => opened.push(result)}
        />
      </StudioStoresContext.Provider>,
    )
    fireEvent.click(view.getByRole('button', { name: 'Buscar' }))
    fireEvent.click(view.getByRole('button', { name: 'Conteúdo' }))
    fireEvent.change(view.getByRole('searchbox'), { target: { value: 'score' } })
    fireEvent.click(view.getByRole('button', { name: /rules.ts:2/ }))
    expect(opened).toEqual([{ path: 'rules.ts', line: 2, column: 7, text: 'const score = 0' }])
    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'Materiais' }))
    })
    fireEvent.click(view.getByRole('button', { name: 'Abrir biblioteca de materiais' }))
    expect(stores.ui.getState().showAssets).toBe(true)
  })
})
