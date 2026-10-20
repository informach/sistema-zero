import { afterEach, describe, expect, mock, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Project } from '#core'
import { useLogsStore } from '../../state/logsStore'
import { useProjectStore } from '../../state/projectStore'
import type { StudioProRuntimeAdapter, StudioProRuntimeBuildResult } from '../../studio/pro-runtime'
import { RemoteProPreview } from './RemoteProPreview'

function project(content = 'console.log("primeiro")', updatedAt = 10): Project {
  return {
    id: 'pro-remoto-1',
    name: 'Atividade Pro',
    createdAt: 1,
    updatedAt,
    mode: 'code',
    kind: 'pro',
    tree: {
      'index.html': { kind: 'file', content: '<script type="module" src="/src/main.ts"></script>' },
      src: { kind: 'dir' },
      'src/main.ts': { kind: 'file', content },
    },
    proMeta: { templateId: 'vanilla-vite', devScript: 'dev' },
    files: { 'index.html': '', 'style.css': '', 'script.js': '' },
    ir: null,
    blocksState: null,
    installedExtensions: [],
  }
}

describe('preview Pro remoto', () => {
  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null })
    useLogsStore.getState().clear()
  })

  test('withdraws a ready frame and cancels work when its author loses the lease', async () => {
    const authority = new AbortController()
    const build = mock(async (_input: Parameters<StudioProRuntimeAdapter['build']>[0]) => ({
      html: '<main>Lease atual</main>',
    }))
    const runtime = { build, signal: authority.signal }
    useProjectStore.setState({ project: project() })
    const { container } = render(<RemoteProPreview runtime={runtime} />)
    await waitFor(() => expect(container.querySelector('iframe')).not.toBeNull())
    act(() => authority.abort())
    expect(build.mock.calls[0]?.[0].signal?.aborted).toBe(true)
    expect(container.querySelector('iframe')).toBeNull()
  })

  test('does not resurrect a previous author result for the same project id', async () => {
    let finish: (result: StudioProRuntimeBuildResult) => void = () => {}
    const authority = new AbortController()
    const runtime = {
      signal: authority.signal,
      build: () =>
        new Promise<StudioProRuntimeBuildResult>((resolve) => {
          finish = resolve
        }),
    }
    useProjectStore.setState({ project: project() })
    const view = render(<RemoteProPreview runtime={runtime} />)
    act(() => authority.abort())
    const blocked = {
      signal: AbortSignal.abort(),
      build: mock(async () => ({ html: '<main>Não autorizado</main>' })),
    }
    view.rerender(<RemoteProPreview runtime={blocked} />)
    await act(async () => finish({ html: '<main>Autoria antiga</main>' }))
    expect(view.container.querySelector('iframe')).toBeNull()
    expect(blocked.build).not.toHaveBeenCalled()
  })

  test('compila no adapter e executa o HTML em iframe isolado', async () => {
    const build = mock(async (_input: Parameters<StudioProRuntimeAdapter['build']>[0]) => ({
      html: '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src none"></head><body>Pronto</body></html>',
      output: 'build concluído',
    }))
    const runtime: StudioProRuntimeAdapter = { build }
    useProjectStore.setState({ project: project() })

    const { container } = render(<RemoteProPreview runtime={runtime} />)

    await waitFor(() => expect(build).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByTitle('Pré-visualização do projeto Pro')).toBeTruthy())
    const iframe = container.querySelector('iframe')
    expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts allow-pointer-lock')
    expect(iframe?.getAttribute('srcdoc')).toContain('sz-pro-console')
    expect(iframe?.getAttribute('srcdoc')).toContain('Content-Security-Policy')
  })

  test('não compila a cada tecla e usa a versão atual ao executar alterações', async () => {
    const build = mock(async (_input: Parameters<StudioProRuntimeAdapter['build']>[0]) => ({
      html: '<html><head></head><body>ok</body></html>',
    }))
    useProjectStore.setState({ project: project() })
    render(<RemoteProPreview runtime={{ build }} />)
    await waitFor(() => expect(build).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByText('▶ Executar de novo')).toBeTruthy())

    act(() => {
      useProjectStore.setState({ project: project('console.log("editado")', 20) })
    })
    await waitFor(() => expect(screen.getByText('▶ Executar alterações')).toBeTruthy())
    expect(build).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Executar alterações' }))
    await waitFor(() => expect(build).toHaveBeenCalledTimes(2))
    const second = build.mock.calls[1]?.[0]
    expect(second?.project.tree?.['src/main.ts']).toEqual({
      kind: 'file',
      content: 'console.log("editado")',
    })
  })

  test('keeps the last compiled artifact on build failure, without leaking it to another project', async () => {
    const artifact = {
      id: 'a'.repeat(64),
      url: `https://runtime.test/v1/artifacts/${'a'.repeat(64)}/index.html`,
      sha256: 'b'.repeat(64),
      expiresAt: Date.now() + 60_000,
    }
    let release: (result: StudioProRuntimeBuildResult) => void = () => {}
    let calls = 0
    const runtime: StudioProRuntimeAdapter = {
      async build() {
        calls++
        if (calls === 1) return { artifact }
        if (calls === 2) throw new Error('src/main.ts não compila')
        return new Promise((resolve) => {
          release = resolve
        })
      },
    }
    useProjectStore.setState({ project: project() })
    const { container } = render(<RemoteProPreview runtime={runtime} />)
    await waitFor(() => expect(container.querySelector('iframe')?.src).toBe(artifact.url))
    const originalFrame = container.querySelector('iframe')
    fireEvent.click(screen.getByRole('button', { name: 'Executar alterações' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('não compila'))
    expect(container.querySelector('iframe')).toBe(originalFrame)
    act(() => useProjectStore.setState({ project: { ...project(), id: 'other' } }))
    expect(container.querySelector('iframe')).toBeNull()
    await act(async () => release({ html: '<main>Outro projeto</main>' }))
    await waitFor(() =>
      expect(container.querySelector('iframe')?.getAttribute('srcdoc')).toContain('Outro projeto'),
    )
  })
})
