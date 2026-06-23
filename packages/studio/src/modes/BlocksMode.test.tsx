import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createEmptyProject } from '#core'
import type { SZIR } from '#ir'
import { useProjectStore } from '../state/projectStore'
import { BlocksMode } from './BlocksMode'

// bun:test NÃO isola module mocks por arquivo (módulos são compartilhados na
// suíte inteira): captura os exports reais ANTES de mockar e restaura no
// afterAll — sem isso o stub vazaria para os próximos arquivos (ex.:
// PreviewIframe.test passaria a ver <iframe title="preview" />).
const realPanels = { ...(await import('react-resizable-panels')) }
const realBlocklyPanel = { ...(await import('../components/blocks/BlocklyPanel')) }
const realPreviewIframe = { ...(await import('../components/preview/PreviewIframe')) }

mock.module('react-resizable-panels', () => ({
  PanelGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Panel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PanelResizeHandle: () => <div />,
}))

mock.module('../components/blocks/BlocklyPanel', () => ({
  BlocklyPanel: () => <div data-testid="blockly-panel" />,
}))

mock.module('../components/preview/PreviewIframe', () => ({
  PreviewIframe: () => <iframe title="preview" />,
}))

afterAll(() => {
  mock.module('react-resizable-panels', () => realPanels)
  mock.module('../components/blocks/BlocklyPanel', () => realBlocklyPanel)
  mock.module('../components/preview/PreviewIframe', () => realPreviewIframe)
})

describe('BlocksMode', () => {
  beforeEach(() => {
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('deriva blocksState da IR ao abrir direto no modo Blocos', async () => {
    const ir: SZIR = {
      html: [],
      css: [],
      js: [{ type: 'consoleLog', value: { type: 'str', value: 'oi' } }],
      extensions: [],
    }
    useProjectStore.setState({
      project: { ...createEmptyProject('project-1', 'Projeto'), ir, blocksState: null },
      isDirty: false,
      saveError: null,
    })

    render(<BlocksMode />)

    await waitFor(() => {
      const state = useProjectStore.getState()
      // Modelo CONTAINER: a IR é embrulhada nos 3 frames; o console.log vai DENTRO
      // do ⚙️ Comportamento.
      expect(state.project?.blocksState).toMatchObject({
        blocks: {
          languageVersion: 0,
          blocks: [
            { type: 'sz_frame_structure' },
            { type: 'sz_frame_appearance' },
            {
              type: 'sz_frame_behavior',
              inputs: { CHILDREN: { block: { type: 'sz_js_console_log_text' } } },
            },
          ],
        },
      })
    })
  })

  it('não marca projeto vazio como sujo só para criar workspace vazio', () => {
    useProjectStore.setState({
      project: createEmptyProject('project-empty', 'Projeto vazio'),
      isDirty: false,
      saveError: null,
    })

    render(<BlocksMode />)

    const state = useProjectStore.getState()
    // Projeto novo já nasce com os 3 frames-semente; BlocksMode não deriva nada
    // por cima nem marca o projeto como sujo.
    expect(state.project?.blocksState).toMatchObject({
      blocks: {
        blocks: [
          { type: 'sz_frame_structure' },
          { type: 'sz_frame_appearance' },
          { type: 'sz_frame_behavior' },
        ],
      },
    })
    expect(state.isDirty).toBe(false)
  })

  it('reconstrói os blocos quando o blocksState salvo está vazio mas o IR tem conteúdo', async () => {
    // Cenário: o sanitizer descartou o estado em ciclos anteriores e gravou
    // `{ blocks: { languageVersion: 0, blocks: [] } }`. Sem o tratamento de
    // "vazio = ausente", o early-return passaria e o canvas abria em branco.
    const ir: SZIR = {
      html: [],
      css: [],
      js: [{ type: 'consoleLog', value: { type: 'str', value: 'oi' } }],
      extensions: [],
    }
    useProjectStore.setState({
      project: {
        ...createEmptyProject('project-vazio', 'Projeto com state vazio'),
        ir,
        blocksState: { blocks: { languageVersion: 0, blocks: [] } },
      },
      isDirty: false,
      saveError: null,
    })

    render(<BlocksMode />)

    await waitFor(() => {
      const state = useProjectStore.getState()
      const tops =
        (state.project?.blocksState as { blocks?: { blocks?: unknown[] } } | null)?.blocks
          ?.blocks ?? []
      expect(tops.length).toBeGreaterThan(0)
    })
  })
})
