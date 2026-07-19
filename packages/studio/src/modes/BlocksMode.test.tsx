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
    useProjectStore.setState({
      project: null,
      isDirty: false,
      saveError: null,
      blocksHydration: 'idle',
      bridgeCodeEditEpoch: 0,
      bridgeBlocksSyncedEpoch: 0,
    })
  })

  afterEach(() => {
    cleanup()
    useProjectStore.setState({
      project: null,
      isDirty: false,
      saveError: null,
      blocksHydration: 'idle',
      bridgeCodeEditEpoch: 0,
      bridgeBlocksSyncedEpoch: 0,
    })
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
      // Projeto só-JS legado: as áreas vazias são omitidas e o código é migrado
      // transparentemente para ⚙️ Ao iniciar.
      expect(state.project?.blocksState).toMatchObject({
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'sz_frame_start',
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
    // Projeto novo nasce EM BRANCO (sem os frames-semente); BlocksMode não deriva
    // nada por cima nem marca o projeto como sujo só por criar o workspace vazio.
    expect(state.project?.blocksState).toMatchObject({ blocks: { blocks: [] } })
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

  it('NÃO deriva nada enquanto a partição real hidrata (pending)', async () => {
    // A derivação (do IR ou do código) durante a janela de hidratação marcaria o
    // projeto sujo/vivo e descartaria o layout salvo prestes a chegar.
    const ir: SZIR = {
      html: [],
      css: [],
      js: [{ type: 'consoleLog', value: { type: 'str', value: 'oi' } }],
      extensions: [],
    }
    useProjectStore.setState({
      project: { ...createEmptyProject('project-pending', 'Aguardando'), ir, blocksState: null },
      isDirty: false,
      saveError: null,
      blocksHydration: 'pending',
    })

    render(<BlocksMode />)
    await Bun.sleep(50)

    const state = useProjectStore.getState()
    expect(state.project?.blocksState).toBeNull()
    expect(state.isDirty).toBe(false)
  })

  it('recovery da corrida da Ponte: blocos DEFASADOS são derivados do CÓDIGO, nunca o contrário', async () => {
    // O aluno digitou na Ponte e trocou p/ Blocos dentro da janela do
    // reverse-parse (o worker morre com a Ponte): files têm o código NOVO,
    // ir/blocksState estão velhos e a época de código está à frente. O recovery
    // deriva os blocos do código e FECHA a época — os arquivos ficam intactos.
    const base = createEmptyProject('project-race', 'Corrida da Ponte')
    const typed = 'console.log("sobrevivi");\n'
    useProjectStore.setState({
      project: {
        ...base,
        files: { ...base.files, 'script.js': typed },
        // ir/blocksState VELHOS: o seed vazio de projeto novo (pré-digitação).
      },
      isDirty: false,
      saveError: null,
      blocksHydration: 'restored',
      bridgeCodeEditEpoch: 1,
      bridgeBlocksSyncedEpoch: 0,
    })

    render(<BlocksMode />)

    await waitFor(() => {
      const state = useProjectStore.getState()
      // Blocos derivados do código digitado (só-JS legado → ⚙️ Ao iniciar; as
      // demais áreas vazias não ressuscitam).
      expect(state.project?.blocksState).toMatchObject({
        blocks: {
          blocks: [
            {
              type: 'sz_frame_start',
              inputs: { CHILDREN: { block: { type: 'sz_js_console_log_text' } } },
            },
          ],
        },
      })
      // Época fechada: os blocos agora refletem os arquivos.
      expect(state.bridgeBlocksSyncedEpoch).toBe(1)
      // O código digitado NUNCA é regenerado por cima.
      expect(state.project?.files['script.js']).toBe(typed)
    })
  })

  it('rede de segurança: sem IR e sem partição (empty), deriva os blocos do CÓDIGO sem sujar', async () => {
    // Aula só-Blocos reabrindo um rascunho cujo blocksState não existe/foi
    // descartado: o canvas não pode ficar em branco se há código nos arquivos.
    const base = createEmptyProject('project-code-only', 'Só código')
    useProjectStore.setState({
      project: {
        ...base,
        files: { ...base.files, 'script.js': 'console.log("oi");\n' },
        ir: null,
        blocksState: null,
      },
      isDirty: false,
      saveError: null,
      blocksHydration: 'empty',
    })

    render(<BlocksMode />)

    await waitFor(() => {
      const state = useProjectStore.getState()
      expect(state.project?.blocksState).toMatchObject({
        blocks: {
          blocks: [
            {
              type: 'sz_frame_start',
              inputs: { CHILDREN: { block: { type: 'sz_js_console_log_text' } } },
            },
          ],
        },
      })
      // hydrateProjectState, não applyProjectState: nada é persistido por cima
      // da partição até o aluno editar de verdade.
      expect(state.isDirty).toBe(false)
      expect(state.project?.ir).not.toBeNull()
    })
  })
})
