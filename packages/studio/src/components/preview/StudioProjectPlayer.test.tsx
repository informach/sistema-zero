import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { buildProProject, createEmptyProject } from '#core'
import { StudioProjectPlayer } from './StudioProjectPlayer'

describe('StudioProjectPlayer', () => {
  afterEach(() => cleanup())

  it('uses only the permanent compiled Pro revision, with no classic renderer or build adapter', async () => {
    const project = buildProProject(
      'pro',
      'Pro',
      { 'src/main.ts': { kind: 'file', content: 'not executable in the host' } },
      'dev',
      'three-ts',
    )
    let classicCalls = 0
    const playId = crypto.randomUUID(),
      revision = 'a'.repeat(64)
    const url = `https://runtime.test/v1/published/${playId}/${revision}/index.html`
    const view = render(
      <StudioProjectPlayer
        project={project}
        parentOrigin="https://kids.test"
        published={{ playId, revision, url }}
        originAdapter={{
          createPreviewUrl: async () => {
            classicCalls++
            throw new Error('Classic path called')
          },
        }}
      />,
    )
    await waitFor(() =>
      expect(view.container.querySelector('iframe')?.getAttribute('src')).toBe(url),
    )
    const frame = view.container.querySelector('iframe')!
    expect(frame.hasAttribute('srcdoc')).toBe(false)
    expect(frame.getAttribute('sandbox')).not.toContain('allow-same-origin')
    expect(frame.name).toContain('studioStorage')
    expect(classicCalls).toBe(0)
  })

  it('refuses missing and temporary Pro artifacts instead of rendering classic files', async () => {
    const project = buildProProject('pro', 'Pro', {}, 'dev', 'three-ts')
    for (const published of [
      undefined,
      {
        playId: crypto.randomUUID(),
        revision: 'a'.repeat(64),
        url: `https://runtime.test/v1/artifacts/${'a'.repeat(64)}/index.html`,
      },
    ]) {
      const view = render(<StudioProjectPlayer project={project} published={published} />)
      await waitFor(() =>
        expect(screen.getByRole('status').textContent).toContain('Não foi possível'),
      )
      expect(view.container.querySelector('iframe')?.hasAttribute('src')).toBe(false)
      view.unmount()
    }
  })

  it('onReady só informa o carregamento do documento jogável', async () => {
    let ready = 0
    const { container } = render(
      <StudioProjectPlayer
        project={createEmptyProject('ready', 'Teste')}
        onReady={() => ready++}
      />,
    )
    const placeholder = container.querySelector('iframe')
    if (!placeholder) throw new Error('Iframe ausente')
    fireEvent.load(placeholder)
    expect(ready).toBe(0)
    await waitFor(() =>
      expect(container.querySelector('iframe')?.getAttribute('aria-busy')).toBe('false'),
    )
    const frame = container.querySelector('iframe')
    if (!frame) throw new Error('Iframe ausente')
    const before = ready
    fireEvent.load(frame)
    expect(ready).toBe(before + 1)
  })

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
    expect(frame()?.getAttribute('srcdoc')).toContain("frame-src 'none'")
    expect(frame()?.getAttribute('srcdoc')).not.toMatch(/img-src[^;]*https:/)
  })

  it('permite optar pelo perfil criativo para projetos que usam recursos externos', async () => {
    const project = createEmptyProject('p1', 'Jogo')
    const { container } = render(
      <StudioProjectPlayer project={project} securityProfile="creative" />,
    )
    const frame = () => container.querySelector('iframe')
    await waitFor(() => expect(frame()?.getAttribute('aria-busy')).toBe('false'))
    expect(frame()?.getAttribute('srcdoc')).toMatch(/img-src[^;]*https:/)
  })

  it('usa URL cross-origin do adaptador e libera o recurso ao desmontar', async () => {
    const project = createEmptyProject('p1', 'Jogo')
    let documentReceived = ''
    const released: string[] = []
    const adapter = {
      async createPreviewUrl(input: { document: string }) {
        documentReceived = input.document
        return 'https://preview.example.test/runs/p1'
      },
      releasePreviewUrl(url: string) {
        released.push(url)
      },
    }

    const view = render(
      <StudioProjectPlayer
        project={project}
        parentOrigin="https://host.example.test"
        originAdapter={adapter}
      />,
    )
    await waitFor(() =>
      expect(view.container.querySelector('iframe')?.getAttribute('aria-busy')).toBe('false'),
    )
    const iframe = view.container.querySelector('iframe')
    expect(documentReceived).toContain("frame-src 'none'")
    expect(iframe?.getAttribute('src')).toBe('https://preview.example.test/runs/p1')
    expect(iframe?.hasAttribute('srcdoc')).toBe(false)

    view.unmount()
    expect(released).toEqual(['https://preview.example.test/runs/p1'])
  })

  it('recusa URL do adaptador na mesma origem do host', async () => {
    const project = createEmptyProject('p1', 'Jogo')
    let failures = 0
    const { container } = render(
      <StudioProjectPlayer
        project={project}
        parentOrigin="https://host.example.test"
        onError={() => failures++}
        originAdapter={{
          createPreviewUrl: async () => 'https://host.example.test/preview/p1',
        }}
      />,
    )

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('Não foi possível'),
    )
    expect(container.querySelector('iframe')?.getAttribute('srcdoc')).toContain(
      'Não foi possível carregar',
    )
    expect(failures).toBe(1)
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
