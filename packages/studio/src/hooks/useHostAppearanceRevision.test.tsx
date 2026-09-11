import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { useHostAppearanceRevision } from './useHostAppearanceRevision'

function Sonda() {
  return <output>{useHostAppearanceRevision()}</output>
}

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-tema')
})

describe('useHostAppearanceRevision', () => {
  it('sobe quando o host troca o tema no <html> (Padrão ⇄ Pink)', async () => {
    render(<Sonda />)
    expect(screen.getByRole('status').textContent).toBe('0')
    document.documentElement.setAttribute('data-tema', 'pink')
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('1'))
    document.documentElement.setAttribute('data-tema', 'padrao')
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('2'))
  })

  it('mudança DENTRO da página não conta: só o <html> é observado', async () => {
    render(<Sonda />)
    document.body.setAttribute('data-qualquer', 'x')
    // Anti-vácuo: o <html> ainda move a revisão depois disso, então o 0 acima não é um
    // observador morto.
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.getByRole('status').textContent).toBe('0')
    document.documentElement.setAttribute('data-tema', 'pink')
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('1'))
    document.body.removeAttribute('data-qualquer')
  })
})
