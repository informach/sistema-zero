import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { createEmptyProject } from '#core'
import { StudioProjectPlayer } from './StudioProjectPlayer'

describe('StudioProjectPlayer', () => {
  afterEach(() => cleanup())

  it('renderiza um iframe sandbox com srcDoc não-vazio (sem allow-same-origin)', async () => {
    const project = createEmptyProject('p1', 'Jogo')
    const { container } = render(<StudioProjectPlayer project={project} />)
    const iframe = container.querySelector('iframe')
    expect(iframe).not.toBeNull()
    const sandbox = iframe?.getAttribute('sandbox') ?? ''
    expect(sandbox).toContain('allow-scripts')
    expect(sandbox).toContain('allow-pointer-lock')
    expect(sandbox).not.toContain('allow-same-origin')
    expect(screen.getByRole('status').textContent).toContain('Carregando')
    expect(iframe?.getAttribute('srcdoc')).toContain('Carregando o jogo')
    expect(iframe?.getAttribute('aria-busy')).toBe('true')
    // O runtime oficial é carregado sob demanda antes de montar o documento auto-suficiente.
    await waitFor(() => expect(iframe?.getAttribute('srcdoc')?.length ?? 0).toBeGreaterThan(0))
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain('pronto')
      expect(iframe?.getAttribute('aria-busy')).toBe('false')
    })
  })

  it('usa o nome do projeto como título acessível por padrão', async () => {
    const project = createEmptyProject('p1', 'Nave Espacial')
    const { container } = render(<StudioProjectPlayer project={project} />)
    const iframe = container.querySelector('iframe')
    expect(iframe?.getAttribute('title')).toBe('Nave Espacial')
    await waitFor(() => expect(iframe?.getAttribute('srcdoc')?.length ?? 0).toBeGreaterThan(0))
  })
})
