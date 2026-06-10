import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createEmptyProject, type Project } from '#core'
import { useProjectStore } from '../../state/projectStore'
import { useUIStore } from '../../state/uiStore'
import { PreviewIframe } from './PreviewIframe'

const PAUSED_PREVIEW_DOC = '<!doctype html><html lang="pt-BR"><body></body></html>'

describe('PreviewIframe', () => {
  beforeEach(() => {
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
    useUIStore.setState({ previewRunning: true })
  })

  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
    useUIStore.setState({ previewRunning: true })
  })

  it('executa ao montar, reexecuta ao atualizar e volta a executar ao sair de parado', async () => {
    useProjectStore.setState({
      project: createPreviewProject(),
      isDirty: false,
      saveError: null,
    })

    render(<PreviewIframe />)

    expect(getPreviewSrcDoc()).toBe(PAUSED_PREVIEW_DOC)
    fireEvent.load(screen.getByTitle('Pré-visualização'))

    const initialDoc = await waitFor(() => {
      const doc = getPreviewSrcDoc()
      expect(doc).toContain('Preview automático')
      expect(doc).toMatch(/<!-- r:\d+ -->/)
      return doc
    })
    const initialNonce = getRenderNonce(initialDoc)

    fireEvent.click(screen.getByRole('button', { name: /Atualizar/ }))

    const refreshedDoc = await waitFor(() => {
      const doc = getPreviewSrcDoc()
      expect(doc).toContain('Preview automático')
      expect(doc).not.toBe(initialDoc)
      expect(getRenderNonce(doc)).toBeGreaterThan(initialNonce)
      return doc
    })
    const refreshedNonce = getRenderNonce(refreshedDoc)

    fireEvent.click(screen.getByRole('button', { name: /Parar/ }))

    await waitFor(() => {
      expect(getPreviewSrcDoc()).toBe(PAUSED_PREVIEW_DOC)
    })

    fireEvent.click(screen.getByRole('button', { name: /Reproduzir/ }))

    await waitFor(() => {
      const doc = getPreviewSrcDoc()
      expect(doc).toContain('Preview automático')
      expect(doc).not.toBe(PAUSED_PREVIEW_DOC)
      expect(getRenderNonce(doc)).toBeGreaterThan(refreshedNonce)
    })
  })

  it('executa quando o projeto carregado chega depois da montagem do preview', async () => {
    render(<PreviewIframe />)

    expect(getPreviewSrcDoc()).toBe(PAUSED_PREVIEW_DOC)
    fireEvent.load(screen.getByTitle('Pré-visualização'))

    act(() => {
      useProjectStore.setState({
        project: createPreviewProject(),
        isDirty: false,
        saveError: null,
      })
    })

    await waitFor(() => {
      const doc = getPreviewSrcDoc()
      expect(doc).toContain('Preview automático')
      expect(doc).toMatch(/<!-- r:\d+ -->/)
    })
  })
})

function createPreviewProject(): Project {
  return {
    ...createEmptyProject('project-preview', 'Projeto Preview'),
    files: {
      'index.html': `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Projeto Preview</title>
  </head>
  <body>
    <main>Preview automático</main>
  </body>
</html>`,
      'style.css': 'main { color: rgb(12, 83, 148); }',
      'script.js': 'document.body.dataset.executed = "true";',
    },
  }
}

function getPreviewSrcDoc(): string {
  const iframe = screen.getByTitle('Pré-visualização')
  return iframe.getAttribute('srcdoc') ?? ''
}

function getRenderNonce(doc: string): number {
  const match = doc.match(/<!-- r:(\d+) -->/)
  expect(match).not.toBeNull()
  return Number(match?.[1])
}
