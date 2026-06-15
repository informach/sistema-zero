import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import type { JSX } from 'react'
import type { IDEMode } from '#core'
import { createEmptyProject } from '#core'
import { useProjectStore } from '../../state/projectStore'
import { useUIStore } from '../../state/uiStore'

// bun:test NÃO isola module mocks por arquivo — captura os exports reais ANTES
// de mockar e restaura no afterAll (ver BottomPanel.test.tsx).
const realTerminal = { ...(await import('../terminal/Terminal')) }
const realAIPanel = { ...(await import('../ai/AIPanel')) }
const realConsolePanel = { ...(await import('../console/ConsolePanel')) }

mock.module('../terminal/Terminal', () => ({
  Terminal: (): JSX.Element => <div data-testid="terminal-probe">terminal</div>,
}))
mock.module('../ai/AIPanel', () => ({
  AIPanel: (): JSX.Element => <div data-testid="ai-probe">ia</div>,
}))
mock.module('../console/ConsolePanel', () => ({
  ConsolePanel: (): JSX.Element => <div data-testid="console-probe">console</div>,
}))

afterAll(() => {
  mock.module('../terminal/Terminal', () => realTerminal)
  mock.module('../ai/AIPanel', () => realAIPanel)
  mock.module('../console/ConsolePanel', () => realConsolePanel)
})

// Importa DEPOIS dos mocks para que o lazy() do bottomTabs resolva os stubs.
const { NarrowPanels } = await import('./NarrowPanels')

function setProject(mode: IDEMode): void {
  useProjectStore.setState({
    project: { ...createEmptyProject('p1', 'Projeto'), mode },
    isDirty: false,
    saveError: null,
  })
}

function resetUI(): void {
  useUIStore.setState({
    bottomTab: 'console',
    showConsole: true,
    showTerminal: true,
    showAI: true,
    showPreview: true,
  })
}

const oneEditor = [
  { id: 'code', label: 'Código', content: <div data-testid="ed-code">editor</div> },
]

describe('NarrowPanels', () => {
  beforeEach(() => {
    setProject('code')
    resetUI()
  })

  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
    resetUI()
  })

  it('funde editor + preview + abas inferiores numa só tira (modo code)', () => {
    const { getByRole, getAllByRole } = render(
      <NarrowPanels editorPanes={oneEditor} preview={<div data-testid="prev">preview</div>} />,
    )
    expect(getByRole('tablist')).toBeTruthy()
    const tabs = getAllByRole('tab')
    // Código + Pré-visualização + Console + Terminal + IA
    expect(tabs.length).toBe(5)
    // O editor é a aba ativa por padrão.
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true')
    expect(tabs[0]?.textContent).toContain('Código')
  })

  it('no modo blocos só o Console acompanha (Terminal/IA são do Código)', () => {
    setProject('blocks')
    const { getAllByRole } = render(
      <NarrowPanels
        editorPanes={[{ id: 'blocks', label: 'Blocos', content: <div>blocos</div> }]}
        preview={<div>preview</div>}
      />,
    )
    const labels = getAllByRole('tab').map((t) => t.textContent)
    // Blocos + Pré-visualização + Console (sem Terminal/IA)
    expect(labels.length).toBe(3)
    expect(labels.some((l) => l?.includes('Terminal'))).toBe(false)
    expect(labels.some((l) => l?.includes('IA'))).toBe(false)
  })

  it('troca a aba ativa ao clicar', () => {
    const { getAllByRole } = render(<NarrowPanels editorPanes={oneEditor} preview={<div>p</div>} />)
    const previewTab = getAllByRole('tab').find((t) => t.textContent?.includes('Pré'))
    if (!previewTab) throw new Error('aba de preview não encontrada')
    act(() => {
      fireEvent.click(previewTab)
    })
    expect(previewTab.getAttribute('aria-selected')).toBe('true')
  })

  it('esconder o Console (showConsole=false) remove a aba', () => {
    const { getAllByRole } = render(<NarrowPanels editorPanes={oneEditor} preview={<div>p</div>} />)
    expect(getAllByRole('tab').length).toBe(5)
    act(() => useUIStore.setState({ showConsole: false }))
    const labels = getAllByRole('tab').map((t) => t.textContent)
    expect(labels.length).toBe(4)
    expect(labels.some((l) => l?.includes('Console'))).toBe(false)
  })

  it('sem preview, não há aba de Pré-visualização', () => {
    const { getAllByRole } = render(<NarrowPanels editorPanes={oneEditor} />)
    const labels = getAllByRole('tab').map((t) => t.textContent)
    expect(labels.some((l) => l?.includes('Pré'))).toBe(false)
  })

  it('mantém os painéis MONTADOS (hidden), incluindo os inativos', () => {
    const { getByTestId } = render(
      <NarrowPanels editorPanes={oneEditor} preview={<div data-testid="prev">preview</div>} />,
    )
    // Editor é a aba ativa; preview e console estão no DOM mesmo inativos
    // (o Tabs só alterna `hidden`).
    expect(getByTestId('ed-code')).toBeTruthy()
    expect(getByTestId('prev')).toBeTruthy()
    expect(getByTestId('console-probe')).toBeTruthy()
  })

  it('gaveta de Arquivos: abre, e escolher um arquivo fecha + foca o editor', () => {
    const { getByRole, queryByRole, getByText } = render(
      <NarrowPanels
        editorPanes={oneEditor}
        filesDrawer={(close) => (
          <button type="button" onClick={() => close()}>
            arquivo.js
          </button>
        )}
      />,
    )
    // Sem gaveta aberta de início.
    expect(queryByRole('dialog')).toBeNull()
    act(() => {
      fireEvent.click(getByRole('button', { name: 'Arquivos' }))
    })
    expect(getByRole('dialog')).toBeTruthy()
    // Escolher o arquivo invoca `close()` → fecha a gaveta.
    act(() => {
      fireEvent.click(getByText('arquivo.js'))
    })
    expect(queryByRole('dialog')).toBeNull()
  })

  it('sem filesDrawer, não há botão "Arquivos"', () => {
    const { queryByRole } = render(<NarrowPanels editorPanes={oneEditor} />)
    expect(queryByRole('button', { name: 'Arquivos' })).toBeNull()
  })
})
