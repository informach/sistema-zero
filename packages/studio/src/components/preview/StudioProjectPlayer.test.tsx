import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { createEmptyProject } from '#core'
import { StudioProjectPlayer } from './StudioProjectPlayer'

describe('StudioProjectPlayer', () => {
  afterEach(() => cleanup())

  it('renderiza um iframe sandbox com srcDoc não-vazio (sem allow-same-origin)', async () => {
    const project = createEmptyProject('p1', 'Jogo')
    const { container } = render(<StudioProjectPlayer project={project} />)
    const frame = () => container.querySelector('iframe')
    expect(frame()).not.toBeNull()
    const sandbox = frame()?.getAttribute('sandbox') ?? ''
    expect(sandbox).toContain('allow-scripts')
    expect(sandbox).toContain('allow-pointer-lock')
    expect(sandbox).not.toContain('allow-same-origin')
    expect(screen.getByRole('status').textContent).toContain('Carregando')
    expect(frame()?.getAttribute('srcdoc')).toContain('Carregando o jogo')
    expect(frame()?.getAttribute('aria-busy')).toBe('true')
    // O runtime oficial é carregado sob demanda antes de montar o documento auto-suficiente.
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain('pronto')
      expect(frame()?.getAttribute('aria-busy')).toBe('false')
    })
    expect(frame()?.getAttribute('srcdoc')).not.toContain('Carregando o jogo')
    expect(frame()?.getAttribute('srcdoc')?.length ?? 0).toBeGreaterThan(0)
  })

  it('usa o nome do projeto como título acessível por padrão', async () => {
    const project = createEmptyProject('p1', 'Nave Espacial')
    const { container } = render(<StudioProjectPlayer project={project} />)
    const iframe = container.querySelector('iframe')
    expect(iframe?.getAttribute('title')).toBe('Nave Espacial')
    await waitFor(() => expect(iframe?.getAttribute('srcdoc')?.length ?? 0).toBeGreaterThan(0))
  })

  it('REMONTADO, entrega o documento final em um iframe novo', async () => {
    const project = createEmptyProject('p1', 'Jogo')
    const first = render(<StudioProjectPlayer project={project} />)
    await waitFor(() =>
      expect(first.container.querySelector('iframe')?.getAttribute('aria-busy')).toBe('false'),
    )
    first.unmount()

    const again = render(<StudioProjectPlayer project={project} />)
    const loadingFrame = again.container.querySelector('iframe')
    expect(loadingFrame?.getAttribute('srcdoc')).toContain('Carregando o jogo')

    await waitFor(() =>
      expect(again.container.querySelector('iframe')?.getAttribute('aria-busy')).toBe('false'),
    )
    const readyFrame = again.container.querySelector('iframe')
    expect(readyFrame).not.toBe(loadingFrame)
    expect(readyFrame?.getAttribute('srcdoc')).not.toContain('Carregando o jogo')
  })
})
