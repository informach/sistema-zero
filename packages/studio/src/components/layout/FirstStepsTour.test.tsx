import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createEmptyProject } from '#core'
import { StudioStoresContext } from '../../state/storesContext'
import { createStudioStores } from '../../state/studioStores'
import { STANDALONE_CONFIG, StudioConfigProvider } from '../../studio/config'
import { FirstStepsTour } from './FirstStepsTour'

/**
 * O passeio de primeiros passos (D6, 11/2026): só com `firstStepsTour` (o Estúdio livre; a aula
 * nunca), no jogo de blocos, e uma vez por perfil — "Pular" lembra.
 */
function mount(tour: boolean) {
  const stores = createStudioStores({ persistence: 'none' })
  stores.project.setState({
    project: createEmptyProject('01J0000000000000000000TOUR', 'Meu jogo'),
    editingAccess: 'author',
  } as never)
  const wrap = (node: ReactElement) => (
    <StudioStoresContext.Provider value={stores}>
      <StudioConfigProvider value={{ ...STANDALONE_CONFIG, firstStepsTour: tour }}>
        {node}
      </StudioConfigProvider>
    </StudioStoresContext.Provider>
  )
  return render(wrap(<FirstStepsTour />))
}

const wait = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)))

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('FirstStepsTour', () => {
  it('sem a opção (a aula) não aparece', async () => {
    mount(false)
    await wait(1400)
    expect(screen.queryByRole('dialog', { name: 'Primeiros passos' })).toBeNull()
  })

  it('quatro balões; "Pular" encerra e não volta mais neste perfil', async () => {
    const first = mount(true)
    await wait(1400)
    const balao = screen.getByRole('dialog', { name: 'Primeiros passos' })
    expect(balao.textContent).toContain('1 de 4')
    fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
    expect(screen.getByRole('dialog').textContent).toContain('2 de 4')
    fireEvent.click(screen.getByRole('button', { name: 'Pular' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    first.unmount()
    mount(true)
    await wait(1400)
    expect(screen.queryByRole('dialog', { name: 'Primeiros passos' })).toBeNull()
  })
})
