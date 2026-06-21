import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import { createEmptyProject } from '#core'
import { StudioProjectPlayer } from './StudioProjectPlayer'

describe('StudioProjectPlayer', () => {
  afterEach(() => cleanup())

  it('renderiza um iframe sandbox com srcDoc não-vazio (sem allow-same-origin)', () => {
    const project = createEmptyProject('p1', 'Jogo')
    const { container } = render(<StudioProjectPlayer project={project} />)
    const iframe = container.querySelector('iframe')
    expect(iframe).not.toBeNull()
    const sandbox = iframe?.getAttribute('sandbox') ?? ''
    expect(sandbox).toContain('allow-scripts')
    expect(sandbox).not.toContain('allow-same-origin')
    // srcDoc é o doc auto-suficiente — não vazio.
    const srcdoc = iframe?.getAttribute('srcdoc') ?? ''
    expect(srcdoc.length).toBeGreaterThan(0)
  })

  it('usa o nome do projeto como título acessível por padrão', () => {
    const project = createEmptyProject('p1', 'Nave Espacial')
    const { container } = render(<StudioProjectPlayer project={project} />)
    expect(container.querySelector('iframe')?.getAttribute('title')).toBe('Nave Espacial')
  })
})
