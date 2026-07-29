import { afterEach, describe, expect, mock, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Project } from '#core'
import { useLogsStore } from '../../state/logsStore'
import { useProjectStore } from '../../state/projectStore'
import type { StudioProRuntimeAdapter } from '../../studio/pro-runtime'
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

  test('compila no adapter e executa o HTML em iframe isolado', async () => {
    const build = mock(async (_input: Parameters<StudioProRuntimeAdapter['build']>[0]) => ({
      html: '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src none"></head><body>Pronto</body></html>',
      output: 'build concluído',
    }))
    const runtime: StudioProRuntimeAdapter = { build }
    useProjectStore.setState({ project: project() })

    const { container } = render(<RemoteProPreview runtime={runtime} />)

    await waitFor(() => expect(build).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByTitle('Pré-visualização da atividade Pro')).toBeTruthy())
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
})
