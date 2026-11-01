import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { StudioPortalContainerProvider } from '../studio/portal-container'
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
