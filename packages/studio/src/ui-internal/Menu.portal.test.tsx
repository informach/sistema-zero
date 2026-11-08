import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { StudioPortalContainerProvider } from '../studio/portal-container'
import { StudioSheetProvider } from '../studio/sheet-context'
import { Menu } from './Menu'

afterEach(cleanup)

const secoes = [{ id: 's', items: [{ id: 'salvar', label: 'Salvar', onSelect: () => {} }] }]

describe('Menu: onde o painel abre', () => {
  it('abre no document.body quando o host não escolheu outro contêiner', () => {
    render(<Menu trigger="⋯" label="Mais" sections={secoes} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mais' }))
    const menu = screen.getByRole('menu', { name: 'Mais' })
    expect(menu.closest('[data-teste-dialogo]')).toBeNull()
    expect(document.body.contains(menu)).toBe(true)
  })

  it('abre dentro do contêiner do host (o diálogo modal do desafio)', () => {
    const dialogo = document.createElement('div')
    dialogo.dataset.testeDialogo = ''
    document.body.append(dialogo)
    try {
      render(
        <StudioPortalContainerProvider value={dialogo}>
          <Menu trigger="⋯" label="Mais" sections={secoes} />
        </StudioPortalContainerProvider>,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Mais' }))
      expect(dialogo.contains(screen.getByRole('menu', { name: 'Mais' }))).toBe(true)
    } finally {
      dialogo.remove()
    }
  })
})

describe('Menu: folha no celular do Pro', () => {
  it('com folha, o MESMO painel sobe de baixo, sem as coordenadas do gatilho; fecha igual', () => {
    const { rerender } = render(
      <StudioSheetProvider value>
        <Menu trigger="⋯" label="Mais" sections={secoes} />
      </StudioSheetProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Mais' }))
    const menu = screen.getByRole('menu', { name: 'Mais' })
    expect(menu.hasAttribute('data-sz-sheet')).toBe(true)
    expect(menu.className).toContain('sz-sheet')
    expect(menu.style.top).toBe('')
    // Trocar de tamanho com o menu aberto não remonta o painel: só a forma muda.
    rerender(
      <StudioSheetProvider value={false}>
        <Menu trigger="⋯" label="Mais" sections={secoes} />
      </StudioSheetProvider>,
    )
    expect(screen.getByRole('menu', { name: 'Mais' })).toBe(menu)
    expect(menu.hasAttribute('data-sz-sheet')).toBe(false)
    expect(menu.style.top).not.toBe('')
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Salvar' }), { key: 'Escape' })
    expect(screen.queryByRole('menu', { name: 'Mais' })).toBeNull()
  })

  it('sem o provider (clássico, lista, hosts sem Pro), nada muda', () => {
    render(<Menu trigger="⋯" label="Mais" sections={secoes} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mais' }))
    const menu = screen.getByRole('menu', { name: 'Mais' })
    expect(menu.hasAttribute('data-sz-sheet')).toBe(false)
    expect(menu.className).not.toContain('sz-sheet')
  })
})
