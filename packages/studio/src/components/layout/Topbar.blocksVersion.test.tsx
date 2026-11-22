import { afterAll, afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createEmptyProject } from '#core'
import { StudioStoresContext } from '../../state/storesContext'
import { createStudioStores } from '../../state/studioStores'
import { type StudioLayout, StudioLayoutProvider } from '../../studio/layoutContext'
import { StudioOpenProjectProvider } from '../../studio/open-project'
import * as realBlocksVersion from './topbar/blocksVersion'

/**
 * "Abrir a versão em blocos" (proposta aprovada em 21/11/2026, "de onde veio o projeto Pro"): no
 * Pro que veio de "Virar profissional", o menu ⋯ abre a cópia em blocos guardada na conversão;
 * sumida a cópia, o item fica desligado e diz por quê.
 */
const captured = { ...realBlocksVersion }
const existing = new Set<string>()
mock.module('./topbar/blocksVersion', () => ({
  blocksVersionExists: async (id: string) => existing.has(id),
}))
afterAll(() => {
  mock.module('./topbar/blocksVersion', () => captured)
})
const { Topbar } = await import('./Topbar')

const layout: StudioLayout = { width: 1440, isNarrow: false, isCompact: false }
const ORIGIN = '01J0000000000000000000BLOC'

function mountPro(options: { origin?: boolean; open?: (id: string) => void }) {
  const stores = createStudioStores({ persistence: 'none' })
  stores.project.getState().setProject({
    ...createEmptyProject('01J00000000000000000000PRO', 'Meu jogo Pro'),
    kind: 'pro',
    mode: 'code',
    tree: {},
    proMeta: {
      devScript: 'dev',
      templateId: 'vanilla-vite',
      ...(options.origin === false ? {} : { origin: { projectId: ORIGIN, revision: 1 } }),
    },
  } as never)
  const topbar = <Topbar onExit={() => {}} />
  return render(
    <StudioLayoutProvider value={layout}>
      <StudioStoresContext.Provider value={stores}>
        {options.open ? (
          <StudioOpenProjectProvider value={options.open}>{topbar}</StudioOpenProjectProvider>
        ) : (
          topbar
        )}
      </StudioStoresContext.Provider>
    </StudioLayoutProvider>,
  )
}

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Mais opções' }))

afterEach(() => {
  cleanup()
  existing.clear()
})

describe('Abrir a versão em blocos', () => {
  it('com a cópia guardada, o item abre a cópia pelo host', async () => {
    existing.add(ORIGIN)
    const open = mock((_id: string) => {})
    mountPro({ open })
    openMenu()
    const item = await screen.findByRole('menuitem', { name: 'Abrir a versão em blocos' })
    expect(item.hasAttribute('disabled')).toBe(false)
    fireEvent.click(item)
    await waitFor(() => expect(open).toHaveBeenCalledWith(ORIGIN))
  })

  it('com a cópia apagada, o item fica desligado e diz por quê', async () => {
    mountPro({ open: () => {} })
    openMenu()
    const item = await screen.findByRole('menuitem', { name: 'Abrir a versão em blocos' })
    await waitFor(() => expect(item.hasAttribute('disabled')).toBe(true))
    expect(item.getAttribute('aria-describedby')).toBeTruthy()
    expect(screen.getByText('A versão em blocos foi apagada')).toBeTruthy()
  })

  it('sem o host saber abrir projetos, ou num Pro que não veio dos blocos, o item não existe', () => {
    existing.add(ORIGIN)
    mountPro({})
    openMenu()
    expect(screen.queryByRole('menuitem', { name: 'Abrir a versão em blocos' })).toBeNull()
    cleanup()
    mountPro({ origin: false, open: () => {} })
    openMenu()
    expect(screen.queryByRole('menuitem', { name: 'Abrir a versão em blocos' })).toBeNull()
  })
})
