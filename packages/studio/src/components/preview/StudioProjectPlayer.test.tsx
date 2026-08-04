import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { createEmptyProject } from '#core'
import { StudioProjectPlayer } from './StudioProjectPlayer'

describe('StudioProjectPlayer', () => {
  afterEach(() => cleanup())

  it('renderiza um iframe sandbox com srcDoc não-vazio (sem allow-same-origin)', async () => {
    const project = createEmptyProject('p1', 'Jogo')
    const { container } = render(<StudioProjectPlayer project={project} />)
    // ⚠️ Re-consulte o iframe a cada asserção: o documento final entra num
    // elemento NOVO (key = generation), não por reescrita do srcDoc do antigo.
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

  it('REMONTADO, chega ao jogo e não fica preso no doc de carregamento', async () => {
    // Regressão do Mural (08/2026): ligar/desligar os controles do gamepad troca
    // o ramo do ternário em public-player.tsx, o que DESMONTA e REMONTA o player.
    // Na 2ª montagem o documento já está memoizado, então o srcDoc era reescrito
    // milissegundos após o mount — e o navegador descartava a troca, deixando o
    // jogo em "Carregando o jogo…" para sempre, sem se recuperar ao desligar.
    const project = createEmptyProject('p1', 'Jogo')
    const first = render(<StudioProjectPlayer project={project} />)
    await waitFor(() =>
      expect(first.container.querySelector('iframe')?.getAttribute('aria-busy')).toBe('false'),
    )
    first.unmount()

    const again = render(<StudioProjectPlayer project={project} />)
    await waitFor(() =>
      expect(again.container.querySelector('iframe')?.getAttribute('aria-busy')).toBe('false'),
    )
    const srcdoc = again.container.querySelector('iframe')?.getAttribute('srcdoc') ?? ''
    expect(srcdoc).not.toContain('Carregando o jogo')
    expect(srcdoc).not.toContain('Não foi possível carregar')
    expect(srcdoc.length).toBeGreaterThan(0)
  })
})
